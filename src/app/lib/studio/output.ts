import type {
  GeneratedFile,
} from './java'
import {
  base64ToBytes,
} from './assets'

/**
 * 把生成结果**直接写进模组目录**（不用再解压 ZIP 手工搬）。
 *
 * 基于 File System Access API（Chrome / Edge）。该 API 只能向下访问、不能回到上一级，
 * 所以选完目录后会先探测结构、推断它相当于模组工程里的哪一段路径（前缀），
 * 之后每个文件都按「规范路径减去该前缀」落盘。常见选法都能识别：
 *
 * | 所选目录 | 推断前缀 |
 * | --- | --- |
 * | 模组根目录（含 `src`） | 空 → 原样写 `src/main/…` |
 * | `src` | `src` |
 * | `src/main` | `src/main` |
 * | `src/main/java` | `src/main/java` |
 * | `src/main/resources` | `src/main/resources` |
 * | `com/beigu/yunbeiuc`（包目录） | `src/main/java/com/beigu/yunbeiuc` |
 *
 * 前缀没覆盖到资源树时（例如选了包目录），界面会提示再选一次资源目录。
 */

/** 目录句柄的最小接口（File System Access API 不在 TS 默认 lib 里） */
export interface DirectoryHandleLike {
  kind: string
  name: string
  getDirectoryHandle: (name: string, options?: { create?: boolean }) => Promise<DirectoryHandleLike>
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileHandleLike>
}

export interface FileHandleLike {
  kind: string
  name: string
  getFile: () => Promise<File>
  createWritable: () => Promise<{
    write: (data: string | Uint8Array | Blob) => Promise<void>
    close: () => Promise<void>
  }>
}

/**
 * 所选目录等价于「模组根目录下的哪一段路径」。
 *
 * 把用户选中的目录统一抽象成一个前缀后，落点判断就变成一句
 * 「规范路径去掉这个前缀」——选中模组根、`src`、`src/main`、`src/main/java`、
 * `src/main/resources`、包目录都能用同一套逻辑处理。
 */
export interface OutputTarget {
  /** 例如 ['src','main','java','com','beigu','yunbeiuc'] */
  prefix: string[]
  /** 所选目录名，用于界面提示 */
  pickedName: string
  handle: DirectoryHandleLike
  /** 资源目录（Java 树之外时单独选择） */
  resourcesPrefix?: string[]
  resourcesHandle?: DirectoryHandleLike
  resourcesName?: string
}

export interface WriteResult {
  written: string[]
  skipped: string[]
  errors: string[]
  /** 已插入注册行的文件名 */
  merged: string[]
}

interface PickerWindow {
  showDirectoryPicker?: (
    options?: { id?: string, mode?: 'read' | 'readwrite' },
  ) => Promise<DirectoryHandleLike>
}

const RESOURCES_PREFIX = ['src', 'main', 'resources']
const JAVA_PREFIX = ['src', 'main', 'java']

/** 浏览器是否支持目录写入 */
export function canPickOutputDirectory(): boolean {
  if (typeof window === 'undefined') return false
  return typeof (window as unknown as PickerWindow).showDirectoryPicker === 'function'
}

async function hasDirectory(handle: DirectoryHandleLike, name: string): Promise<boolean> {
  try {
    await handle.getDirectoryHandle(name)
    return true
  } catch {
    return false
  }
}

async function hasFile(handle: DirectoryHandleLike, name: string): Promise<boolean> {
  try {
    await handle.getFileHandle(name)
    return true
  } catch {
    return false
  }
}

/**
 * 推断所选目录在模组工程里的位置。
 *
 * 判断顺序从「更具体」到「更宽泛」：先看是不是某个中间层目录
 * （src / src/main / src/main/java / src/main/resources），再看是不是包目录。
 */
export async function detectPrefix(
  handle: DirectoryHandleLike,
  packageSegments: string[] = [],
): Promise<string[]> {
  const name = handle.name
  const has = async (dir: string) => hasDirectory(handle, dir)

  // 包目录（com/beigu/yunbeiuc）：顶层是 block / entity / render
  const packageLike = await has('block') || await has('entity') || await has('render')
    || await hasFile(handle, 'SignBlocks.java') || await hasFile(handle, 'ModBlockEntities.java')
  if (packageLike && !await has('java') && !await has('src')) {
    return [...JAVA_PREFIX, ...packageSegments]
  }

  if (await has('src')) return []                                   // 模组根
  if (await has('main')) return ['src']                             // 选的是 src
  if (await has('java') && await has('resources')) return ['src', 'main'] // 选的是 src/main
  if (await has('resources')) return ['src', 'main']                // resources 的父层
  if (await has('java')) return ['src', 'main', 'java']             // 选的是 src/main/java
  if (await has('assets')) return RESOURCES_PREFIX                  // 选的是 assets 的父层（resources）

  // Java 源根（src/main/java）：顶层直接是 com/ 或包名首段
  const packageFirst = packageSegments[0]
  if (packageFirst && await has(packageFirst)) return [...JAVA_PREFIX]
  if (await has('com')) return [...JAVA_PREFIX]

  // 目录名兜底（新建的空目录、或只放了包结构时也能识别）
  if (name === 'java') return [...JAVA_PREFIX]
  if (name === 'resources') return [...RESOURCES_PREFIX]
  if (name === 'main') return ['src', 'main']
  if (name === 'src') return ['src']
  if (packageSegments.length > 0 && name === packageSegments[packageSegments.length - 1]) {
    // 目录名正好是包名末段：当作包目录
    return [...JAVA_PREFIX, ...packageSegments]
  }

  // 看不出结构：当作模组根，往里建 src/main/...
  return []
}

/** 弹出目录选择框并推断前缀 */
export async function pickOutputDirectory(packageSegments: string[] = []): Promise<OutputTarget | null> {
  const picker = (window as unknown as PickerWindow).showDirectoryPicker
  if (typeof picker !== 'function') return null
  const handle = await picker({
    id: 'studio-output',
    mode: 'readwrite',
  })
  return {
    prefix: await detectPrefix(handle, packageSegments),
    pickedName: handle.name,
    handle,
  }
}

/** 某个路径是否落在该前缀之下 */
export function coversPrefix(prefix: string[], path: string[]): boolean {
  if (path.length < prefix.length) return false
  for (let i = 0; i < prefix.length; i++) {
    if (path[i] !== prefix[i]) return false
  }
  return true
}

/** 该选法是否已经覆盖资源树；否则需要再选一次资源目录 */
export function needsResourcesDirectory(target: OutputTarget): boolean {
  if (target.resourcesHandle) return false
  return !coversPrefix(target.prefix, RESOURCES_PREFIX)
}

/** 选择资源目录（一般选 `src/main/resources`） */
export async function pickResourcesDirectory(target: OutputTarget): Promise<OutputTarget | null> {
  const picker = (window as unknown as PickerWindow).showDirectoryPicker
  if (typeof picker !== 'function') return null
  const handle = await picker({
    id: 'studio-output-resources',
    mode: 'readwrite',
  })
  return {
    ...target,
    resourcesPrefix: await detectPrefix(handle),
    resourcesHandle: handle,
    resourcesName: handle.name,
  }
}

/** 前缀的可读描述 */
function describePrefix(prefix: string[]): string {
  if (prefix.length === 0) return '模组根目录'
  if (prefix.join('/') === 'src') return 'src'
  if (prefix.join('/') === 'src/main') return 'src/main'
  if (prefix.join('/') === JAVA_PREFIX.join('/')) return 'src/main/java'
  if (prefix.join('/') === RESOURCES_PREFIX.join('/')) return 'src/main/resources'
  return prefix.join('/')
}

export interface TargetDescription {
  summary: string
  /** 一个 Java 文件实际会落到哪里（示例路径，含 <占位符>） */
  javaExample: string | null
  /** 一个资源文件实际会落到哪里 */
  resourceExample: string | null
  needsResources: boolean
}

/** 把示例路径按当前选法算成「所选目录名/相对路径」，方便用户核对 */
function previewPath(
  target: OutputTarget,
  path: string,
  packageSegments: string[],
): string | null {
  const placement = resolvePlacement(target, path)
  if (!placement) return null
  const rootName = placement.root === target.handle
    ? target.pickedName
    : (target.resourcesName ?? placement.root.name)
  const directory = placement.segments.length > 0 ? `${placement.segments.join('/')}/` : ''
  return `${rootName}/${directory}${placement.fileName}`
}

/**
 * 给用户看的识别结果说明：直接给出两类文件的实际落点示例，
 * 比笼统地说「Java → src/main」更不容易误解。
 */
export function describeTarget(
  target: OutputTarget,
  packageSegments: string[] = [],
): TargetDescription {
  const where = describePrefix(target.prefix)
  const needsResources = needsResourcesDirectory(target)

  const javaSample = [...JAVA_PREFIX, ...packageSegments, 'block', 'custom', 'sign']
  const resourceSample = [...RESOURCES_PREFIX, 'assets', '<命名空间>', 'blockstates']
  const javaExample = previewPath(target, [...javaSample, '<类名>.java'].join('/'), packageSegments)
  const resourceExample = previewPath(
    target,
    [...resourceSample, '<注册名>.json'].join('/'),
    packageSegments,
  )

  let summary: string
  if (target.prefix.join('/') === RESOURCES_PREFIX.join('/')) {
    summary = `识别为资源目录「${target.pickedName}」：只写 assets/ 与 data/`
  } else if (target.prefix.length > JAVA_PREFIX.length
    && coversPrefix(target.prefix, JAVA_PREFIX)) {
    summary = `识别为包目录「${target.pickedName}」：Java 直接写进去`
  } else {
    summary = `识别为「${target.pickedName}」（${where}）`
  }
  if (needsResources) {
    summary += '；资源在另一棵树里，请再选一次 src/main/resources'
  }

  return {
    summary,
    javaExample,
    resourceExample,
    needsResources,
  }
}

/** 规范路径 -> 目录段 + 文件名 */
export function splitPath(path: string): { segments: string[], fileName: string } {
  const parts = path.replace(/\\/g, '/').split('/').filter(Boolean)
  const fileName = parts.pop() ?? path
  return {
    segments: parts,
    fileName,
  }
}

/** 去掉前缀，前缀不匹配返回 null */
export function stripPrefix(segments: string[], prefix: string[]): string[] | null {
  if (segments.length < prefix.length) return null
  for (let i = 0; i < prefix.length; i++) {
    if (segments[i] !== prefix[i]) return null
  }
  return segments.slice(prefix.length)
}

/** 资源类文件（`src/main/resources/...`）与 Java 文件分流 */
export function splitGeneratedFiles(files: GeneratedFile[]): {
  java: GeneratedFile[]
  resources: GeneratedFile[]
  others: GeneratedFile[]
} {
  const java: GeneratedFile[] = []
  const resources: GeneratedFile[] = []
  const others: GeneratedFile[] = []
  for (const file of files) {
    if (file.path.startsWith('src/main/java/')) java.push(file)
    else if (file.path.startsWith('src/main/resources/')) resources.push(file)
    else others.push(file)
  }
  return {
    java, resources, others,
  }
}


/**
 * 某个规范路径应该落到所选目录的哪个子路径下。
 *
 * 规则：先看该路径是否落在所选目录的前缀之下；否则若另选了资源目录，
 * 再看是否落在资源前缀之下；都不匹配就返回 null（该选法下不落盘）。
 */
export function resolvePlacement(
  target: OutputTarget,
  path: string,
): { root: DirectoryHandleLike, segments: string[], fileName: string } | null {
  const { segments, fileName } = splitPath(path)

  const rest = stripPrefix(segments, target.prefix)
  if (rest) return { root: target.handle, segments: rest, fileName }

  if (target.resourcesHandle && target.resourcesPrefix) {
    const resourceRest = stripPrefix(segments, target.resourcesPrefix)
    if (resourceRest) {
      return {
        root: target.resourcesHandle,
        segments: resourceRest,
        fileName,
      }
    }
  }
  return null
}

async function ensureDirectory(
  root: DirectoryHandleLike,
  segments: string[],
): Promise<DirectoryHandleLike> {
  let current = root
  for (const segment of segments) {
    if (!segment) continue
    current = await current.getDirectoryHandle(segment, {
      create: true,
    })
  }
  return current
}

async function writeFileAt(
  root: DirectoryHandleLike,
  segments: string[],
  fileName: string,
  content: string | Uint8Array,
): Promise<void> {
  const directory = await ensureDirectory(root, segments)
  const fileHandle = await directory.getFileHandle(fileName, {
    create: true,
  })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

/** 取一个生成文件的实际落盘内容（文本或二进制） */
function fileBytes(file: GeneratedFile): string | Uint8Array {
  return file.encoding === 'base64' ? base64ToBytes(file.content) : file.content
}

/** `assets/<ns>/lang/xx_xx.json` —— 模组里几千条共用条目，只能合并不能覆盖 */
const LANG_JSON_RE = /^src\/main\/resources\/assets\/[^/]+\/lang\/[a-z0-9_]+\.json$/i

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

type LangMergeOutcome =
  | { status: 'created' }
  | { status: 'merged', added: number, updated: number, kept: number }
  | { status: 'skipped', reason: string }

/**
 * 语言条目合并：以已有文件为底，把生成的键并进去
 * （与本地接口 `api/studio/write` 同一套规则）。
 *
 * 新键插到**第一个键名包含锚点**的位置之前（默认锚点
 * `block.yunbeiuc.sign_custom_expressway_1`）；找不到就追加到末尾。
 * 同名键在原位置更新，其余条目与顺序原样保留。
 */
function mergeLangEntries(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
  anchor: string,
): { merged: Record<string, unknown>, added: number, updated: number, kept: number } {
  // 锚点允许带引号（用户可能直接把整行粘进来）
  const trimmed = anchor.trim().replace(/^["']|["']$/g, '')
  const newKeys = Object.keys(patch).filter(key => !(key in base))
  const updated = Object.keys(patch)
    .filter(key => key in base && base[key] !== patch[key]).length

  const merged: Record<string, unknown> = {}
  let inserted = false
  for (const key of Object.keys(base)) {
    if (!inserted && trimmed.length > 0 && newKeys.length > 0 && key.includes(trimmed)) {
      for (const newKey of newKeys) merged[newKey] = patch[newKey]
      inserted = true
    }
    merged[key] = key in patch ? patch[key] : base[key]
  }
  if (!inserted) {
    for (const newKey of newKeys) merged[newKey] = patch[newKey]
  }

  return {
    merged,
    added: newKeys.length,
    updated,
    kept: Object.keys(base).length - updated,
  }
}

/**
 * 语言文件合并（与本地接口 `api/studio/write` 同一套规则）。
 *
 * 生成的语言文件只有两三条（方块名 + 工具提示），直接覆盖会清空模组里
 * 上千条手工维护的条目。所以以已有文件为底把生成的键并进去，
 * 已有文件不是合法 JSON 对象时宁可不写。
 */
async function mergeLangFile(
  root: DirectoryHandleLike,
  segments: string[],
  fileName: string,
  incoming: string,
  anchor: string,
): Promise<LangMergeOutcome> {
  const existing = await readFileAt(root, segments, fileName)
  if (existing === null) return {
    status: 'created',
  }

  let base: unknown
  let patch: unknown
  try {
    base = JSON.parse(existing)
    patch = JSON.parse(incoming)
  }
  catch {
    return {
      status: 'skipped',
      reason: '已有语言文件不是合法 JSON，为避免覆盖已跳过（请手工合并）',
    }
  }
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return {
      status: 'skipped',
      reason: '语言文件不是 JSON 对象结构，为避免覆盖已跳过（请手工合并）',
    }
  }

  const outcome = mergeLangEntries(base, patch, anchor)
  await writeFileAt(root, segments, fileName, `${JSON.stringify(outcome.merged, null, 2)}\n`)
  return {
    status: 'merged',
    added: outcome.added,
    updated: outcome.updated,
    kept: outcome.kept,
  }
}

async function readFileAt(
  root: DirectoryHandleLike,
  segments: string[],
  fileName: string,
): Promise<string | null> {
  try {
    const directory = await ensureDirectory(root, segments)
    const fileHandle = await directory.getFileHandle(fileName)
    const file = await fileHandle.getFile()
    return await file.text()
  } catch {
    return null
  }
}

export interface WriteOptions {
  /** 包路径分段，例如 ['com','beigu','yunbeiuc'] */
  packageSegments: string[]
  /** 生成结果里的注册片段 */
  snippets?: { title: string, code: string }[]
  /** 是否把注册行插入已有的 SignBlocks / ModBlockEntities */
  mergeSnippets?: boolean
  /** 注册行插到含这串文字的那一行之前（SignBlocks / MunicipalBlocks）；留空 = 类末尾 */
  blockAnchor?: string
  /** 注册行插到含这串文字的那一行之前（ModBlockEntities）；留空 = 类末尾 */
  entityAnchor?: string
  /** 注册行插到含这串文字的那一行之前（ModItems）；留空 = 类末尾 */
  itemAnchor?: string
  /** 语言条目插到键名含这串文字的那一条之前；留空 = 追加到末尾 */
  langAnchor?: string
}

/**
 * 决定注册片段插到已有文件的哪个位置（与本地接口 `api/studio/write` 同一套规则）。
 *
 * 优先用锚点：找到第一行包含该锚点的位置，把片段插在它**前面**；
 * 锚点为空或找不到时，兜底插到最后一个 `}` 之前。
 */
function insertSnippet(
  existing: string,
  code: string,
  anchor: string,
): { next: string, where: string } | null {
  const trimmedAnchor = anchor.trim()
  if (trimmedAnchor.length > 0) {
    const lines = existing.split('\n')
    const index = lines.findIndex(line => line.includes(trimmedAnchor))
    if (index >= 0) {
      const head = lines.slice(0, index).join('\n')
      const tail = lines.slice(index).join('\n')
      const prefix = head.length > 0 ? `${head}\n` : ''
      return {
        next: `${prefix}${code}\n${tail}`,
        where: `「${trimmedAnchor}」那一行之前`,
      }
    }
  }

  const lastBrace = existing.lastIndexOf('}')
  if (lastBrace < 0) return null
  return {
    next: `${existing.slice(0, lastBrace)}${code}\n${existing.slice(lastBrace)}`,
    where: '类末尾',
  }
}

/** 把片段整理成能落进类体的代码：去掉「粘贴到 XXX」指引注释，按 4 空格缩进 */
function indentSnippet(code: string, indent = '    '): string {
  const lines = code.replace(/\r\n/g, '\n').split('\n')
  const firstCode = lines.findIndex(line => line.trim().length > 0 && !line.trim().startsWith('//'))
  const body = firstCode < 0 ? [] : lines.slice(firstCode)
  return body
    .map(line => (line.trim().length > 0 ? `${indent}${line}` : ''))
    .join('\n')
    .replace(/\s+$/, '')
}

/**
 * 写入全部生成文件。
 *
 * - `src/main/java/...` 按所选布局落到对应位置；
 * - `src/main/resources/...` 在 package / java 模式下走单独选的资源目录；
 * - snippets 这类非工程文件只在 root / main 模式下写入（避免污染包目录）；
 * - `scope: 'version'` 的文件需要按版本目录分发，浏览器目录选择器做不到，
 *   会跳过并提示改用「写入本地模组目录」。
 */
export async function writeGeneratedFiles(
  target: OutputTarget,
  files: GeneratedFile[],
  options: WriteOptions,
): Promise<WriteResult> {
  const result: WriteResult = {
    written: [], skipped: [], errors: [], merged: [],
  }

  for (const file of files) {
    if (file.scope === 'version') {
      result.skipped.push(`${file.path}（版本专属文件，请用「写入本地模组目录」）`)
      continue
    }
    const placement = resolvePlacement(target, file.path)
    if (!placement) {
      result.skipped.push(file.path)
      continue
    }
    try {
      // 语言文件是共用文件：只并入，绝不整体覆盖
      if (LANG_JSON_RE.test(file.path)) {
        const outcome = await mergeLangFile(
          placement.root,
          placement.segments,
          placement.fileName,
          file.content,
          options.langAnchor ?? '',
        )
        if (outcome.status === 'skipped') {
          result.errors.push(`${file.path}：${outcome.reason}`)
          continue
        }
        if (outcome.status === 'merged') {
          result.merged.push(
            `${file.path}：并入 ${outcome.added} 条新条目`
            + (outcome.updated > 0 ? `、更新 ${outcome.updated} 条` : '')
            + `，保留原有 ${outcome.kept} 条`,
          )
          result.written.push(file.path)
          continue
        }
      }
      await writeFileAt(placement.root, placement.segments, placement.fileName, fileBytes(file))
      result.written.push(file.path)
    } catch (error) {
      result.errors.push(`${file.path}：${(error as Error).message}`)
    }
  }

  if (options.mergeSnippets && options.snippets && options.snippets.length > 0) {
    const mergeResult = await mergeRegistrationSnippets(target, options)
    result.merged.push(...mergeResult.merged)
    result.errors.push(...mergeResult.errors)
  }

  return result
}

/**
 * 定位 java 包目录：把所选目录的前缀接到包路径上，再减掉它自己。
 * 例如选的是模组根（前缀为空）→ `src/main/java/com/beigu/yunbeiuc`；
 * 选的是包目录（前缀已含包路径）→ 就是所选目录本身（返回空段）。
 */
export function resolveJavaPackageRoot(
  target: OutputTarget,
  packageSegments: string[],
): { root: DirectoryHandleLike, segments: string[] } | null {
  const packagePath = [...JAVA_PREFIX, ...packageSegments]
  const rest = stripPrefix(packagePath, target.prefix)
  if (rest) {
    return {
      root: target.handle, segments: rest,
    }
  }
  // 前缀比包路径更深（不太可能），或选了资源目录 → 无法定位包目录
  return null
}

/** 从片段代码里取出常量名，例如 SIGN_CUSTOM_01 */
export function extractConstantName(code: string): string {
  const match = /([A-Z][A-Z0-9_]{2,})\s*=/.exec(code)
  return match ? match[1] : ''
}

/**
 * 把注册片段插入已有的 SignBlocks.java / ModBlockEntities.java。
 *
 * 只在文件里还没有该常量时插入，插到最后一个 `}` 之前，不改动其它内容；
 * 找不到文件就跳过并在结果里说明（片段内容仍可在界面里复制）。
 */
async function mergeRegistrationSnippets(
  target: OutputTarget,
  options: WriteOptions,
): Promise<{ merged: string[], errors: string[] }> {
  const merged: string[] = []
  const errors: string[] = []
  const snippets = options.snippets ?? []
  const packageRoot = resolveJavaPackageRoot(target, options.packageSegments)
  if (!packageRoot) return {
    merged, errors,
  }

  // 方块注册片段的落点随 category 变化：SignBlocks 与 MunicipalBlocks 是两个不同的类/文件。
  // 这里直接从片段标题里认出来，避免把 MunicipalBlocks 的注册行塞进 SignBlocks.java。
  const blockSnippet = snippets.find(entry => entry.title.includes('MunicipalBlocks'))
    ?? snippets.find(entry => entry.title.includes('SignBlocks'))
  const blockIsMunicipal = !!blockSnippet && blockSnippet.title.includes('MunicipalBlocks')
  const blockHolder = blockIsMunicipal ? 'MunicipalBlocks' : 'SignBlocks'

  const plan = [
    {
      snippet: blockSnippet,
      match: blockHolder,
      dir: 'block',
      fileName: `${blockHolder}.java`,
      anchor: options.blockAnchor ?? '',
    },
    {
      snippet: snippets.find(entry => entry.title.includes('ModBlockEntities')),
      match: 'ModBlockEntities',
      dir: 'entity',
      fileName: 'ModBlockEntities.java',
      anchor: options.entityAnchor ?? '',
    },
    {
      snippet: snippets.find(entry => entry.title.includes('ModItems')),
      match: 'ModItems',
      dir: 'item',
      fileName: 'ModItems.java',
      anchor: options.itemAnchor ?? '',
    },
  ]

  for (const item of plan) {
    const snippet = item.snippet
    if (!snippet) continue
    const segments = [...packageRoot.segments, item.dir]
    const constantName = extractConstantName(snippet.code)
    try {
      const existing = await readFileAt(packageRoot.root, segments, item.fileName)
      if (existing === null) {
        errors.push(`未找到 ${item.fileName}，注册行未自动插入（可在界面里手动复制）`)
        continue
      }
      if (constantName && existing.includes(constantName)) {
        // 已经注册过：重复写入不会重复插入
        continue
      }
      const placement = insertSnippet(existing, indentSnippet(snippet.code), item.anchor)
      if (!placement) {
        errors.push(`${item.fileName} 结构无法识别，注册行未插入`)
        continue
      }
      await writeFileAt(packageRoot.root, segments, item.fileName, placement.next)
      merged.push(`${item.fileName}：已插入 ${item.match} 注册行（${placement.where}）`)
    } catch (error) {
      errors.push(`${item.fileName}：${(error as Error).message}`)
    }
  }

  return {
    merged, errors,
  }
}
