/**
 * 跨页面（跨标签页 / 跨窗口）复制版面元素。
 *
 * 以前的「复制元素」只存在 jotai 内存里，换个标签页就没了。这里改走两条通道：
 *
 * 1. **系统剪贴板**（`text/plain` 里放一段带 `kind` 标记的 JSON）——
 *    Ctrl+C 写入、Ctrl+V 从 `paste` 事件里读回来，跨标签页、跨浏览器窗口都行，
 *    而且粘贴走的是原生事件，不需要 `clipboard.readText()` 的权限；
 * 2. **localStorage 兜底**——剪贴板 API 不可用（非 https / 用户拒绝授权）时，
 *    仍然能在同一浏览器的多个标签页之间传递。
 *
 * 两条通道都用同一个信封格式，解析时先认 `kind`，再交给
 * `sanitizeClipboardElements()` 消毒 —— 剪贴板里的东西一律当**不可信输入**。
 */

import {
  sanitizeClipboardElements,
} from './project'

import type {
  LayoutElement,
} from './layout-model'

/** 信封标记：只有带这个标记的文本才会被当成「版面元素」 */
export const ELEMENT_CLIPBOARD_KIND = 'yunbeiuc-sign-element'

/** 信封版本（以后元素结构变了可以按版本兼容） */
export const ELEMENT_CLIPBOARD_VERSION = 1

/** 兜底通道的 localStorage 键 */
export const ELEMENT_CLIPBOARD_STORAGE_KEY = 'sign-generator.clipboard.element.v1'

interface ElementEnvelope {
  kind: string
  version: number
  elements: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** 元素 → 剪贴板文本 */
export function serializeElements(elements: readonly LayoutElement[]): string {
  const envelope: ElementEnvelope = {
    kind: ELEMENT_CLIPBOARD_KIND,
    version: ELEMENT_CLIPBOARD_VERSION,
    elements,
  }
  return JSON.stringify(envelope)
}

/**
 * 剪贴板文本 → 元素。
 *
 * 不是我们的信封（用户复制的是普通文字）时返回 null，调用方据此走别的分支。
 */
export function parseElementsPayload(text: string): LayoutElement[] | null {
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!trimmed.startsWith('{') || trimmed.length > 512 * 1024) return null

  let parsed: unknown = null
  try {
    parsed = JSON.parse(trimmed)
  }
  catch {
    return null
  }
  if (!isRecord(parsed) || parsed.kind !== ELEMENT_CLIPBOARD_KIND) return null

  const elements = sanitizeClipboardElements(parsed.elements)
  return elements.length > 0 ? elements : null
}

/** 写系统剪贴板（失败返回 false，调用方自己决定要不要提示） */
export async function writeClipboardText(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  }
  catch {
    return false
  }
}

/** 兜底通道：写 localStorage（跨标签页共享） */
export function saveElementsToStorage(text: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ELEMENT_CLIPBOARD_STORAGE_KEY, text)
  }
  catch {
    // 隐私模式 / 配额不足：只影响兜底通道
  }
}

/** 兜底通道：从 localStorage 读回元素 */
export function readElementsFromStorage(): LayoutElement[] | null {
  if (typeof window === 'undefined') return null
  try {
    const text = window.localStorage.getItem(ELEMENT_CLIPBOARD_STORAGE_KEY)
    return text === null ? null : parseElementsPayload(text)
  }
  catch {
    return null
  }
}
