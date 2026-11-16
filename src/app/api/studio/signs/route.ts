/**
 * 模组标牌库：扫描本地模组工程里的标志方块，并把它们的版面读回工坊。
 *
 * - `GET /api/studio/signs?root=...`            → 列表（名字 / 类名 / 注册名 / 元素数）
 * - `GET /api/studio/signs?root=...&open=类名`  → 该标牌的完整版面工程
 *
 * 只读：不写任何文件。落点校验与 `/api/studio/write` 一致（必须绝对路径）。
 */

import {
  promises as fs,
} from 'node:fs'
import path from 'node:path'

import {
  parseSignEntity,
} from '@/lib/studio/import-java'
import {
  DEFAULT_MOD_SOURCE_ROOT,
} from '@/lib/studio/server-write'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_PACKAGE = 'com.beigu.yunbeiuc'
const DEFAULT_MOD_ID = 'yunbeiuc'

interface BlockRegistration {
  registryId: string
  category: 'sign' | 'municipal'
}

interface SignEntry {
  className: string
  entityClass: string
  /** 第一个注册名（列表主标题用） */
  registryId: string | null
  /** 该方块类注册过的全部注册名 = 变体列表 */
  variants: string[]
  variantCount: number
  displayNameZh: string | null
  displayNameEn: string | null
  elementCount: number
  fieldCount: number
  width: number
  height: number
  modifiedAt: number
}

function errorResponse(status: number, message: string): Response {
  return Response.json({
    ok: false,
    error: message,
  }, {
    status,
  })
}

function stringParam(url: URL, key: string, fallback: string): string {
  const value = url.searchParams.get(key)
  return value === null || value.trim() === '' ? fallback : value.trim()
}

async function readText(target: string): Promise<string | null> {
  try {
    return await fs.readFile(target, 'utf8')
  }
  catch {
    return null
  }
}

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await fs.stat(target)).isDirectory()
  }
  catch {
    return false
  }
}

/**
 * 从 `SignBlocks.java` / `MunicipalBlocks.java` 里抽出
 * 「方块类名 → 全部注册名」的映射。
 *
 * ⚠️ 一个方块类经常注册成多个方块（`SignGuideIntersectionWarning1` 就有 11 个），
 * 它们共用一个实体、共用一套版面 —— 在工坊里这就是「方块变体」，
 * 所以这里必须**保留每一条**，不能只留第一个。
 */
function parseRegistrations(source: string, category: 'sign' | 'municipal'): Map<string, BlockRegistration[]> {
  const map = new Map<string, BlockRegistration[]>()
  const pattern = /register\(\s*(?:BLOCKS\s*,\s*)?"([a-z0-9_]+)"[\s\S]{0,400}?new\s+(\w+)\s*\(/g
  for (const match of source.matchAll(pattern)) {
    const [, registryId, className] = match
    const list = map.get(className) ?? []
    if (!list.some(item => item.registryId === registryId)) {
      list.push({
        registryId,
        category,
      })
    }
    map.set(className, list)
  }
  return map
}

/** 语言文件里的 `block.<modId>.<registryId>` → 显示名 */
function parseLang(source: string | null, modId: string): Map<string, string> {
  const map = new Map<string, string>()
  if (source === null) return map
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  }
  catch {
    return map
  }
  if (parsed === null || typeof parsed !== 'object') return map
  const prefix = `block.${modId}.`
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!key.startsWith(prefix) || typeof value !== 'string') continue
    map.set(key.slice(prefix.length), value)
  }
  return map
}

/** 方块类名 → 候选实体类名（`SignSimpleBlock` 与 `SignExpresswayExit1` 两种情况） */
function entityCandidates(className: string): string[] {
  const stripped = className.replace(/Block$/, '')
  return stripped === className
    ? [`${className}Entity`]
    : [`${className}Entity`, `${stripped}Entity`]
}

async function resolveRoot(url: URL): Promise<{ root: string, pkg: string, modId: string } | { error: Response }> {
  const rawRoot = stringParam(url, 'root', DEFAULT_MOD_SOURCE_ROOT)
  if (!path.isAbsolute(rawRoot)) {
    return {
      error: errorResponse(400, `需要绝对路径，收到的是「${rawRoot}」`),
    }
  }
  const root = path.resolve(rawRoot)
  if (!await isDirectory(root)) {
    return {
      error: errorResponse(400, `目录不存在：${root}`),
    }
  }
  return {
    root,
    pkg: stringParam(url, 'pkg', DEFAULT_PACKAGE),
    modId: stringParam(url, 'modId', DEFAULT_MOD_ID),
  }
}

async function listSigns(root: string, pkg: string, modId: string): Promise<{
  signs: SignEntry[]
  warnings: string[]
}> {
  const warnings: string[] = []
  const javaRoot = path.join(root, 'src', 'main', 'java', ...pkg.split('.'))
  const signDir = path.join(javaRoot, 'block', 'custom', 'sign')
  const entityDir = path.join(javaRoot, 'entity')
  if (!await isDirectory(signDir)) {
    throw new Error(`没找到 ${signDir}，确认「模组源码根目录」是不是 versions/common 那一层`)
  }

  const registrations = new Map<string, BlockRegistration[]>()
  for (const [fileName, category] of [['SignBlocks.java', 'sign'], ['MunicipalBlocks.java', 'municipal']] as const) {
    const source = await readText(path.join(javaRoot, 'block', fileName))
    if (source === null) continue
    for (const [className, list] of parseRegistrations(source, category)) {
      const merged = registrations.get(className) ?? []
      for (const item of list) {
        if (!merged.some(existing => existing.registryId === item.registryId)) merged.push(item)
      }
      registrations.set(className, merged)
    }
  }

  const assets = path.join(root, 'src', 'main', 'resources', 'assets', modId, 'lang')
  const nameZh = parseLang(await readText(path.join(assets, 'zh_cn.json')), modId)
  const nameEn = parseLang(await readText(path.join(assets, 'en_us.json')), modId)

  const entries = await fs.readdir(signDir, {
    withFileTypes: true,
  })
  const signs: SignEntry[] = []
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.java')) continue
    const className = entry.name.slice(0, -'.java'.length)
    if (className.startsWith('Abstract') || className.startsWith('Custom')) continue

    const registrationList = registrations.get(className) ?? []
    const registryId = registrationList[0]?.registryId ?? null

    let entityClass: string | null = null
    let entityPath: string | null = null
    for (const candidate of entityCandidates(className)) {
      const target = path.join(entityDir, `${candidate}.java`)
      const text = await readText(target)
      if (text === null) continue
      if (!text.includes('ensureDefaultTextLines')) continue
      entityClass = candidate
      entityPath = target
      break
    }
    if (entityClass === null || entityPath === null) continue

    const source = await readText(entityPath)
    if (source === null) continue

    try {
      const parsed = parseSignEntity({
        className,
        source,
        registrations: registrationList.map(item => ({
          registryId: item.registryId,
          displayNameZh: nameZh.get(item.registryId) ?? null,
          displayNameEn: nameEn.get(item.registryId) ?? null,
        })),
        category: registrationList[0]?.category ?? 'sign',
        packageName: pkg,
        modId,
      })
      const stat = await fs.stat(entityPath).catch(() => null)
      const variantIds = parsed.project.options.variants.map(variant => variant.registryId)
      signs.push({
        className,
        entityClass,
        registryId,
        variants: variantIds,
        variantCount: variantIds.length,
        displayNameZh: parsed.project.options.displayNameZh,
        displayNameEn: parsed.project.options.displayNameEn,
        elementCount: parsed.project.elements.length,
        fieldCount: parsed.project.fields.length,
        width: parsed.project.width,
        height: parsed.project.height,
        modifiedAt: stat?.mtimeMs ?? 0,
      })
    }
    catch (cause) {
      warnings.push(`${className}：${(cause as Error).message}`)
    }
  }

  signs.sort((left, right) => (left.displayNameZh ?? left.className)
    .localeCompare(right.displayNameZh ?? right.className, 'zh-Hans-CN'))
  return {
    signs,
    warnings,
  }
}

async function openSign(
  root: string,
  pkg: string,
  modId: string,
  className: string,
): Promise<Response> {
  const javaRoot = path.join(root, 'src', 'main', 'java', ...pkg.split('.'))
  const entityDir = path.join(javaRoot, 'entity')

  let entityClass: string | null = null
  let source: string | null = null
  for (const candidate of entityCandidates(className)) {
    const text = await readText(path.join(entityDir, `${candidate}.java`))
    if (text === null) continue
    entityClass = candidate
    source = text
    break
  }
  if (source === null || entityClass === null) {
    return errorResponse(404, `找不到 ${className} 对应的方块实体类（entity/ 下没有能解析的布局）`)
  }

  const registrations = new Map<string, BlockRegistration[]>()
  for (const [fileName, category] of [['SignBlocks.java', 'sign'], ['MunicipalBlocks.java', 'municipal']] as const) {
    const text = await readText(path.join(javaRoot, 'block', fileName))
    if (text === null) continue
    for (const [name, list] of parseRegistrations(text, category)) {
      const merged = registrations.get(name) ?? []
      for (const item of list) {
        if (!merged.some(existing => existing.registryId === item.registryId)) merged.push(item)
      }
      registrations.set(name, merged)
    }
  }
  const assets = path.join(root, 'src', 'main', 'resources', 'assets', modId, 'lang')
  const nameZh = parseLang(await readText(path.join(assets, 'zh_cn.json')), modId)
  const nameEn = parseLang(await readText(path.join(assets, 'en_us.json')), modId)

  const registrationList = registrations.get(className) ?? []
  try {
    const parsed = parseSignEntity({
      className,
      source,
      registrations: registrationList.map(item => ({
        registryId: item.registryId,
        displayNameZh: nameZh.get(item.registryId) ?? null,
        displayNameEn: nameEn.get(item.registryId) ?? null,
      })),
      category: registrationList[0]?.category ?? 'sign',
      packageName: pkg,
      modId,
    })
    return Response.json({
      ok: true,
      className,
      entityClass,
      registryId: parsed.project.options.variants[0]?.registryId ?? null,
      variantCount: parsed.project.options.variants.length,
      variants: parsed.project.options.variants.map(variant => variant.registryId),
      project: parsed.project,
      warnings: parsed.warnings,
    })
  }
  catch (cause) {
    return errorResponse(422, (cause as Error).message)
  }
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const resolved = await resolveRoot(url)
  if ('error' in resolved) return resolved.error
  const { root, pkg, modId } = resolved

  const open = url.searchParams.get('open')
  if (open !== null && open.trim() !== '') {
    const className = open.trim().replace(/[^A-Za-z0-9_]/g, '')
    if (className === '') return errorResponse(400, '类名不合法')
    return openSign(root, pkg, modId, className)
  }

  try {
    const result = await listSigns(root, pkg, modId)
    return Response.json({
      ok: true,
      root,
      count: result.signs.length,
      signs: result.signs,
      warnings: result.warnings,
    })
  }
  catch (cause) {
    return errorResponse(500, (cause as Error).message)
  }
}
