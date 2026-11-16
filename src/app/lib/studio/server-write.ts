/**
 * 本地服务端直写：把生成结果**直接落进本机的模组工程目录**。
 *
 * 为什么不继续用 File System Access API：
 * `window.showDirectoryPicker` 只能在顶层页面、且由用户点击触发时使用，
 * 在 iframe / 预览面板里根本调不起来 —— 表现就是「看不到直接写入文件」。
 * 而工坊本身就是本地 `next dev` 跑起来的，Node 侧天然有写盘权限，
 * 所以改成走一个本地接口：前端把「目标根目录 + 文件清单」POST 过去，
 * 由服务端用 `fs` 写盘，任何浏览器都能用。
 *
 * 目录约定：目标根目录 = 模组工程里**同时含 `src/main/java` 与
 * `src/main/resources`** 的那一层。yunbeiuc 工程里就是
 * `D:\yunbei-urban-construction\versions\common`。
 * 生成文件路径本身就是 `src/main/java/...` / `src/main/resources/...`，
 * 拼在根目录后面即可，不需要再做前缀推断。
 */

/** yunbeiuc 工程的默认源码根目录（可被界面里填的值覆盖） */
export const DEFAULT_MOD_SOURCE_ROOT = 'D:\\yunbei-urban-construction\\versions\\common'

/** 界面里记住上次填的根目录 */
export const MOD_SOURCE_ROOT_STORAGE_KEY = 'sign-generator.studio.mod-source-root.v1'

/**
 * 注册行的默认插入锚点（SignBlocks / MunicipalBlocks）。
 *
 * 生成的新注册行会插在这一行**前面** —— 也就是自定义牌那一组的开头，
 * 而不是落到类末尾的 `init()` 后面。留空则退回「插到 `public static void init()`
 * 之前」，再不行才「插到类末尾」。
 *
 * ⚠️ `MunicipalBlocks` 里没有 `SIGN_CUSTOM_EXPRESSWAY_1` 这个常量，
 * 所以市政分类实际走的是 `init()` 兜底（常量区末尾）。
 */
export const DEFAULT_BLOCK_ANCHOR = 'SIGN_CUSTOM_EXPRESSWAY_1'
/**
 * 实体注册行的默认插入锚点（ModBlockEntities）。
 *
 * 插在 `ZONES_BOARD_1_ENTITY` 那一行**前面**。留空则退回「插到类末尾」。
 */
export const DEFAULT_ENTITY_ANCHOR = 'ZONES_BOARD_1_ENTITY'
/**
 * 物品注册行的默认插入锚点（ModItems）。
 *
 * 插在 `SIGN_CUSTOM_EXPRESSWAY_1` 那一行**前面**（自定义牌那一组的开头）。
 * 留空则退回「插到类末尾」。
 */
export const DEFAULT_ITEM_ANCHOR = 'SIGN_CUSTOM_EXPRESSWAY_1'
/**
 * 语言条目的默认插入锚点。
 *
 * 新条目会插在**第一个键名包含这串文字**的条目之前 —— 默认落在
 * `block.yunbeiuc.sign_custom_expressway_1` 前面，也就是自定义牌那一组的开头，
 * 而不是追加到文件末尾。留空则追加到末尾。
 */
export const DEFAULT_LANG_ANCHOR = 'block.yunbeiuc.sign_custom_expressway_1'
/**
 * 渲染器注册行的默认插入锚点（各版本 `*Client.java`）。
 *
 * 插在含 `ZONES_BOARD_1_ENTITY` 的那一行**前面**（自定义牌渲染器之前）；
 * 留空或在文件里找不到时，退回「第一个
 * `BlockEntityRendererRegistry.register(...)` 那一行之前」。
 */
export const DEFAULT_RENDERER_ANCHOR = 'ZONES_BOARD_1_ENTITY'

/** 界面里记住上次填的插入锚点 */
export const BLOCK_ANCHOR_STORAGE_KEY = 'sign-generator.studio.block-anchor.v1'
/** 默认值改过一次（init() → ZONES_BOARD_1_ENTITY），换键名让新默认值生效 */
export const ENTITY_ANCHOR_STORAGE_KEY = 'sign-generator.studio.entity-anchor.v2'
export const ITEM_ANCHOR_STORAGE_KEY = 'sign-generator.studio.item-anchor.v1'
export const LANG_ANCHOR_STORAGE_KEY = 'sign-generator.studio.lang-anchor.v1'
export const RENDERER_ANCHOR_STORAGE_KEY = 'sign-generator.studio.renderer-anchor.v1'

export interface ServerWriteFile {
  /** 规范路径，例如 `src/main/java/com/beigu/yunbeiuc/block/custom/sign/X.java` */
  path: string
  content: string
  encoding?: 'utf8' | 'base64'
  /**
   * `version`：只写进各版本子目录（`versions/<版本>/common`）；
   * 省略或 `shared`：写进所选源码根目录。
   */
  scope?: 'shared' | 'version'
}

export interface ServerSnippet {
  title: string
  code: string
}

export interface ServerWriteRequest {
  action: 'write'
  rootPath: string
  files: ServerWriteFile[]
  snippets?: ServerSnippet[]
  mergeSnippets?: boolean
  packageSegments: string[]
  category?: 'sign' | 'municipal'
  /** 注册行插到哪一行之前（SignBlocks / MunicipalBlocks） */
  blockAnchor?: string
  /** 注册行插到哪一行之前（ModBlockEntities） */
  entityAnchor?: string
  /** 注册行插到哪一行之前（ModItems） */
  itemAnchor?: string
  /** 语言条目插到哪个键之前 */
  langAnchor?: string
  /** 渲染器注册行插到哪一行之前（各版本 *Client.java） */
  rendererAnchor?: string
}

export interface ServerProbeRequest {
  action: 'probe'
  rootPath: string
  packageSegments?: string[]
}

export interface ServerWriteResult {
  rootPath: string
  written: string[]
  skipped: string[]
  errors: string[]
  merged: string[]
}

export interface ServerProbeResult {
  ok: boolean
  rootPath: string
  message: string
  hasJavaRoot: boolean
  hasResourcesRoot: boolean
  hasSignBlocks: boolean
  hasMunicipalBlocks: boolean
  hasBlockEntities: boolean
}

async function postStudioWrite<T>(payload: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/studio/write', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => null) as (T & { error?: string }) | null
  if (!response.ok) {
    throw new Error(data?.error ?? `请求失败（HTTP ${response.status}）`)
  }
  if (!data) throw new Error('服务端返回了空响应')
  return data
}

/** 检测根目录是否像模组源码根（含 src/main/java 等） */
export function probeModSourceRoot(
  rootPath: string,
  packageSegments: string[] = [],
): Promise<ServerProbeResult> {
  return postStudioWrite<ServerProbeResult>({
    action: 'probe',
    rootPath,
    packageSegments,
  })
}

/** 把生成结果直接写进本机模组目录（并可选插入注册行） */
export function writeFilesViaServer(
  request: Omit<ServerWriteRequest, 'action'>,
): Promise<ServerWriteResult> {
  return postStudioWrite<ServerWriteResult>({
    action: 'write',
    ...request,
  })
}
