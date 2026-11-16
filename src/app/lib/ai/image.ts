/**
 * 发给模型前的图片预处理。
 *
 * 为什么必须压：`assets.ts::readImageFile` 是原样 `FileReader`，手机照片转成
 * base64 动辄好几 MB —— 既顶 DeepSeek 的 48 MiB 请求体，也会把 localStorage
 * 那 5 MB 配额撑爆（这张图同时要当参考底图存进工程）。
 *
 * 策略：长边缩到 1280 以内；PNG 优先保真（路牌是大色块 + 硬边文字，JPEG 会把
 * 字边缘糊掉），超体积再降级成 JPEG。
 */

import {
  AI_IMAGE_MAX_BYTES, AI_IMAGE_MAX_EDGE,
} from './config'

export interface AiImagePayload {
  /** `data:image/...;base64,...` */
  dataUrl: string
  width: number
  height: number
  /** 解码后的大致字节数（用于界面提示） */
  bytes: number
  name: string
}

interface LoadedImage {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

async function loadImage(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      }
    }
    catch {
      // 某些格式 createImageBitmap 不吃，退回 <img>
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error(`${file.name} 无法解析为图片`))
      element.src = url
    })
    return {
      source: image,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      release: () => URL.revokeObjectURL(url),
    }
  }
  catch (cause) {
    URL.revokeObjectURL(url)
    throw cause
  }
}

/** data URL 的字符数 → 解码后字节数 */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return 0
  return Math.round((dataUrl.length - comma - 1) * 0.75)
}

/**
 * 读取 + 缩放 + 编码。返回值可直接塞进请求体，也可直接当参考底图。
 *
 * @throws 图片无法解析时抛错（调用方负责展示）
 */
export async function prepareAiImage(file: File): Promise<AiImagePayload> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`${file.name} 不是图片文件`)
  }

  const loaded = await loadImage(file)
  try {
    const edge = Math.max(loaded.width, loaded.height)
    const scale = edge > AI_IMAGE_MAX_EDGE ? AI_IMAGE_MAX_EDGE / edge : 1
    const width = Math.max(1, Math.round(loaded.width * scale))
    const height = Math.max(1, Math.round(loaded.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('浏览器不支持 canvas，无法压缩图片')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(loaded.source, 0, 0, width, height)

    // PNG 优先（大色块 + 硬边文字不失真）；超体积再降级
    let dataUrl = file.type === 'image/png'
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL('image/jpeg', 0.9)

    if (dataUrlBytes(dataUrl) > AI_IMAGE_MAX_BYTES) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.86)
    }
    if (dataUrlBytes(dataUrl) > AI_IMAGE_MAX_BYTES * 2) {
      const smaller = document.createElement('canvas')
      const halfW = Math.max(1, Math.round(width * 0.7))
      const halfH = Math.max(1, Math.round(height * 0.7))
      smaller.width = halfW
      smaller.height = halfH
      const smallerContext = smaller.getContext('2d')
      if (smallerContext) {
        smallerContext.drawImage(canvas, 0, 0, halfW, halfH)
        dataUrl = smaller.toDataURL('image/jpeg', 0.7)
      }
    }

    return {
      dataUrl,
      width,
      height,
      bytes: dataUrlBytes(dataUrl),
      name: file.name.replace(/\.[^.]+$/, '') || '参考图',
    }
  }
  finally {
    loaded.release()
  }
}

/**
 * 从剪贴板事件里取第一张图片。
 *
 * ⚠️ `DataTransferItemList` 在老一点的浏览器 / 某些内核里**不是可迭代对象**
 * （`for...of` 会抛 TypeError，粘贴就彻底没反应），所以一律按下标遍历；
 * 再把 `clipboardData.files` 作为兜底（从资源管理器直接复制文件时走这条）。
 */
export function imageFromClipboard(event: ClipboardEvent): File | null {
  const data = event.clipboardData
  if (!data) return null

  const items = data.items
  if (items) {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]
      if (!item || item.kind !== 'file') continue
      const file = item.getAsFile()
      if (file && file.type.startsWith('image/')) return file
    }
  }

  const files = data.files
  if (files) {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      if (file && file.type.startsWith('image/')) return file
    }
  }
  return null
}

/** 剪贴板里有没有纯文本（用来区分「粘的是文字」和「什么都没粘」） */
export function clipboardHasText(event: ClipboardEvent): boolean {
  const data = event.clipboardData
  if (!data) return false
  return data.types.includes('text/plain') || data.types.includes('text/html')
}
