/**
 * 导入图片资源。
 *
 * 用户导入的 PNG 会：
 * 1. 读成 data URL 存进工程，供画布显示**真实位图**；
 * 2. 生成时按 `texturePath` 写进模组的 `assets/<ns>/textures/...`。
 */

import {
  SIGN_TEXTURE_PREFIX,
} from './sprites'
import {
  TEXTURE_GROUPS, TEXTURE_PUBLIC_DIR,
} from './texture-catalog'

/**
 * 内置贴图文件名集合（来自图案库目录）。
 *
 * 用来判断某个 `logo(...)` 路径是不是「模组自带、本站有 PNG」的贴图，
 * 是的话就能直接 `<img src="/textures/sign/x.png">` 显示真实图片。
 */
const BUILTIN_TEXTURE_FILES: ReadonlySet<string> = new Set(
  TEXTURE_GROUPS.flatMap(group => group.items.map(item => item.file)),
)

/**
 * 内置贴图路径 → 站点内可直接 `<img>` 的静态 URL。
 *
 * - `yunbeiuc:textures/block/sign/sign_stop.png` → `/textures/sign/sign_stop.png`
 * - 含 `{占位符}` 的路径、以及本站没有的贴图 → `null`（由调用方画占位图）
 */
export function texturePreviewUrl(texturePath: string): string | null {
  if (!texturePath || texturePath.includes('{')) return null
  const file = texturePath.split('/').pop() ?? ''
  if (!BUILTIN_TEXTURE_FILES.has(file)) return null
  return `${TEXTURE_PUBLIC_DIR}/${file}`
}

/** 内置贴图路径 → 文件名（用于标题/占位文字），非内置返回 null */
export function builtinTextureFile(texturePath: string): string | null {
  if (!texturePath || texturePath.includes('{')) return null
  const file = texturePath.split('/').pop() ?? ''
  return BUILTIN_TEXTURE_FILES.has(file) ? file : null
}

export interface ImportedImage {
  /** data:image/png;base64,… */
  dataUrl: string
  width: number
  height: number
}

/** 读取本地图片文件，返回 data URL 与像素尺寸 */
export function readImageFile(file: File): Promise<ImportedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`读取 ${file.name} 失败`))
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '')
      if (!dataUrl.startsWith('data:')) {
        reject(new Error(`${file.name} 不是有效的图片`))
        return
      }
      const image = new Image()
      image.onload = () => resolve({
        dataUrl,
        width: image.naturalWidth || 16,
        height: image.naturalHeight || 16,
      })
      image.onerror = () => reject(new Error(`${file.name} 无法解析为图片`))
      image.src = dataUrl
    }
    reader.readAsDataURL(file)
  })
}

/** 文件名 → 安全的资源名（只留字母数字下划线连字符） */
export function safeResourceName(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '')
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return cleaned || 'imported'
}

/** 默认贴图路径：`yunbeiuc:textures/block/sign/<name>.png` */
export function defaultTexturePath(filename: string): string {
  return `${SIGN_TEXTURE_PREFIX}${safeResourceName(filename)}.png`
}

/**
 * 贴图路径 → 模组工程里的资源文件路径。
 *
 * `yunbeiuc:textures/block/sign/x.png`
 *   → `src/main/resources/assets/yunbeiuc/textures/block/sign/x.png`
 */
export function textureResourcePath(texturePath: string): string | null {
  const colon = texturePath.indexOf(':')
  if (colon <= 0) return null
  const namespace = texturePath.slice(0, colon)
  const rest = texturePath.slice(colon + 1).replace(/^\/+/, '')
  if (!rest) return null
  return `src/main/resources/assets/${namespace}/${rest}`
}

/** `data:image/png;base64,XXXX` → `XXXX` */
export function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',')
  return comma >= 0 ? dataUrl.slice(comma + 1) : ''
}

/** base64 → 原始字节（ZIP / 落盘用） */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
