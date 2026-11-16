/**
 * 前端调 AI 代理路由的薄封装。
 *
 * 只做三件事：发请求、把各种失败翻译成人话、对返回的 spec **再做一次**
 * 本地校验（服务端已经校验过，但前端不该假设对面一定是最新版本）。
 */

import {
  AI_PLAN_ROUTE,
} from './config'
import {
  parseAiSpec,
} from './spec'

import type {
  AiSpec,
} from './spec'

export interface AiUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

export interface AiPlanSuccess {
  ok: true
  model: string
  spec: AiSpec
  /** 服务端 + 本地两次校验合并后的问题清单 */
  warnings: string[]
  raw: string
  usage: AiUsage | null
  /** 用了几个来回（2 = 触发过一次自动修复） */
  attempts: number
}

export interface AiFailure {
  ok: false
  error: string
  detail?: string
}

export type AiPlanResult = AiPlanSuccess | AiFailure

export interface AiPlanRequest {
  apiKey: string
  model: string
  /** 内联 data URL */
  image: string
  hint: string
  /** 当前画布宽高（bit），用来让模型知道目标比例 */
  width: number
  height: number
}

interface RawResponse {
  ok: boolean
  status: number
  data: unknown
  text: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

async function postJson(body: unknown): Promise<RawResponse> {
  const response = await fetch(AI_PLAN_ROUTE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  let data: unknown = null
  try {
    data = JSON.parse(text)
  }
  catch {
    data = null
  }
  return {
    ok: response.ok,
    status: response.status,
    data,
    text,
  }
}

/** 统一提取失败原因 */
function failureOf(raw: RawResponse, fallback: string): AiFailure {
  const data = isRecord(raw.data) ? raw.data : null
  const error = data && typeof data.error === 'string' ? data.error : ''
  const detail = data && typeof data.detail === 'string' ? data.detail : ''
  if (error !== '') {
    return {
      ok: false,
      error,
      detail: detail || undefined,
    }
  }
  if (raw.status === 404) {
    return {
      ok: false,
      error: '本地 AI 代理路由不存在（/api/ai/plan），请重启开发服务器',
    }
  }
  if (raw.status === 413) {
    return {
      ok: false,
      error: '图片太大被服务端拒绝，请换一张小一点的图',
    }
  }
  const snippet = raw.text.trim().slice(0, 200)
  return {
    ok: false,
    error: snippet === '' ? fallback : `${fallback}（HTTP ${raw.status}）`,
    detail: snippet || undefined,
  }
}

function networkFailure(cause: unknown): AiFailure {
  const message = cause instanceof Error ? cause.message : String(cause)
  return {
    ok: false,
    error: '无法连接本地服务（Next 开发服务器是否在运行？）',
    detail: message,
  }
}

/** 分析图片 → spec */
export async function requestAiPlan(request: AiPlanRequest): Promise<AiPlanResult> {
  let raw: RawResponse
  try {
    raw = await postJson({
      action: 'plan',
      apiKey: request.apiKey,
      model: request.model,
      image: request.image,
      hint: request.hint,
      width: request.width,
      height: request.height,
    })
  }
  catch (cause) {
    return networkFailure(cause)
  }

  if (!raw.ok) return failureOf(raw, 'AI 配置失败')

  const data = isRecord(raw.data) ? raw.data : null
  if (!data || data.ok !== true) {
    return failureOf(raw, 'AI 配置失败')
  }

  const parsed = parseAiSpec(data.spec)
  if (parsed.spec.items.length === 0) {
    return {
      ok: false,
      error: 'AI 没有给出可用的版面元素',
      detail: typeof data.raw === 'string' ? data.raw.slice(0, 400) : undefined,
    }
  }

  const serverWarnings = Array.isArray(data.warnings)
    ? data.warnings.filter((item): item is string => typeof item === 'string')
    : []
  const warnings = [...new Set([...serverWarnings, ...parsed.warnings])]

  return {
    ok: true,
    model: typeof data.model === 'string' ? data.model : request.model,
    spec: parsed.spec,
    warnings,
    raw: typeof data.raw === 'string' ? data.raw : '',
    usage: isRecord(data.usage) ? data.usage as AiUsage : null,
    attempts: typeof data.attempts === 'number' ? data.attempts : 1,
  }
}

/** 测试 Key 是否可用（不含图片，消耗极小） */
export async function probeAiKey(
  apiKey: string,
  model: string,
): Promise<{ ok: boolean, message: string }> {
  let raw: RawResponse
  try {
    raw = await postJson({
      action: 'probe',
      apiKey,
      model,
    })
  }
  catch (cause) {
    return {
      ok: false,
      message: networkFailure(cause).error,
    }
  }

  if (!raw.ok) {
    const failure = failureOf(raw, '连接失败')
    return {
      ok: false,
      message: failure.detail ? `${failure.error}（${failure.detail}）` : failure.error,
    }
  }

  const data = isRecord(raw.data) ? raw.data : null
  if (data && data.ok === true && typeof data.message === 'string') {
    return {
      ok: true,
      message: data.message,
    }
  }
  return {
    ok: false,
    message: '连接失败：返回内容异常',
  }
}
