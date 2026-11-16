/**
 * 标牌库的前端调用封装（只读扫描本地模组工程）。
 */

import {
  DEFAULT_MOD_SOURCE_ROOT,
} from './server-write'

import type {
  LayoutProject,
} from './layout-model'

export interface SignListEntry {
  className: string
  entityClass: string
  registryId: string | null
  /** 该方块类注册过的全部注册名 = 变体 */
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

export interface SignListSuccess {
  ok: true
  root: string
  count: number
  signs: SignListEntry[]
  warnings: string[]
}

export interface SignOpenSuccess {
  ok: true
  className: string
  entityClass: string
  registryId: string | null
  variantCount: number
  variants: string[]
  project: LayoutProject
  warnings: string[]
}

export interface SignsFailure {
  ok: false
  error: string
}

async function readJson<T>(url: string): Promise<T | SignsFailure> {
  let response: Response
  try {
    response = await fetch(url)
  }
  catch (cause) {
    return {
      ok: false,
      error: `无法连接本地服务：${(cause as Error).message}`,
    }
  }
  let data: unknown = null
  try {
    data = await response.json()
  }
  catch {
    data = null
  }
  if (!response.ok || data === null || typeof data !== 'object') {
    const message = data !== null && typeof data === 'object' && 'error' in data
      && typeof (data as { error?: unknown }).error === 'string'
      ? (data as { error: string }).error
      : `请求失败（HTTP ${response.status}）`
    return {
      ok: false,
      error: message,
    }
  }
  return data as T
}

/** 扫描标牌列表 */
export async function fetchSigns(root: string = DEFAULT_MOD_SOURCE_ROOT): Promise<SignListSuccess | SignsFailure> {
  const query = new URLSearchParams({
    root,
  })
  return readJson<SignListSuccess>(`/api/studio/signs?${query.toString()}`)
}

/** 读取单个标牌的版面工程 */
export async function fetchSign(
  className: string,
  root: string = DEFAULT_MOD_SOURCE_ROOT,
): Promise<SignOpenSuccess | SignsFailure> {
  const query = new URLSearchParams({
    root,
    open: className,
  })
  return readJson<SignOpenSuccess>(`/api/studio/signs?${query.toString()}`)
}
