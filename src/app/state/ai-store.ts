/**
 * AI 配置窗口的状态。
 *
 * 划分原则：
 * - **跟工程走的东西**（元素、字段、参考图）一律写进 `LayoutProject`；
 * - **不该进工程的东西**（API Key、模型名、窗口开关、一次性的分析结果）
 *   留在这里 —— 工程会被导出成 `.layout.json` 发给别人，
 *   把 Key 塞进去等于直接公开。
 */

import {
  atom,
} from 'jotai'

import {
  specToProject,
} from '@/lib/ai/apply'
import {
  AI_KEY_STORAGE_KEY, AI_MODEL_STORAGE_KEY, DEFAULT_AI_MODEL,
} from '@/lib/ai/config'
import {
  createReference, sanitizeProject,
} from '@/lib/studio/project'

import {
  layoutProjectAtom, revisionAtom, selectedElementIdAtom, studioTabAtom,
} from './studio-store'

import type {
  AiPlanSuccess,
} from '@/lib/ai/client'
import type {
  AiImagePayload,
} from '@/lib/ai/image'
import type {
  AiSpec,
} from '@/lib/ai/spec'
import type {
  LayoutProject,
} from '@/lib/studio/layout-model'

export type AiRunStatus = 'idle' | 'running' | 'done' | 'error'

export interface AiRunState {
  status: AiRunStatus
  /** 分析成功的结果（含 spec / warnings / raw / usage） */
  result: AiPlanSuccess | null
  error: string | null
  detail: string | null
  /** 请求开始时间（用来显示耗时） */
  startedAt: number | null
  finishedAt: number | null
}

const INITIAL_RUN: AiRunState = {
  status: 'idle',
  result: null,
  error: null,
  detail: null,
  startedAt: null,
  finishedAt: null,
}

/** AI 专属窗口是否打开 */
export const aiWindowOpenAtom = atom(false)

/** DeepSeek API Key（只在内存 + localStorage，绝不进工程） */
export const aiApiKeyAtom = atom('')

/** 是否记住 Key */
export const aiRememberKeyAtom = atom(true)

/** 模型名 */
export const aiModelAtom = atom(DEFAULT_AI_MODEL)

/** 用户补充要求（「做成竖排」「底色改成蓝色」之类） */
export const aiHintAtom = atom('')

/** 当前待分析的图片（已压缩） */
export const aiImageAtom = atom<AiImagePayload | null>(null)

/** 应用版面时是否顺便把这张图设成描图底图 */
export const aiUseAsReferenceAtom = atom(true)

/** 一次分析的运行状态 */
export const aiRunAtom = atom<AiRunState>(INITIAL_RUN)

/** 上次应用后的提示语（显示一次即可） */
export const aiNoticeAtom = atom<string | null>(null)

export interface AiProbeState {
  status: 'idle' | 'running' | 'ok' | 'fail'
  message: string
}

export const aiProbeAtom = atom<AiProbeState>({
  status: 'idle',
  message: '',
})

/** 清掉上一次分析结果（换图 / 改说明后调用） */
export const resetAiRunAtom = atom(null, (_get, set) => {
  set(aiRunAtom, INITIAL_RUN)
})

/**
 * 应用 AI 给出的版面。
 *
 * 关键：写 `layoutProjectAtom`（可写 atom，会记一步历史），
 * 而不是 `setLayoutProjectAtom`（内部走 `replaceProjectAtom`，会**清空撤销栈**）。
 * 这样 AI 配错了按一次 Ctrl+Z 就能整体退回。
 */
export const applyAiSpecAtom = atom(
  null,
  (get, set, params: { spec: AiSpec, reference?: AiImagePayload | null }) => {
    const current = get(layoutProjectAtom)
    const { project, stats } = specToProject(params.spec, current)

    let next: LayoutProject = project
    if (params.reference?.dataUrl) {
      next = {
        ...next,
        reference: createReference({
          dataUrl: params.reference.dataUrl,
          name: params.reference.name,
          fit: 'stretch',
          opacity: 0.4,
          visible: true,
        }),
      }
    }

    const sanitized = sanitizeProject(next) ?? next
    set(layoutProjectAtom, sanitized)
    set(selectedElementIdAtom, sanitized.elements[0]?.id ?? null)
    set(revisionAtom, value => value + 1)
    set(studioTabAtom, 'element')
    set(aiNoticeAtom, `已应用 AI 版面：${stats.width}×${stats.height} bit · `
      + `${stats.variants} 变体 · ${stats.elements} 元素 · ${stats.fields} 字段（Ctrl+Z 可撤回）`)
    return sanitized
  },
)

// ==================== Key 的本地存取 ====================

/** 读取上次保存的 Key（没有就返回空串） */
export function loadStoredAiKey(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(AI_KEY_STORAGE_KEY) ?? ''
  }
  catch {
    return ''
  }
}

/** 保存 / 清除 Key */
export function storeAiKey(key: string, remember: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (remember && key.trim() !== '') {
      window.localStorage.setItem(AI_KEY_STORAGE_KEY, key.trim())
    }
    else {
      window.localStorage.removeItem(AI_KEY_STORAGE_KEY)
    }
  }
  catch {
    // 隐私模式 / 配额不足：Key 仍在内存里，只是下次要重填
  }
}

/** 读取上次用的模型 */
export function loadStoredAiModel(): string {
  if (typeof window === 'undefined') return DEFAULT_AI_MODEL
  try {
    return window.localStorage.getItem(AI_MODEL_STORAGE_KEY) || DEFAULT_AI_MODEL
  }
  catch {
    return DEFAULT_AI_MODEL
  }
}

/** 记住模型选择 */
export function storeAiModel(model: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(AI_MODEL_STORAGE_KEY, model)
  }
  catch {
    // 忽略
  }
}
