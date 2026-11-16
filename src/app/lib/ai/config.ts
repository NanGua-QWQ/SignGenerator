/**
 * AI 接入的共享常量（前端 / 服务端路由都用）。
 *
 * 模型名只在这里出现一次：DeepSeek 目前支持图片输入的是 `deepseek-flash`，
 * 换模型（或换 base_url）只改这个文件。
 */

/** 默认模型：唯一支持图片输入的一档 */
export const DEFAULT_AI_MODEL = 'deepseek-flash'

/** 可选模型（前端下拉展示；留空时用 `DEFAULT_AI_MODEL`） */
export const AI_MODEL_OPTIONS: { value: string, label: string, hint: string }[] = [
  {
    value: 'deepseek-flash',
    label: 'deepseek-flash',
    hint: '支持图片输入（视觉）',
  },
]

/** 建议的请求超时（毫秒）—— 视觉调用普遍 10~30s，给足余量 */
export const AI_REQUEST_TIMEOUT_MS = 120_000

/** 前端代理路由 */
export const AI_PLAN_ROUTE = '/api/ai/plan'

/** 发给模型的图片最长边（像素）；超过就等比缩小，控制体积与 token */
export const AI_IMAGE_MAX_EDGE = 1280

/** 压缩后仍超过这个体积（字节）就再降一档质量 */
export const AI_IMAGE_MAX_BYTES = 1_400_000

/** localStorage：API Key（**不进**工程 JSON，避免导出时泄露） */
export const AI_KEY_STORAGE_KEY = 'sign-generator.ai.key.v1'

/** localStorage：上次用的模型 */
export const AI_MODEL_STORAGE_KEY = 'sign-generator.ai.model.v1'
