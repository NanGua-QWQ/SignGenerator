/**
 * 浏览器侧的小工具：复制到剪贴板、下载文本 / Blob。
 *
 * 与文件系统无关 —— 目录写入在 `output.ts` 里。
 */

/** 复制文本；返回是否成功（剪贴板 API 在非安全上下文会不可用） */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** 触发一次浏览器下载 */
export function downloadBlob(blob: Blob, fileName: string): void {
  if (typeof document === 'undefined') return
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // 给浏览器留出读取时间再释放
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 下载一段文本 */
export function downloadText(
  text: string,
  fileName: string,
  type = 'text/plain;charset=utf-8',
): void {
  downloadBlob(new Blob([text], { type }), fileName)
}
