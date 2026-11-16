/**
 * AI 版面配置的服务端代理。
 *
 * 为什么不让浏览器直连 DeepSeek：
 * 1. 浏览器直连会把 Key 暴露在 Network 面板里，还可能有 CORS 限制；
 * 2. 提示词（含 600+ 贴图白名单）不该打进前端 bundle；
 * 3. 校验 / 重试这类逻辑放在服务端，前端只负责「发图 - 收 spec」。
 *
 * Key 的来源（优先级从高到低）：
 * 1. 请求体里的 `apiKey`（用户在界面上填的，只存在他自己的 localStorage）；
 * 2. 环境变量 `DEEPSEEK_API_KEY`（自建部署时免填）。
 *
 * ⚠️ 这里**绝不**打印 / 回显 Key，也不把它写进任何日志。
 */

import {
  DEFAULT_AI_MODEL,
  AI_REQUEST_TIMEOUT_MS,
} from '@/lib/ai/config'
import {
  buildRepairPrompt, buildSystemPrompt, buildUserPrompt,
} from '@/lib/ai/prompt'
import {
  parseAiSpec,
} from '@/lib/ai/spec'

import type {
  AiSpec,
} from '@/lib/ai/spec'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

const CHAT_ENDPOINT = 'https://api.deepseek.com/chat/completions'

/** 图片必须是内联 data URL（png / jpeg / webp / gif） */
const IMAGE_DATA_URL_RE = /^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i

/** 单张图片的 data URL 字符数上限（请求体总上限 48 MiB，留足余量） */
const MAX_IMAGE_CHARS = 40 * 1024 * 1024

/** 返回给前端的原始文本上限（只为调试，别把整包 base64 带回去） */
const MAX_RAW_CHARS = 20_000

interface ChatTextBlock {
  type: 'text'
  text: string
}

interface ChatImageBlock {
  type: 'image_url'
  image_url: { url: string, detail?: 'low' | 'high' | 'auto' }
}

type ChatBlock = ChatTextBlock | ChatImageBlock

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ChatBlock[]
}

interface ChatUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

interface ChatResult {
  content: string
  usage: ChatUsage | null
}

interface PlanBody {
  action?: unknown
  apiKey?: unknown
  model?: unknown
  image?: unknown
  hint?: unknown
  width?: unknown
  height?: unknown
}

function errorResponse(status: number, message: string, detail?: string): Response {
  return Response.json({
    ok: false,
    error: message,
    detail,
  }, {
    status,
  })
}

/** Key 只从请求体 / 环境变量取，任何情况下都不回显 */
function resolveApiKey(body: PlanBody): string {
  const fromBody = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  if (fromBody !== '') return fromBody
  const fromEnv = typeof process.env.DEEPSEEK_API_KEY === 'string'
    ? process.env.DEEPSEEK_API_KEY.trim()
    : ''
  return fromEnv
}

function number(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** HTTP 状态码 → 人话 */
function describeStatus(status: number, detail: string): string {
  if (status === 400) {
    if (isJsonFormatRejection(detail)) {
      return '模型要求 prompt 里出现 json 字样才能用 JSON 模式'
        + '（已自动重试一次；若仍失败请把这条错误发给开发者）'
    }
    return `请求被模型拒绝：${detail || '参数不合法'}`
  }
  if (status === 401) return 'API Key 无效或已过期，请重新填写'
  if (status === 402) return '账户余额不足，请到 DeepSeek 开放平台充值'
  if (status === 403) return '当前 Key 没有该模型的权限'
  if (status === 404) return '模型名不存在（检查模型选择）'
  if (status === 422) return '模型无法处理这张图片（格式或内容不合规）'
  if (status === 429) return '请求过于频繁（限流），等几秒再试'
  if (status >= 500) return 'DeepSeek 服务暂时不可用，稍后再试'
  return `调用失败（HTTP ${status}）${detail ? `：${detail}` : ''}`
}

interface ChatOptions {
  /**
   * 是否带 `response_format: { type: 'json_object' }`。
   *
   * ⚠️ 只有「要模型吐 JSON」的请求才能开：DeepSeek 会校验 prompt 里是否出现
   * `json` 字样，不满足时直接 400 拒绝（`Prompt must contain the word 'json'`）。
   * 探活请求的 prompt 只有一句 `ping`，所以它必须走普通对话模式。
   */
  jsonMode?: boolean
}

/** 是否是「prompt 里没有 json 字样」这类 response_format 拒绝 */
function isJsonFormatRejection(detail: string): boolean {
  const text = detail.toLowerCase()
  return text.includes("word 'json'")
    || text.includes('word "json"')
    || text.includes('response_format')
}

/** 调一次 chat/completions，返回正文文本 */
async function postChat(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<ChatResult> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.2,
    max_tokens: 4096,
    stream: false,
  }
  if (options.jsonMode === true) {
    body.response_format = {
      type: 'json_object',
    }
  }

  const response = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
  })

  const text = await response.text()
  let payload: unknown = null
  try {
    payload = JSON.parse(text)
  }
  catch {
    payload = null
  }

  if (!response.ok) {
    const detail = extractErrorMessage(payload) || text.slice(0, 300)
    // 兜底：模型服务不接受 json_object（prompt 里没 json 字样等）时，
    // 去掉 response_format 重试一次 —— 解析仍然靠 extractJson 从正文里抠。
    if (options.jsonMode === true && response.status === 400 && isJsonFormatRejection(detail)) {
      return postChat(apiKey, model, messages, {
        jsonMode: false,
      })
    }
    throw new AiRequestError(describeStatus(response.status, detail), detail)
  }

  const root = isRecord(payload) ? payload : {}
  const choices = Array.isArray(root.choices) ? root.choices : []
  const first = choices[0]
  const message = isRecord(first) && isRecord(first.message) ? first.message : null
  const content = message && typeof message.content === 'string' ? message.content : ''

  return {
    content,
    usage: isRecord(root.usage) ? root.usage as unknown as ChatUsage : null,
  }
}

/** 业务错误：带上给用户看的文案 */
class AiRequestError extends Error {
  readonly detail: string

  constructor(message: string, detail: string) {
    super(message)
    this.name = 'AiRequestError'
    this.detail = detail
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function extractErrorMessage(payload: unknown): string {
  if (!isRecord(payload)) return ''
  const error = isRecord(payload.error) ? payload.error : null
  if (error && typeof error.message === 'string') return error.message
  if (typeof payload.message === 'string') return payload.message
  return ''
}

/** 从模型回复里抠出 JSON 对象（容忍 ```json 围栏与前后废话） */
function extractJson(content: string): { value: unknown, error: string } {
  const trimmed = content.trim()
  if (trimmed === '') return {
    value: null,
    error: '模型返回了空内容',
  }

  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed)
  const body = fenced ? fenced[1].trim() : trimmed
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) {
    return {
      value: null,
      error: '模型没有返回 JSON 对象',
    }
  }

  try {
    return {
      value: JSON.parse(body.slice(start, end + 1)),
      error: '',
    }
  }
  catch (cause) {
    return {
      value: null,
      error: `JSON 解析失败：${(cause as Error).message}`,
    }
  }
}

interface PlanOutcome {
  spec: AiSpec
  warnings: string[]
  raw: string
  usage: ChatUsage | null
  attempts: number
}

/**
 * 分析图片 → spec。
 *
 * 第一次不合格（不是 JSON，或一个合法元素都没有）时，把问题原样回给模型
 * 让它修一次 —— 比直接报错给用户的体验好得多，也比在本地写一堆兜底便宜。
 */
async function planFromImage(params: {
  apiKey: string
  model: string
  image: string
  hint: string
  width: number
  height: number
}): Promise<PlanOutcome> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: buildSystemPrompt(),
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: buildUserPrompt({
            hint: params.hint,
            width: params.width,
            height: params.height,
          }),
        },
        {
          type: 'image_url',
          image_url: {
            url: params.image,
            detail: 'high',
          },
        },
      ],
    },
  ]

  let raw = ''
  let usage: ChatUsage | null = null
  let problems: string[] = []

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const chat = await postChat(params.apiKey, params.model, messages, {
      jsonMode: true,
    })
    raw = chat.content
    usage = chat.usage ?? usage

    const json = extractJson(raw)
    if (json.error) {
      problems = [json.error]
    }
    else {
      const parsed = parseAiSpec(json.value)
      if (parsed.spec.items.length > 0) {
        return {
          spec: parsed.spec,
          warnings: parsed.warnings,
          raw: raw.slice(0, MAX_RAW_CHARS),
          usage,
          attempts: attempt,
        }
      }
      problems = [
        'items 为空：至少要给出一个 text 或 texture 元素',
        ...parsed.warnings,
      ]
    }

    if (attempt === 2) break
    // 修一次：把模型自己的回答当成上下文，再追一条问题清单
    messages.push({
      role: 'assistant',
      content: raw,
    })
    messages.push({
      role: 'user',
      content: buildRepairPrompt(problems),
    })
  }

  throw new AiRequestError(
    '模型没有给出可用的版面（两次尝试都不合格）',
    problems.join('；') || '未知原因',
  )
}

/** 测试 Key：发一个极小的对话请求，验证 Key / 余额 / 模型是否可用 */
async function probe(params: { apiKey: string, model: string }): Promise<Response> {
  try {
    // 刻意**不开** jsonMode：prompt 只有一句 ping，带上 response_format 会被
    // 直接 400 拒绝（Prompt must contain the word 'json'），探活就误报了。
    const chat = await postChat(params.apiKey, params.model, [
      {
        role: 'user',
        content: 'ping',
      },
    ])
    return Response.json({
      ok: true,
      model: params.model,
      message: `连接成功，模型 ${params.model} 可用`,
      length: chat.content.length,
    })
  }
  catch (cause) {
    if (cause instanceof AiRequestError) {
      return errorResponse(400, cause.message, cause.detail)
    }
    return errorResponse(500, describeThrown(cause))
  }
}

function describeThrown(cause: unknown): string {
  const error = cause as Error
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
    return `请求超时（超过 ${Math.round(AI_REQUEST_TIMEOUT_MS / 1000)} 秒）`
  }
  const message = typeof error?.message === 'string' ? error.message : ''
  if (message.includes('fetch failed') || message.includes('ENOTFOUND')) {
    return '无法连接 DeepSeek（检查本机网络 / 代理）'
  }
  return `调用失败：${message || '未知错误'}`
}

export async function POST(request: Request): Promise<Response> {
  let body: PlanBody
  try {
    body = await request.json() as PlanBody
  }
  catch {
    return errorResponse(400, '请求体不是合法 JSON')
  }

  const model = typeof body.model === 'string' && body.model.trim() !== ''
    ? body.model.trim()
    : DEFAULT_AI_MODEL

  // 图片校验放在 Key 校验前面：先确认「素材齐了」再谈凭证，报错更贴切
  const image = typeof body.image === 'string' ? body.image.trim() : ''
  if (body.action !== 'probe') {
    if (image === '') return errorResponse(400, '请先上传一张标志牌照片或截图')
    if (image.length > MAX_IMAGE_CHARS) {
      return errorResponse(413, '图片太大了（限制约 30 MB），请压缩后再试')
    }
    if (!IMAGE_DATA_URL_RE.test(image)) {
      return errorResponse(400, '图片格式不支持，请使用 PNG / JPEG / WebP / GIF')
    }
  }

  const apiKey = resolveApiKey(body)
  if (apiKey === '') {
    return errorResponse(
      400,
      '还没有填写 DeepSeek API Key（也没有配置服务端 DEEPSEEK_API_KEY）',
    )
  }

  if (body.action === 'probe') {
    return probe({
      apiKey,
      model,
    })
  }

  try {
    const outcome = await planFromImage({
      apiKey,
      model,
      image,
      hint: typeof body.hint === 'string' ? body.hint.slice(0, 500) : '',
      width: number(body.width, 32),
      height: number(body.height, 20),
    })
    return Response.json({
      ok: true,
      model,
      spec: outcome.spec,
      warnings: outcome.warnings,
      raw: outcome.raw,
      usage: outcome.usage,
      attempts: outcome.attempts,
    })
  }
  catch (cause) {
    if (cause instanceof AiRequestError) {
      return errorResponse(422, cause.message, cause.detail)
    }
    return errorResponse(500, describeThrown(cause))
  }
}
