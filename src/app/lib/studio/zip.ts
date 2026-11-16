/**
 * 模型代码工坊 —— 零依赖 ZIP 打包器（仅 store 存储方式，不做 deflate 压缩）。
 *
 * 输出为标准 PKZIP 结构，可被任意解压工具识别：
 * - 本地文件头（0x04034b50）+ 文件数据；
 * - 中央目录（0x02014b50）；
 * - 中央目录结束记录 EOCD（0x06054b50）。
 *
 * 细节：
 * - 文件名统一写入 UTF-8 字节，并置通用标志位 bit 11（0x0800）声明 UTF-8 编码；
 * - CRC32 使用 256 项查表实现（多项式 0xEDB88320），与 PKZIP 一致；
 * - 不依赖 jszip / pako 等第三方库，也不需要 Node 的 Buffer。
 *
 * 限制：不实现 Zip64，条目数需小于 65535、单个文件与总大小需小于 4 GiB；
 * 本工坊导出的产物数量与体积远低于该上限。
 */

/** 本地文件头固定长度（不含文件名与扩展区） */
const LOCAL_HEADER_SIZE = 30
/** 中央目录条目固定长度（不含文件名、扩展区与注释） */
const CENTRAL_HEADER_SIZE = 46
/** EOCD 固定长度（不含注释） */
const EOCD_SIZE = 22
/** 通用标志位：文件名与注释为 UTF-8（bit 11） */
const FLAG_UTF8 = 0x0800
/** 压缩方法：0 = store（不压缩） */
const METHOD_STORE = 0
/** 解压所需版本：2.0 */
const VERSION_NEEDED = 20

/** ZIP 内部条目状态 */
interface ZipEntry {
  nameBytes: Uint8Array
  dataBytes: Uint8Array
  crc: number
  offset: number
}

/**
 * 把若干文件打包成一个 store 方式的 ZIP Blob。
 * @param files 文件列表；`path` 支持 `/` 与 `\` 分隔（内部统一为 `/`）；
 *   `content` 传字符串时以 UTF-8 写入，传 `Uint8Array` 时按原始字节写入（二进制资源）。
 */
export function createZip(files: { path: string; content: string | Uint8Array }[]): Blob {
  const encoder = new TextEncoder()
  const stamp = toDosDateTime(new Date())
  const entries: ZipEntry[] = []

  for (const file of files) {
    const nameBytes = encoder.encode(normalizeZipPath(file.path))
    const dataBytes = typeof file.content === 'string'
      ? encoder.encode(file.content)
      : file.content
    entries.push({ nameBytes, dataBytes, crc: crc32(dataBytes), offset: 0 })
  }

  let localSize = 0
  let centralSize = 0
  for (const entry of entries) {
    localSize += LOCAL_HEADER_SIZE + entry.nameBytes.length + entry.dataBytes.length
    centralSize += CENTRAL_HEADER_SIZE + entry.nameBytes.length
  }

  const buffer = new ArrayBuffer(localSize + centralSize + EOCD_SIZE)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // ---- 本地文件头 + 文件数据 ----
  let cursor = 0
  for (const entry of entries) {
    entry.offset = cursor
    writeU32(view, cursor, 0x04034B50)
    writeU16(view, cursor + 4, VERSION_NEEDED)
    writeU16(view, cursor + 6, FLAG_UTF8)
    writeU16(view, cursor + 8, METHOD_STORE)
    writeU16(view, cursor + 10, stamp.time)
    writeU16(view, cursor + 12, stamp.date)
    writeU32(view, cursor + 14, entry.crc)
    writeU32(view, cursor + 18, entry.dataBytes.length)
    writeU32(view, cursor + 22, entry.dataBytes.length)
    writeU16(view, cursor + 26, entry.nameBytes.length)
    writeU16(view, cursor + 28, 0)
    cursor += LOCAL_HEADER_SIZE
    bytes.set(entry.nameBytes, cursor)
    cursor += entry.nameBytes.length
    bytes.set(entry.dataBytes, cursor)
    cursor += entry.dataBytes.length
  }

  // ---- 中央目录 ----
  const centralOffset = cursor
  for (const entry of entries) {
    writeU32(view, cursor, 0x02014B50)
    writeU16(view, cursor + 4, VERSION_NEEDED)
    writeU16(view, cursor + 6, VERSION_NEEDED)
    writeU16(view, cursor + 8, FLAG_UTF8)
    writeU16(view, cursor + 10, METHOD_STORE)
    writeU16(view, cursor + 12, stamp.time)
    writeU16(view, cursor + 14, stamp.date)
    writeU32(view, cursor + 16, entry.crc)
    writeU32(view, cursor + 20, entry.dataBytes.length)
    writeU32(view, cursor + 24, entry.dataBytes.length)
    writeU16(view, cursor + 28, entry.nameBytes.length)
    writeU16(view, cursor + 30, 0)
    writeU16(view, cursor + 32, 0)
    writeU16(view, cursor + 34, 0)
    writeU16(view, cursor + 36, 0)
    writeU32(view, cursor + 38, 0)
    writeU32(view, cursor + 42, entry.offset)
    cursor += CENTRAL_HEADER_SIZE
    bytes.set(entry.nameBytes, cursor)
    cursor += entry.nameBytes.length
  }

  // ---- EOCD ----
  writeU32(view, cursor, 0x06054B50)
  writeU16(view, cursor + 4, 0)
  writeU16(view, cursor + 6, 0)
  writeU16(view, cursor + 8, entries.length)
  writeU16(view, cursor + 10, entries.length)
  writeU32(view, cursor + 12, centralSize)
  writeU32(view, cursor + 16, centralOffset)
  writeU16(view, cursor + 20, 0)

  return new Blob([bytes], { type: 'application/zip' })
}

// ==================== 内部实现 ====================

/** CRC32 查表（多项式 0xEDB88320），模块加载时构建一次 */
const CRC32_TABLE: Uint32Array = buildCrc32Table()

function buildCrc32Table(): Uint32Array {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xEDB88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
}

/** 计算字节序列的 CRC32（返回无符号 32 位整数） */
function crc32(bytes: Uint8Array): number {
  let crc = 0xFFFFFFFF
  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC32_TABLE[(crc ^ bytes[index]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

/** 统一为 ZIP 内部使用的 `/` 分隔相对路径 */
function normalizeZipPath(path: string): string {
  const source = typeof path === 'string' ? path : ''
  const unified = source.replace(/\\/g, '/')
  const trimmed = unified.replace(/^\.\//, '').replace(/^\/+/, '')
  return trimmed === '' ? 'unnamed.txt' : trimmed
}

/**
 * 时间转换为 DOS 格式（本地时间）。
 * - 日期：年（相对 1980，7 位）+ 月（4 位）+ 日（5 位）；
 * - 时间：时（5 位）+ 分（6 位）+ 秒 / 2（5 位）。
 */
function toDosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear())
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  const dosTime =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  return { time: dosTime & 0xFFFF, date: dosDate & 0xFFFF }
}

function writeU16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value & 0xFFFF, true)
}

function writeU32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true)
}
