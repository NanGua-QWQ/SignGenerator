/**
 * 本地写入接口：把工坊生成的文件按规范路径直接写进本机模组工程。
 *
 * 只做三件事：
 * 1. `probe`：看看这个目录像不像模组源码根（有没有 `src/main/java` 等）；
 * 2. `write`：把 `src/main/**` 的文件写盘（目录不存在就建）；
 * 3. 可选：把注册片段插进已有的 `SignBlocks.java` / `MunicipalBlocks.java` /
 *    `ModBlockEntities.java`（常量已存在则跳过，重复写入不会重复插入）。
 *
 * 安全约束：所有落点必须落在所选根目录之内（`path.resolve` 后做前缀校验），
 * 越界路径直接拒绝；`snippets/` 这类说明文件不落进模组目录。
 *
 * 版本专属资源（`scope: 'version'`，如 26.x 的 `assets/<ns>/items/`、
 * `data/<ns>/recipe/`、`data/<ns>/loot_table/`）只会写进
 * `versions/<版本>/common/` 下已经存在对应目录的版本，绝不落到 `versions/common`。
 */

import {
  promises as fs,
} from 'node:fs'
import path from 'node:path'

import {
  DEFAULT_MOD_SOURCE_ROOT,
} from '@/lib/studio/server-write'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const JAVA_ROOT = ['src', 'main', 'java']
const RESOURCES_ROOT = ['src', 'main', 'resources']

interface WriteBody {
  rootPath?: unknown
  files?: unknown
  snippets?: unknown
  mergeSnippets?: unknown
  packageSegments?: unknown
  category?: unknown
  /** 注册行插到哪一行之前（SignBlocks / MunicipalBlocks） */
  blockAnchor?: unknown
  /** 注册行插到哪一行之前（ModBlockEntities） */
  entityAnchor?: unknown
  /** 注册行插到哪一行之前（ModItems） */
  itemAnchor?: unknown
  /** 语言条目插到哪个键之前 */
  langAnchor?: unknown
  /** 渲染器注册行插到哪一行之前（各版本 *Client.java） */
  rendererAnchor?: unknown
}

function normalizeRelative(relative: string): string[] {
  return relative.replace(/\\/g, '/').split('/').filter(segment => segment && segment !== '.')
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await fs.stat(target)).isDirectory()
  }
  catch {
    return false
  }
}

async function isFile(target: string): Promise<boolean> {
  try {
    return (await fs.stat(target)).isFile()
  }
  catch {
    return false
  }
}

/** 版本专属文件的目标源码根（`versions/<版本>/common`） */
interface VersionTarget {
  label: string
  base: string
  /** 展示用前缀，例如 `versions/26.3/common/` */
  prefix: string
}

/**
 * 找出版本子目录。
 *
 * - 根目录是 `.../versions/common` 时，返回所有含 `common` 的兄弟版本目录
 *   （旧版本没有 `common/src/main/resources`，资源文件会按目标目录是否存在再过滤，
 *   但渲染器注册仍然要写进它们的客户端类）；
 * - 根目录本身是 `.../versions/<版本>/common` 时，只返回当前版本；
 * - 其它目录结构返回空数组（调用方据此跳过，而不是退回 common）。
 */
async function listVersionTargets(root: string): Promise<VersionTarget[]> {
  const parent = path.dirname(root)
  const parentName = path.basename(parent).toLowerCase()
  if (parentName === 'versions') {
    const entries = await fs.readdir(parent, { withFileTypes: true }).catch(() => [])
    const targets: VersionTarget[] = []
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.toLowerCase() === 'common') continue
      const base = path.join(parent, entry.name, 'common')
      if (!await isDirectory(base)) continue
      targets.push({
        label: entry.name,
        base,
        prefix: `${path.basename(parent)}/${entry.name}/common/`,
      })
    }
    return targets
  }

  const grand = path.dirname(parent)
  if (
    path.basename(root).toLowerCase() === 'common'
    && path.basename(grand).toLowerCase() === 'versions'
  ) {
    return [{
      label: path.basename(parent),
      base: root,
      prefix: '',
    }]
  }
  return []
}

/** 递归收集客户端初始化类 */
async function collectClientFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  const out: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...await collectClientFiles(full))
    }
    else if (entry.isFile() && entry.name.endsWith('Client.java')) {
      out.push(full)
    }
  }
  return out
}

/** 某个版本目录下所有加载器（fabric / neoforge / forge）的客户端类 */
async function listClientFiles(target: VersionTarget): Promise<{ absolute: string, display: string }[]> {
  const modRoot = path.dirname(target.base)
  const entries = await fs.readdir(modRoot, { withFileTypes: true }).catch(() => [])
  const out: { absolute: string, display: string }[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'common') continue
    const javaRoot = path.join(modRoot, entry.name, ...JAVA_ROOT)
    if (!await isDirectory(javaRoot)) continue
    for (const absolute of await collectClientFiles(javaRoot)) {
      const display = path.relative(modRoot, absolute).split(path.sep).join('/')
      out.push({ absolute, display: `${target.label}/${display}` })
    }
  }
  return out
}

/**
 * 版本间配方格式差异：26.x 的 `ingredient` 是字符串，1.21.1 仍是 `{ item: ... }`。
 * 其余资源（物品定义、掉落表）各版本一致，不需要转换。
 */
function adaptVersionContent(relative: string, content: string, versionLabel: string): string {
  const major = Number.parseInt(versionLabel, 10)
  if (!relative.includes('/recipe/') || !Number.isFinite(major) || major >= 26) return content
  try {
    const json = JSON.parse(content) as { ingredient?: unknown }
    if (typeof json.ingredient === 'string') {
      json.ingredient = { item: json.ingredient }
      return JSON.stringify(json, null, 2)
    }
  }
  catch {
    // 非 JSON 内容原样写入
  }
  return content
}

/** 从渲染器注册片段里取实体常量名（如 SIGN_CUSTOM_01_ENTITY），用于幂等判断 */
function rendererConstant(code: string): string {
  const match = /ModBlockEntities\.([A-Z0-9_]+)/.exec(code)
  return match ? match[1] : ''
}

/**
 * 把渲染器注册行插到指定锚点行之前。
 *
 * `anchor` 命中文件里的非 import 行就插在它前面；留空或找不到时，
 * 退回「第一个 `BlockEntityRendererRegistry.register(...)` 之前」。
 */
function insertRendererLine(
  existing: string,
  code: string,
  anchor: string,
): { next: string, where: string } | null {
  const line = code
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(item => item.trim())
    .find(item => item.length > 0 && !item.startsWith('//'))
  if (!line) return null

  const lines = existing.replace(/\r\n/g, '\n').split('\n')
  const trimmedAnchor = anchor.trim()
  let index = -1
  let where = ''

  if (trimmedAnchor) {
    index = lines.findIndex((item) => {
      const text = item.trim()
      return text.length > 0
        && !text.startsWith('import ')
        && !text.startsWith('package ')
        && text.includes(trimmedAnchor)
    })
    if (index >= 0) where = `「${trimmedAnchor}」那一行之前`
  }

  if (index < 0) {
    index = lines.findIndex(item => item.includes('BlockEntityRendererRegistry.register('))
    if (index < 0) return null
    where = '首个 BlockEntityRendererRegistry.register(...) 之前'
  }

  const indent = /^\s*/.exec(lines[index])?.[0] ?? ''
  lines.splice(index, 0, `${indent}${line}`)
  return {
    next: lines.join('\n'),
    where,
  }
}

/** 缺少就补 import，避免自动插入的注册行编译不过 */
function ensureImports(
  existing: string,
  imports: readonly string[],
): string {
  const lines = existing.replace(/\r\n/g, '\n').split('\n')
  const missing = imports.filter(importLine => !existing.includes(importLine))
  if (missing.length === 0) return existing

  const lastImport = lines.reduce((acc, line, index) => (line.startsWith('import ') ? index : acc), -1)
  if (lastImport >= 0) {
    lines.splice(lastImport + 1, 0, ...missing)
  }
  else {
    const packageLine = lines.findIndex(line => line.startsWith('package '))
    lines.splice(packageLine + 1, 0, '', ...missing)
  }
  return lines.join('\n')
}

/** 从片段代码里取出常量名，例如 SIGN_CUSTOM_01 */
function extractConstantName(code: string): string {
  const match = /([A-Z][A-Z0-9_]{2,})\s*=/.exec(code)
  return match ? match[1] : ''
}

/** `assets/<ns>/lang/xx_xx.json` —— 这类文件是共用的，只能合并不能覆盖 */
const LANG_JSON_RE = /^src\/main\/resources\/assets\/[^/]+\/lang\/[a-z0-9_]+\.json$/i

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

type MergeOutcome =
  | { status: 'created' }
  | { status: 'merged', added: number, updated: number, kept: number }
  | { status: 'skipped', reason: string }

/**
 * 语言条目合并：以已有文件为底，把生成的键并进去。
 *
 * 新键插到**第一个键名包含锚点**的位置之前（默认锚点
 * `block.yunbeiuc.sign_custom_expressway_1`，也就是自定义牌那一组的开头）；
 * 锚点在已有文件里找不到时追加到末尾。同名键在原位置更新，其余条目和顺序原样保留。
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
 * 语言文件合并。
 *
 * `assets/<ns>/lang/zh_cn.json` 是模组里几千条条目、多人手工维护的共用文件；
 * 工坊只生成其中两三条（方块名 + 工具提示），**整体覆盖会直接清空整个语言文件**。
 * 所以这里以已有文件为底，把生成的键并进去：同名键用新值，其余原样保留。
 * 已有文件不是合法 JSON 对象时宁可不写，也不冒险覆盖。
 */
async function mergeLangJson(
  absolute: string,
  incoming: string,
  anchor: string,
): Promise<MergeOutcome> {
  const existing = await fs.readFile(absolute, 'utf8').catch(() => null)
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
  await fs.writeFile(absolute, `${JSON.stringify(outcome.merged, null, 2)}\n`, 'utf8')
  return {
    status: 'merged',
    added: outcome.added,
    updated: outcome.updated,
    kept: outcome.kept,
  }
}

/**
 * 把注册片段整理成可直接落进类体的代码：
 * 去掉片段顶部那些「粘贴到 XXX」的人工指引注释（自动插入后它们只会误导），
 * 并按 4 空格缩进补齐到类体里。
 */
function indentSnippet(code: string, indent = '    '): string {
  const lines = code.replace(/\r\n/g, '\n').split('\n')
  const firstCode = lines.findIndex(line => line.trim().length > 0 && !line.trim().startsWith('//'))
  const body = firstCode < 0 ? [] : lines.slice(firstCode)
  return body
    .map(line => (line.trim().length > 0 ? `${indent}${line}` : ''))
    .join('\n')
    .replace(/\s+$/, '')
}

async function probe(root: string, packageSegments: string[]) {
  const ok = await isDirectory(root)
  if (!ok) {
    return Response.json({
      ok: false,
      rootPath: root,
      message: `目录不存在或不是文件夹：${root}`,
      hasJavaRoot: false,
      hasResourcesRoot: false,
      hasSignBlocks: false,
      hasMunicipalBlocks: false,
      hasBlockEntities: false,
    })
  }

  const javaRoot = path.join(root, ...JAVA_ROOT)
  const resourcesRoot = path.join(root, ...RESOURCES_ROOT)
  const packageRoot = path.join(javaRoot, ...packageSegments)

  const [hasJavaRoot, hasResourcesRoot, hasSignBlocks, hasMunicipalBlocks, hasBlockEntities]
    = await Promise.all([
      isDirectory(javaRoot),
      isDirectory(resourcesRoot),
      isFile(path.join(packageRoot, 'block', 'SignBlocks.java')),
      isFile(path.join(packageRoot, 'block', 'MunicipalBlocks.java')),
      isFile(path.join(packageRoot, 'entity', 'ModBlockEntities.java')),
    ])

  const notes: string[] = []
  if (!hasJavaRoot) notes.push('没有 src/main/java')
  if (!hasResourcesRoot) notes.push('没有 src/main/resources')
  const message = notes.length === 0
    ? '识别为模组源码根目录，可以直接写入'
    : `这个目录下 ${notes.join('、')}，请确认选的是含 src/main 的那一层`

  return Response.json({
    ok: hasJavaRoot && hasResourcesRoot,
    rootPath: root,
    message,
    hasJavaRoot,
    hasResourcesRoot,
    hasSignBlocks,
    hasMunicipalBlocks,
    hasBlockEntities,
  })
}

async function writeFiles(root: string, body: WriteBody) {
  const result = {
    rootPath: root,
    written: [] as string[],
    skipped: [] as string[],
    errors: [] as string[],
    merged: [] as string[],
  }

  const files = Array.isArray(body.files) ? body.files : []
  let versionTargets: VersionTarget[] | null = null
  for (const raw of files) {
    const file = raw as { path?: unknown, content?: unknown, encoding?: unknown, scope?: unknown }
    if (!file || typeof file.path !== 'string') {
      result.errors.push('有一条文件记录缺少 path，已跳过')
      continue
    }
    const relative = file.path
    const segments = normalizeRelative(relative)

    // 只写工程源码 / 资源；snippets 这类说明文件不进模组目录
    if (segments[0] !== 'src' || segments[1] !== 'main' || segments.length < 3) {
      result.skipped.push(relative)
      continue
    }

    const content = typeof file.content === 'string' ? file.content : ''
    const encoding = file.encoding === 'base64' ? 'base64' : 'utf8'

    // 版本专属资源：只落进各版本子目录，绝不写进所选 common 根目录
    if (file.scope === 'version') {
      if (segments[2] !== 'resources' || segments.length < 5) {
        result.errors.push(`${relative}：版本专属文件必须位于 src/main/resources 下，已跳过`)
        continue
      }
      if (versionTargets === null) versionTargets = await listVersionTargets(root)
      if (versionTargets.length === 0) {
        result.skipped.push(`${relative}：未找到 versions/<版本>/common 目录，已跳过（不会写入 common）`)
        continue
      }

      let wrote = 0
      for (const target of versionTargets) {
        const containing = path.resolve(target.base, ...segments.slice(0, -1))
        const absolute = path.resolve(target.base, ...segments)
        if (!absolute.startsWith(target.base + path.sep)) {
          result.errors.push(`${relative}：落点越出 ${target.label} 版本目录，已拒绝`)
          continue
        }
        // 只写已经有对应资源目录的版本（26.x 有 assets/items，旧版没有）
        if (!await isDirectory(containing)) continue
        try {
          await fs.mkdir(containing, { recursive: true })
          if (encoding === 'base64') {
            await fs.writeFile(absolute, Buffer.from(content, 'base64'))
          }
          else {
            await fs.writeFile(absolute, adaptVersionContent(relative, content, target.label), 'utf8')
          }
          result.written.push(`${target.prefix}${relative}`)
          wrote++
        }
        catch (error) {
          result.errors.push(`${target.prefix}${relative}：${(error as Error).message}`)
        }
      }
      if (wrote === 0) {
        result.skipped.push(
          `${relative}：没有版本子目录包含 ${segments.slice(0, -1).join('/')}/，已跳过`,
        )
      }
      continue
    }

    const absolute = path.resolve(root, ...segments)
    if (!absolute.startsWith(root + path.sep)) {
      result.errors.push(`${relative}：落点越出所选目录，已拒绝`)
      continue
    }

    const relativePosix = segments.join('/')

    try {
      await fs.mkdir(path.dirname(absolute), { recursive: true })

      // 语言文件是共用文件：只并入，绝不整体覆盖
      if (LANG_JSON_RE.test(relativePosix)) {
        const langAnchor = typeof body.langAnchor === 'string' ? body.langAnchor : ''
        const outcome = await mergeLangJson(absolute, content, langAnchor)
        if (outcome.status === 'skipped') {
          result.errors.push(`${relative}：${outcome.reason}`)
          continue
        }
        if (outcome.status === 'merged') {
          result.merged.push(
            `${relative}：并入 ${outcome.added} 条新条目`
            + (outcome.updated > 0 ? `、更新 ${outcome.updated} 条` : '')
            + `，保留原有 ${outcome.kept} 条`,
          )
          result.written.push(relative)
          continue
        }
        // status === 'created'：文件原本不存在，按生成内容新建
      }

      if (file.encoding === 'base64') {
        await fs.writeFile(absolute, Buffer.from(content, 'base64'))
      }
      else {
        await fs.writeFile(absolute, content, 'utf8')
      }
      result.written.push(relative)
    }
    catch (error) {
      result.errors.push(`${relative}：${(error as Error).message}`)
    }
  }

  if (body.mergeSnippets === true) {
    const mergeResult = await mergeSnippets(root, body)
    result.merged.push(...mergeResult.merged)
    result.errors.push(...mergeResult.errors)
  }

  return Response.json(result)
}

/**
 * 决定注册片段插到已有文件的哪个位置。
 *
 * 优先级：
 * 1. 界面里填的**锚点**：找到第一行包含该锚点的位置，把片段插在它**前面**
 *    （默认锚点 `SIGN_CUSTOM_EXPRESSWAY_1`，也就是自定义牌那一组的开头）；
 * 2. 锚点为空、或文件里找不到该行时，退回到 `public static void init()` 那一行之前
 *    —— SignBlocks / MunicipalBlocks / ModItems / ModBlockEntities 全都有这个方法，
 *    把常量放在它前面就等于「所有常量之后、方法之前」，永远不会插到方法体里；
 * 3. 连 `init()` 都没有（外部改过的文件）才兜底插到最后一个 `}` 之前。
 */
function insertBeforeLine(
  existing: string,
  code: string,
  needle: string,
): { next: string, where: string } | null {
  const lines = existing.split('\n')
  const index = lines.findIndex(line => line.includes(needle))
  if (index < 0) return null
  const head = lines.slice(0, index).join('\n')
  const tail = lines.slice(index).join('\n')
  const prefix = head.length > 0 ? `${head}\n` : ''
  return {
    next: `${prefix}${code}\n${tail}`,
    where: `「${needle}」那一行之前`,
  }
}

function insertSnippet(
  existing: string,
  code: string,
  anchor: string,
): { next: string, where: string } | null {
  const trimmedAnchor = anchor.trim()
  if (trimmedAnchor.length > 0) {
    const placement = insertBeforeLine(existing, code, trimmedAnchor)
    if (placement) return placement
  }

  // 结构锚点：任何注册表文件都有 init()，插在它前面最稳
  const structural = insertBeforeLine(existing, code, 'public static void init()')
  if (structural) {
    return {
      ...structural,
      where: '`init()` 方法之前（常量区末尾）',
    }
  }

  const lastBrace = existing.lastIndexOf('}')
  if (lastBrace < 0) return null
  return {
    next: `${existing.slice(0, lastBrace)}${code}\n${existing.slice(lastBrace)}`,
    where: '类末尾',
  }
}

/**
 * 把注册片段插进已有注册文件。
 *
 * 插入位置见 `insertSnippet`；文件里已有该常量名就跳过（保证幂等）。
 * 渲染器注册片段另外插到每个版本目录下各加载器的客户端初始化类里。
 */
async function mergeSnippets(
  root: string,
  body: WriteBody,
): Promise<{ merged: string[], errors: string[] }> {
  const merged: string[] = []
  const errors: string[] = []
  const snippets = (Array.isArray(body.snippets) ? body.snippets : [])
    .filter((item): item is { title: string, code: string } => (
      !!item
      && typeof (item as { title?: unknown }).title === 'string'
      && typeof (item as { code?: unknown }).code === 'string'
    ))
  if (snippets.length === 0) return {
    merged, errors,
  }

  const packageSegments = stringArray(body.packageSegments)
  const category = body.category === 'municipal' ? 'municipal' : 'sign'
  const blockHolder = category === 'municipal' ? 'MunicipalBlocks' : 'SignBlocks'
  const blockFileName = `${blockHolder}.java`
  const packageRoot = path.join(root, ...JAVA_ROOT, ...packageSegments)

  const blockAnchor = typeof body.blockAnchor === 'string' ? body.blockAnchor : ''
  const entityAnchor = typeof body.entityAnchor === 'string' ? body.entityAnchor : ''
  const itemAnchor = typeof body.itemAnchor === 'string' ? body.itemAnchor : ''
  const rendererAnchor = typeof body.rendererAnchor === 'string' ? body.rendererAnchor : ''

  const plan = [
    {
      key: blockHolder, dir: 'block', fileName: blockFileName, anchor: blockAnchor,
    },
    {
      key: 'ModBlockEntities', dir: 'entity', fileName: 'ModBlockEntities.java', anchor: entityAnchor,
    },
    {
      key: 'ModItems', dir: 'item', fileName: 'ModItems.java', anchor: itemAnchor,
    },
  ]

  for (const item of plan) {
    const snippet = snippets.find(entry => entry.title.includes(item.key))
    if (!snippet) continue

    const absolute = path.join(packageRoot, item.dir, item.fileName)
    if (!absolute.startsWith(root + path.sep)) {
      errors.push(`${item.fileName}：落点越出所选目录，已拒绝`)
      continue
    }

    try {
      const existing = await fs.readFile(absolute, 'utf8').catch(() => null)
      if (existing === null) {
        errors.push(`未找到 ${item.fileName}，注册行未自动插入（可在界面里手动复制）`)
        continue
      }
      const constantName = extractConstantName(snippet.code)
      if (constantName && existing.includes(constantName)) {
        continue // 已注册过
      }
      const placement = insertSnippet(existing, indentSnippet(snippet.code), item.anchor)
      if (!placement) {
        errors.push(`${item.fileName} 结构无法识别，注册行未插入`)
        continue
      }
      await fs.writeFile(absolute, placement.next, 'utf8')
      merged.push(`${item.fileName}：已插入 ${item.key} 注册行（${placement.where}）`)
    }
    catch (error) {
      errors.push(`${item.fileName}：${(error as Error).message}`)
    }
  }

  // 渲染器：插到每个版本子目录下 fabric / neoforge（旧版 forge）的客户端初始化类
  const rendererSnippet = snippets.find(entry => entry.title.includes('渲染器'))
  if (rendererSnippet) {
    const targets = await listVersionTargets(root)
    if (targets.length === 0) {
      errors.push('未找到 versions/<版本>/common 目录，渲染器注册未自动插入（可在界面里手动复制）')
    }
    else {
      const pkg = packageSegments.join('.')
      const imports = [
        'import dev.architectury.registry.client.rendering.BlockEntityRendererRegistry;',
        pkg ? `import ${pkg}.entity.ModBlockEntities;` : '',
        pkg ? `import ${pkg}.render.*;` : '',
      ].filter(line => line.length > 0)
      const constantName = rendererConstant(rendererSnippet.code)
      const registration = constantName
        ? `BlockEntityRendererRegistry.register(ModBlockEntities.${constantName}`
        : ''
      let found = 0

      for (const target of targets) {
        for (const client of await listClientFiles(target)) {
          found++
          try {
            const existing = await fs.readFile(client.absolute, 'utf8').catch(() => null)
            if (existing === null) continue
            if (registration && existing.includes(registration)) {
              merged.push(`${client.display}：已存在该渲染器注册，跳过`)
              continue
            }

            const placement = insertRendererLine(existing, rendererSnippet.code, rendererAnchor)
            if (!placement) {
              errors.push(`${client.display}：未找到 BlockEntityRendererRegistry.register(...) 行，未插入`)
              continue
            }
            await fs.writeFile(client.absolute, ensureImports(placement.next, imports), 'utf8')
            merged.push(`${client.display}：已插入渲染器注册（${placement.where}）`)
          }
          catch (error) {
            errors.push(`${client.display}：${(error as Error).message}`)
          }
        }
      }

      if (found === 0) {
        errors.push('各版本目录下未找到 *Client.java，渲染器注册未自动插入（可在界面里手动复制）')
      }
    }
  }

  return {
    merged, errors,
  }
}

export async function POST(request: Request) {
  let body: WriteBody & { action?: unknown }
  try {
    body = await request.json() as WriteBody & { action?: unknown }
  }
  catch {
    return Response.json({
      error: '请求体不是合法 JSON',
    }, {
      status: 400,
    })
  }

  const rawRoot = typeof body.rootPath === 'string' ? body.rootPath.trim() : ''
  if (!rawRoot) {
    return Response.json({
      error: '请先填写模组源码根目录（例如 D:\\yunbei-urban-construction\\versions\\common）',
    }, {
      status: 400,
    })
  }
  if (!path.isAbsolute(rawRoot)) {
    return Response.json({
      error: `需要绝对路径，收到的是「${rawRoot}」。Windows 上形如 ${DEFAULT_MOD_SOURCE_ROOT}`,
    }, {
      status: 400,
    })
  }

  const root = path.resolve(rawRoot)
  if (body.action === 'probe') {
    return probe(root, stringArray(body.packageSegments))
  }
  return writeFiles(root, body)
}
