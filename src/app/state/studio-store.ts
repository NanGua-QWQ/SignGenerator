import {
  atom,
} from 'jotai'

import {
  clampSize, cloneProjectAsNew, createField, createLayoutId, createLayoutProject, createLogoElement,
  createOptions, createRectElement, createTextElement,
  ensureFieldsForPath, repairPlaceholders,
} from '@/lib/studio/project'
import {
  saveElementsToStorage, serializeElements, writeClipboardText,
} from '@/lib/studio/clipboard'
import {
  applyVariantOverride, applyVariantOverrides, clearVariantField, clearVariantOverride,
  hasAnyVariantOverride, setVariantFields,
} from '@/lib/studio/variant'

import type {
  LayoutAlignment, LayoutAsset, LayoutBaseplate, LayoutElement, LayoutElementKind,
  LayoutField, LayoutOptions, LayoutProject, LayoutReference, LayoutTextElement,
  VariantOverrideValue,
} from '@/lib/studio/layout-model'
import type { LayoutVariant } from '@/lib/studio/layout-model'

/**
 * 路牌版面工坊状态。
 *
 * 单一 primitive atom 持有整个工程（便于整体序列化 / 导出），
 * 其余全部是派生 atom 与写 atom。
 *
 * 坐标系：单位 bit（1 bit = 1/16 方块），原点在牌面中心，X 向右，Y 向上。
 */

export type StudioTab = 'element' | 'project' | 'field' | 'export'

/** 撤销栈上限 */
const HISTORY_LIMIT = 80
/**
 * 连续改动的合并窗口（毫秒）。
 * 拖拽 / 按住方向键会高频写入，窗口内的改动合并成一步撤销。
 */
const COALESCE_MS = 450

/** 工程的真实存储。不对外暴露 —— 所有写入都要经过 `layoutProjectAtom` 记录历史 */
const baseProjectAtom = atom<LayoutProject>(createLayoutProject())

interface HistoryState {
  past: LayoutProject[]
  future: LayoutProject[]
  /** 上次入栈时间，用于合并连续改动 */
  lastAt: number
}

const historyAtom = atom<HistoryState>({ past: [], future: [], lastAt: 0 })

/**
 * 工程 atom —— 对外唯一读写入口。
 *
 * 读 = 当前工程；写 = 记一步历史后落库。
 * 所以 store 里所有 `set(layoutProjectAtom, next)` 都自动获得撤销能力，
 * 不需要每个写 atom 各写一遍。
 */
export const layoutProjectAtom = atom(
  get => get(baseProjectAtom),
  (get, set, next: LayoutProject) => {
    const current = get(baseProjectAtom)
    if (next === current) return
    const history = get(historyAtom)
    const now = Date.now()
    const merge = now - history.lastAt < COALESCE_MS && history.past.length > 0
    set(historyAtom, {
      past: merge ? history.past : [...history.past, current].slice(-HISTORY_LIMIT),
      future: [],
      lastAt: now,
    })
    set(baseProjectAtom, next)
  },
)

/** 整份替换工程（新建 / 读档 / 导入）：清空撤销栈，不产生撤销步骤 */
export const replaceProjectAtom = atom(null, (_get, set, project: LayoutProject) => {
  set(baseProjectAtom, project)
  set(historyAtom, {
    past: [],
    future: [],
    lastAt: 0,
  })
})

export const studioTabAtom = atom<StudioTab>('element')
/** 多选集合，顺序即选中顺序（最后一个为主选中） */
export const selectedElementIdsAtom = atom<string[]>([])

/** 主选中元素 = 集合最后一个；写入时收缩为单选，兼容既有调用 */
export const selectedElementIdAtom = atom(
  get => get(selectedElementIdsAtom).at(-1) ?? null,
  (_get, set, id: string | null) => set(selectedElementIdsAtom, id ? [id] : []),
)

/** 框选等多选入口 */
export const selectElementsAtom = atom(null, (_get, set, ids: string[]) => {
  set(selectedElementIdsAtom, Array.from(new Set(ids)))
})
export const hoverElementIdAtom = atom<string | null>(null)

// ==================== 方块变体 ====================

/**
 * 当前正在编辑的变体 id。
 *
 * `null` = 基础版式（写 `variantOverrides` 之外的元素本体）。
 * 非空 = 正在给某个变体加覆盖，此时画布显示合并值、
 * 属性面板的编辑写进该变体的覆盖表。
 */
export const activeVariantIdAtom = atom<string | null>(null)

/** 工程里排在第一个的变体 = 基础版式（覆盖它没有意义，因为它就是本体） */
export const baseVariantAtom = atom<LayoutVariant | null>(get => {
  const project = get(layoutProjectAtom)
  return project.options.variants[0] ?? null
})

/** 正在编辑的变体对象（null = 基础版式） */
export const activeVariantAtom = atom<LayoutVariant | null>(get => {
  const id = get(activeVariantIdAtom)
  if (!id) return null
  const project = get(layoutProjectAtom)
  return project.options.variants.find(variant => variant.id === id) ?? null
})

/** 切变体（顺手把选中元素清掉不必要，保留当前选择便于连续对比） */
export const setActiveVariantAtom = atom(null, (get, set, id: string | null) => {
  const project = get(layoutProjectAtom)
  if (id && !project.options.variants.some(variant => variant.id === id)) return
  set(activeVariantIdAtom, id)
  set(revisionAtom, value => value + 1)
})

/** 任一变体是否定义过覆盖（右侧面板用来决定要不要显示变体区块） */
export const hasVariantOverridesAtom = atom(get =>
  get(layoutProjectAtom).elements.some(element => hasAnyVariantOverride(element)))

/** 画布视图状态 —— 不入存档 */
export interface CanvasViewState {
  /** 每 bit 的屏幕像素数 */
  zoom: number
  /** 是否显示网格 */
  showGrid: boolean
  /** 是否显示中心十字轴 */
  showAxes: boolean
  /** 是否把牌面外的区域压暗 */
  maskOutside: boolean
  /** 是否吸附到整数 bit */
  snap: boolean
  /** 是否显示安全边距框（每边 1 bit） */
  showSafeArea: boolean
  /** 预览时替换占位符 */
  previewValues: Record<string, string>
}

/** 默认缩放（像素 / bit）—— 快捷键 0 与「回到中心」都恢复到这个值 */
export const DEFAULT_ZOOM = 14

export const canvasViewAtom = atom<CanvasViewState>({
  zoom: DEFAULT_ZOOM,
  showGrid: true,
  showAxes: true,
  maskOutside: true,
  snap: true,
  showSafeArea: false,
  previewValues: {},
})

/** 当前选中的元素 */
export const selectedElementAtom = atom<LayoutElement | null>(get => {
  const project = get(layoutProjectAtom)
  const id = get(selectedElementIdAtom)
  return project.elements.find(element => element.id === id) ?? null
})

/** 画布/属性面板显示的合并视图：元素的变体覆盖已按当前变体并入 */
export const previewElementsAtom = atom<LayoutElement[]>(get => {
  const project = get(layoutProjectAtom)
  const variantId = get(activeVariantIdAtom)
  return applyVariantOverrides(project.elements, variantId)
})

/**
 * 把 `Partial<LayoutElement>` 收敛成变体覆盖能接的标量子集。
 * 调用方传什么就存什么，白名单与类型校验在 `setVariantFields` 里再做一次。
 */
function scalarPatch(patch: Partial<LayoutElement>): Record<string, VariantOverrideValue> {
  const result: Record<string, VariantOverrideValue> = {}
  for (const [key, value] of Object.entries(patch)) {
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
      result[key] = value
    }
  }
  return result
}

/**
 * 元素写入的落点。
 *
 * - `variantId` 为空 → 写元素本体（基础版式）；
 * - 非空 → 把 `patch` 里的字段写进该变体的覆盖表（本体不动）。
 *
 * 两边的历史 / 撤销都由 `layoutProjectAtom` 统一接管。
 */
function patchElements(
  project: LayoutProject,
  params: { id: string, patch: Partial<LayoutElement>, variantId?: string | null },
): LayoutProject {
  const { id, patch, variantId } = params
  return {
    ...project,
    elements: project.elements.map(element => element.id === id
      ? (variantId
        ? setVariantFields(element, variantId, scalarPatch(patch))
        : { ...element, ...patch } as LayoutElement)
      : element),
  }
}

/** 当前选中的文本元素（非文本时返回 null） */
export const selectedTextElementAtom = atom<LayoutTextElement | null>(get => {
  const element = get(selectedElementAtom)
  return element && element.kind === 'text' ? element : null
})

/** 牌面尺寸（bit） */
export const signSizeAtom = atom(get => {
  const project = get(layoutProjectAtom)
  return {
    width: project.width,
    height: project.height,
  }
})

/** 每次修改自增，供「未保存」提示使用 */
export const revisionAtom = atom(0)

// ==================== 撤销 / 重做 ====================

export const canUndoAtom = atom(get => get(historyAtom).past.length > 0)
export const canRedoAtom = atom(get => get(historyAtom).future.length > 0)

export const undoAtom = atom(null, (get, set) => {
  const history = get(historyAtom)
  if (history.past.length === 0) return
  const previous = history.past[history.past.length - 1]
  set(historyAtom, {
    past: history.past.slice(0, -1),
    future: [get(baseProjectAtom), ...history.future].slice(0, HISTORY_LIMIT),
    lastAt: 0,
  })
  set(baseProjectAtom, previous)
  const id = get(selectedElementIdAtom)
  if (id && !previous.elements.some(element => element.id === id)) {
    set(selectedElementIdAtom, previous.elements[0]?.id ?? null)
  }
  set(revisionAtom, value => value + 1)
})

export const redoAtom = atom(null, (get, set) => {
  const history = get(historyAtom)
  if (history.future.length === 0) return
  const [next, ...future] = history.future
  set(historyAtom, {
    past: [...history.past, get(baseProjectAtom)].slice(-HISTORY_LIMIT),
    future,
    lastAt: 0,
  })
  set(baseProjectAtom, next)
  const id = get(selectedElementIdAtom)
  if (id && !next.elements.some(element => element.id === id)) {
    set(selectedElementIdAtom, next.elements[0]?.id ?? null)
  }
  set(revisionAtom, value => value + 1)
})

// ==================== 元素剪贴板（Ctrl+C / Ctrl+V，跨标签页可用） ====================

/**
 * 内存剪贴板（同标签页内的即时兜底）。
 *
 * 真正的跨页传递走 `lib/studio/clipboard.ts`：系统剪贴板 + localStorage 双通道，
 * 这里只是让「复制完马上粘」这条路径不依赖 async 剪贴板 API。
 */
const clipboardAtom = atom<LayoutElement[] | null>(null)

/** 底部提示条（复制/粘贴/复制项目等一次性反馈） */
export const studioNoticeAtom = atom<string | null>(null)

/**
 * 复制用的「当前状态」快照。
 *
 * 把当前变体的覆盖值并进元素本体，并丢掉覆盖表 —— 复制 / Ctrl+D / 粘贴都以
 * 画布上看到的样子为准，不会因为存的是基础值而让副本变回基础版式的位置。
 */
function flattenForCopy(element: LayoutElement, variantId: string | null): LayoutElement {
  const merged = applyVariantOverride(element, variantId)
  if (!merged.variantOverrides) return merged
  const next: LayoutElement = { ...merged }
  delete next.variantOverrides
  return next
}

/** 复制元素：内存 + 系统剪贴板 + localStorage 兜底 */
export const copyElementAtom = atom(null, (get, set, id: string) => {
  const source = get(baseProjectAtom).elements.find(item => item.id === id)
  if (!source) return
  const element = flattenForCopy(source, get(activeVariantIdAtom))
  const payload = [element]
  set(clipboardAtom, payload)
  const text = serializeElements(payload)
  saveElementsToStorage(text)
  void writeClipboardText(text)
  set(studioNoticeAtom, `已复制「${element.name}」——可在另一个标签页按 Ctrl+V 粘贴`)
})

/** 把一批元素插进当前工程（新 id、略微错位、选中第一个） */
export const insertElementsAtom = atom(null, (get, set, elements: LayoutElement[]) => {
  if (elements.length === 0) return
  const project = get(baseProjectAtom)
  // 粘贴同样落到「当前看到的状态」：外部剪贴板里的覆盖表在这里落成本体值
  const variantId = get(activeVariantIdAtom)
  const copies: LayoutElement[] = elements.map(source => {
    const flat = flattenForCopy(source, variantId)
    return {
      ...flat,
      id: createLayoutId(source.kind),
      name: `${source.name} 副本`,
      x: flat.x + 2,
      y: flat.y - 2,
    }
  })
  set(layoutProjectAtom, {
    ...project,
    elements: [...project.elements, ...copies],
  })
  set(selectedElementIdAtom, copies[0].id)
  set(revisionAtom, value => value + 1)
  set(studioNoticeAtom, copies.length === 1
    ? `已粘贴「${copies[0].name}」`
    : `已粘贴 ${copies.length} 个元素`)
})

/** 同标签页内的快捷粘贴（内存剪贴板） */
export const pasteElementAtom = atom(null, (get, set) => {
  const source = get(clipboardAtom)
  if (!source || source.length === 0) return
  set(insertElementsAtom, source)
})

/** 自增即让画布「回到中心」（快捷键 0 / 工具栏按钮） */
export const recenterAtom = atom(0)

// ==================== 工程级操作 ====================

export const setLayoutProjectAtom = atom(null, (_get, set, project: LayoutProject) => {
  set(replaceProjectAtom, project)
  set(selectedElementIdAtom, project.elements[0]?.id ?? null)
  set(canvasViewAtom, view => ({
    ...view,
    previewValues: {},
  }))
  set(revisionAtom, value => value + 1)
})

export const resetLayoutProjectAtom = atom(null, (_get, set) => {
  const project = createLayoutProject()
  set(replaceProjectAtom, project)
  set(selectedElementIdAtom, project.elements[0]?.id ?? null)
  set(canvasViewAtom, view => ({
    ...view,
    previewValues: {},
  }))
  set(revisionAtom, value => value + 1)
})

/**
 * 一键复制为新项目。
 *
 * 换类名 / 注册名 / 元素与字段 id（`variantOverrides` 的键同步重映射），
 * 版面、尺寸、字段、贴图、参考图原样带走 —— 用来「拿现成一块牌子改一改」，
 * 生成时不会覆盖原来的类。
 *
 * 走 `layoutProjectAtom` 写入而不是 `replaceProjectAtom`：这一步可以 Ctrl+Z 撤回。
 */
export const duplicateProjectAtom = atom(null, (get, set) => {
  const project = get(layoutProjectAtom)
  const cloned = cloneProjectAsNew(project)
  set(layoutProjectAtom, cloned)
  set(selectedElementIdAtom, cloned.elements[0]?.id ?? null)
  set(activeVariantIdAtom, null)
  set(revisionAtom, value => value + 1)
  const registryIds = cloned.options.variants.map(variant => variant.registryId).join(', ')
  set(studioNoticeAtom, `已复制为新项目 ${cloned.options.className}（注册名 ${registryIds}），Ctrl+Z 可撤回`)
})

/** 新建工程：给定牌面尺寸（bit） */
export const setSignSizeAtom = atom(
  null,
  (get, set, size: { width: number; height: number, reset?: boolean }) => {
    const project = get(layoutProjectAtom)
    const width = clampSize(size.width)
    const height = clampSize(size.height)
    if (size.reset) {
      const next = createLayoutProject(width, height)
      set(replaceProjectAtom, next)
      set(selectedElementIdAtom, next.elements[0]?.id ?? null)
      set(canvasViewAtom, view => ({
        ...view,
        previewValues: {},
      }))
    }
    else {
      set(layoutProjectAtom, {
        ...project,
        width,
        height,
      })
    }
    set(revisionAtom, value => value + 1)
  },
)

export const patchOptionsAtom = atom(
  null,
  (get, set, patch: Partial<LayoutOptions>) => {
    const project = get(layoutProjectAtom)
    set(layoutProjectAtom, {
      ...project,
      options: {
        ...project.options,
        ...patch,
      },
    })
    set(revisionAtom, value => value + 1)
  },
)

export const patchBaseplateAtom = atom(
  null,
  (get, set, patch: Partial<LayoutBaseplate>) => {
    const project = get(layoutProjectAtom)
    set(layoutProjectAtom, {
      ...project,
      baseplate: {
        ...project.baseplate,
        ...patch,
      },
    })
    set(revisionAtom, value => value + 1)
  },
)

/** 导入一张图片资源（返回新资源 id，供 logo 元素直接引用） */
export const addAssetAtom = atom(
  null,
  (get, set, asset: Omit<LayoutAsset, 'id'> & { id?: string }) => {
    const project = get(layoutProjectAtom)
    const id = asset.id ?? createLayoutId('asset')
    const next: LayoutAsset = {
      id,
      name: asset.name,
      dataUrl: asset.dataUrl,
      texturePath: asset.texturePath,
      width: asset.width,
      height: asset.height,
    }
    set(layoutProjectAtom, {
      ...project,
      assets: [...(project.assets ?? []), next],
    })
    set(revisionAtom, value => value + 1)
    return id
  },
)

export const removeAssetAtom = atom(
  null,
  (get, set, id: string) => {
    const project = get(layoutProjectAtom)
    set(layoutProjectAtom, {
      ...project,
      assets: (project.assets ?? []).filter(asset => asset.id !== id),
    })
    set(revisionAtom, value => value + 1)
  },
)

export const patchCanvasViewAtom = atom(
  null,
  (get, set, patch: Partial<CanvasViewState>) => {
    const view = get(canvasViewAtom)
    set(canvasViewAtom, {
      ...view,
      ...patch,
    })
  },
)

// ==================== 参考图（描图底图） ====================

/**
 * 设置 / 清除参考图。
 *
 * 参考图只影响画布显示，**不参与代码生成** —— 所以它挂在工程上
 * （跟着导出 JSON 走），但不进 `java.ts` 的任何一个生成器。
 */
export const setReferenceAtom = atom(
  null,
  (get, set, reference: LayoutReference | null) => {
    const project = get(layoutProjectAtom)
    if (project.reference === reference) return
    set(layoutProjectAtom, {
      ...project,
      reference,
    })
    set(revisionAtom, value => value + 1)
  },
)

/** 改参考图的透明度 / 显示 / 适配方式 */
export const patchReferenceAtom = atom(
  null,
  (get, set, patch: Partial<LayoutReference>) => {
    const project = get(layoutProjectAtom)
    if (!project.reference) return
    set(layoutProjectAtom, {
      ...project,
      reference: {
        ...project.reference,
        ...patch,
        // 不透明度永远夹在 0 ~ 1，避免 UI 传入越界值
        opacity: patch.opacity === undefined
          ? project.reference.opacity
          : Math.min(1, Math.max(0, patch.opacity)),
      },
    })
    set(revisionAtom, value => value + 1)
  },
)

export const setPreviewValueAtom = atom(
  null,
  (get, set, params: { key: string, value: string }) => {
    const view = get(canvasViewAtom)
    set(canvasViewAtom, {
      ...view,
      previewValues: {
        ...view.previewValues,
        [params.key]: params.value,
      },
    })
  },
)

// ==================== 元素 ====================

const KIND_TEMPLATES: Record<LayoutElementKind, () => LayoutElement> = {
  text: () => createTextElement(),
  logo: () => createLogoElement(),
  rect: () => createRectElement(),
}

export const addElementAtom = atom(null, (get, set, kind: LayoutElementKind = 'text') => {
  const project = get(layoutProjectAtom)
  const element: LayoutElement = {
    ...KIND_TEMPLATES[kind](),
  }
  let index = project.elements.filter(item => item.kind === kind).length + 1
  element.name = `${element.name} ${index}`
  // 新建元素时立刻把占位符字段补齐：贴图默认路径带 {logo1}，
  // 没有字段就会生成空值，游戏里拼出 sign_expressway_.png
  const { project: next } = repairPlaceholders({
    ...project,
    elements: [...project.elements, element],
  })
  set(layoutProjectAtom, next)
  set(selectedElementIdAtom, element.id)
  set(revisionAtom, value => value + 1)
})

export const updateElementAtom = atom(
  null,
  (get, set, params: { id: string, patch: Partial<LayoutElement>, variantId?: string | null }) => {
    const project = get(layoutProjectAtom)
    const next = patchElements(project, params)
    if (next !== project) set(layoutProjectAtom, next)
    set(revisionAtom, value => value + 1)
  },
)

export const updateTextElementAtom = atom(
  null,
  (get, set, params: { id: string, patch: Partial<LayoutTextElement>, variantId?: string | null }) => {
    const project = get(layoutProjectAtom)
    const next = patchElements(project, {
      id: params.id,
      patch: params.patch as Partial<LayoutElement>,
      variantId: params.variantId,
    })
    if (next !== project) set(layoutProjectAtom, next)
    set(revisionAtom, value => value + 1)
  },
)

/** 拖拽移动：snap 时吸附到整数 bit */
export const moveElementAtom = atom(
  null,
  (get, set, params: { id: string, x: number, y: number, snap?: boolean, variantId?: string | null }) => {
    const project = get(layoutProjectAtom)
    const snap = params.snap ?? true
    const x = snap ? Math.round(params.x) : params.x
    const y = snap ? Math.round(params.y) : params.y
    const next = patchElements(project, {
      id: params.id,
      patch: { x, y },
      variantId: params.variantId,
    })
    if (next !== project) set(layoutProjectAtom, next)
    set(revisionAtom, value => value + 1)
  },
)

/**
 * 缩放（PPT 式拖拽手柄）。
 *
 * 每种元素可缩放的维度不同：
 * - `text`  → `scale`（同时决定宽高，等比）；`scaleX/scaleY` 用于非等比拉伸
 * - `logo`  → `size`（正方形，等比）
 * - `rect`  → `width` / `height`（自由非等比）
 *
 * 传入的 `anchor` 是拖拽时保持不动的那个角（bit 坐标），
 * 用它在缩放后回推新中心，得到「对角固定」的 PPT 手感。
 */
export interface ResizeRequest {
  id: string
  /** 新的元素中心（bit） */
  x: number
  y: number
  /** 文本：新的 scale（已按需求算好） */
  scale?: number
  scaleX?: number
  scaleY?: number
  /** 贴图：新的 size */
  size?: number
  /** 色块：新的宽高（bit） */
  width?: number
  height?: number
  snap?: boolean
  /** 写入落点：空 = 元素本体；变体 id = 写该变体覆盖 */
  variantId?: string | null
}

export const resizeElementAtom = atom(
  null,
  (get, set, params: ResizeRequest) => {
    const project = get(layoutProjectAtom)
    const snap = params.snap ?? true
    const round = (value: number) => (snap ? Math.round(value) : value)
    const patch: Record<string, number | string | boolean> = {
      x: round(params.x),
      y: round(params.y),
    }
    // 按元素类型把目标 scale / size / 宽高 合成进 patch，
    // 再交给 patchElements 决定写本体还是写变体覆盖。
    const element = project.elements.find(item => item.id === params.id)
    if (element?.kind === 'text') {
      if (params.scale !== undefined) patch.scale = Math.max(0.001, params.scale)
      if (params.scaleX !== undefined) patch.scaleX = Math.max(0.05, params.scaleX)
      if (params.scaleY !== undefined) patch.scaleY = Math.max(0.05, params.scaleY)
    }
    else if (element?.kind === 'logo') {
      if (params.size !== undefined) patch.size = Math.max(0.05, params.size)
    }
    else if (element?.kind === 'rect') {
      const dimension = (value: number) => {
        const next = snap ? Math.round(value) : Math.round(value * 100) / 100
        return Math.max(snap ? 1 : 0.5, next)
      }
      if (params.width !== undefined) patch.width = dimension(params.width)
      if (params.height !== undefined) patch.height = dimension(params.height)
    }
    const next = patchElements(project, {
      id: params.id,
      patch,
      variantId: params.variantId,
    })
    if (next !== project) set(layoutProjectAtom, next)
    set(revisionAtom, value => value + 1)
  },
)

export const removeElementAtom = atom(null, (get, set, id: string) => {
  const project = get(layoutProjectAtom)
  const elements = project.elements.filter(element => element.id !== id)
  set(layoutProjectAtom, {
    ...project,
    elements,
  })
  if (get(selectedElementIdAtom) === id) set(selectedElementIdAtom, elements[0]?.id ?? null)
  set(revisionAtom, value => value + 1)
})

export const duplicateElementAtom = atom(null, (get, set, id: string) => {
  const project = get(layoutProjectAtom)
  const index = project.elements.findIndex(element => element.id === id)
  if (index < 0) return
  // Ctrl+D 也是「复制当前看到的状态」，变体里的位置/字号一并带过去
  const source = flattenForCopy(project.elements[index], get(activeVariantIdAtom))
  const copy: LayoutElement = {
    ...source,
    id: createLayoutId('el'),
    name: `${source.name} 副本`,
    y: source.y - 10,
  }
  const elements = [...project.elements]
  elements.splice(index + 1, 0, copy)
  set(layoutProjectAtom, {
    ...project,
    elements,
  })
  set(selectedElementIdAtom, copy.id)
  set(revisionAtom, value => value + 1)
})

/** 调整图层顺序：delta = -1 上移一层（越晚 add 越上层），+1 下移一层 */
export const moveElementLayerAtom = atom(
  null,
  (get, set, params: { id: string, delta: number }) => {
    const project = get(layoutProjectAtom)
    const index = project.elements.findIndex(element => element.id === params.id)
    const target = index + params.delta
    if (index < 0 || target < 0 || target >= project.elements.length) return
    const elements = [...project.elements]
    const [element] = elements.splice(index, 1)
    elements.splice(target, 0, element)
    set(layoutProjectAtom, {
      ...project,
      elements,
    })
    set(revisionAtom, value => value + 1)
  },
)

export const setElementAlignmentAtom = atom(
  null,
  (get, set, params: { id: string, alignment: LayoutAlignment, variantId?: string | null }) => {
    const project = get(layoutProjectAtom)
    const next = patchElements(project, {
      id: params.id,
      patch: { alignment: params.alignment } as Partial<LayoutElement>,
      variantId: params.variantId,
    })
    if (next !== project) set(layoutProjectAtom, next)
    set(revisionAtom, value => value + 1)
  },
)

// ==================== 变体覆盖（元素 → 变体） ====================

/**
 * 关闭某元素在某变体下的覆盖（整组删除，退回基础值）。
 *
 * 没有「开启覆盖」这个动作：覆盖表里只存**被显式改过的字段**，
 * 所以在某个变体下改一次参数就等于给它开了覆盖，无需先点开关。
 */
export const disableVariantOverrideAtom = atom(
  null,
  (get, set, params: { id: string, variantId: string }) => {
    const project = get(layoutProjectAtom)
    const next: LayoutProject = {
      ...project,
      elements: project.elements.map(element => element.id === params.id
        ? clearVariantOverride(element, params.variantId)
        : element),
    }
    if (next !== project) set(layoutProjectAtom, next)
    set(revisionAtom, value => value + 1)
  },
)

/**
 * 撤销某元素在某变体下的单个字段覆盖。
 *
 * 面板上每个「已覆盖」chip 点一下就退这一项，其余覆盖保留。
 */
export const clearVariantFieldAtom = atom(
  null,
  (get, set, params: { id: string, variantId: string, key: string }) => {
    const project = get(layoutProjectAtom)
    const next: LayoutProject = {
      ...project,
      elements: project.elements.map(element => element.id === params.id
        ? clearVariantField(element, params.variantId, params.key)
        : element),
    }
    if (next !== project) set(layoutProjectAtom, next)
    set(revisionAtom, value => value + 1)
  },
)

// ==================== 数据字段（占位符） ====================

export const addFieldAtom = atom(null, (get, set) => {
  const project = get(layoutProjectAtom)
  const index = project.fields.length + 1
  const field = createField({
    key: `text${index}`,
    label: `文本 ${index}`,
  })
  set(layoutProjectAtom, {
    ...project,
    fields: [...project.fields, field],
  })
  set(revisionAtom, value => value + 1)
})

/**
 * 选中动态贴图时，给路径里**缺失**的占位符自动补上对应的 enum 字段。
 *
 * 「动态贴图」= 路径里带 `{占位符}`（`sign_expressway_{logo1}.png` 之类）。
 * 这些占位符在模组里由实体内部的一个枚举决定，工坊的目录
 * （`lib/studio/dynamic-textures.ts`，逐条抄自各 `*Entity#getFieldOptions`）
 * 知道该用哪一组选项，这里就按它建字段：
 *
 * - `type: 'enum'`、选项就是那组枚举、默认值取组的 default
 *   （保证画布立刻能解析成真实贴图）；
 * - `nbtKey` 填**模组实体里真正的字段名**（`{logo1}` → `direction1` / `logoType1`，
 *   `{logo}` → `image`），这样生成的实体能直接读模组既有存档。
 *
 * 已经存在的字段一律不动（用户可能已经改过选项）。
 */
export const ensureDynamicFieldsAtom = atom(null, (get, set, path: string) => {
  const project = get(layoutProjectAtom)
  const { fields } = ensureFieldsForPath(path, project.fields)
  const changed = fields.length !== project.fields.length
    || fields.some((field, index) => field !== project.fields[index])
  if (!changed) return
  set(layoutProjectAtom, { ...project, fields })
  set(revisionAtom, value => value + 1)
})

export const updateFieldAtom = atom(
  null,
  (get, set, params: { id: string, patch: Partial<LayoutField> }) => {
    const project = get(layoutProjectAtom)
    const previous = project.fields.find(field => field.id === params.id)
    const fields = project.fields.map(field => field.id === params.id
      ? {
          ...field,
          ...params.patch,
        }
      : field)
    // 字段 key 改名时同步更新文本行 / 贴图路径里的占位符
    const renamed = params.patch.key !== undefined && previous && previous.key !== params.patch.key
    const elements = renamed && previous
      ? project.elements.map(element => replacePlaceholderKey(element, previous.key, params.patch.key as string))
      : project.elements
    set(layoutProjectAtom, {
      ...project,
      fields,
      elements,
    })
    set(revisionAtom, value => value + 1)
  },
)

export const removeFieldAtom = atom(null, (get, set, id: string) => {
  const project = get(layoutProjectAtom)
  const previous = project.fields.find(field => field.id === id)
  set(layoutProjectAtom, {
    ...project,
    fields: project.fields.filter(field => field.id !== id),
    elements: previous
      ? project.elements.map(element => replacePlaceholderKey(element, previous.key, ''))
      : project.elements,
  })
  set(revisionAtom, value => value + 1)
})

export const addFieldOptionAtom = atom(null, (get, set, fieldId: string) => {
  const project = get(layoutProjectAtom)
  set(layoutProjectAtom, {
    ...project,
    fields: project.fields.map(field => field.id === fieldId
      ? {
          ...field,
          options: [...field.options, {
            label: '新选项',
            value: 'new',
          }],
        }
      : field),
  })
  set(revisionAtom, value => value + 1)
})

export const removeFieldOptionAtom = atom(
  null,
  (get, set, params: { fieldId: string, index: number }) => {
    const project = get(layoutProjectAtom)
    set(layoutProjectAtom, {
      ...project,
      fields: project.fields.map(field => field.id === params.fieldId
        ? {
            ...field,
            options: field.options.filter((_, index) => index !== params.index),
          }
        : field),
    })
    set(revisionAtom, value => value + 1)
  },
)

export const updateFieldOptionsAtom = atom(
  null,
  (get, set, params: { fieldId: string, options: LayoutField['options'] }) => {
    const project = get(layoutProjectAtom)
    set(layoutProjectAtom, {
      ...project,
      fields: project.fields.map(field => field.id === params.fieldId
        ? {
            ...field,
            options: params.options,
          }
        : field),
    })
    set(revisionAtom, value => value + 1)
  },
)

/** 把元素里所有 `{oldKey}` 替换成 `{newKey}`（newKey 为空则删除占位符） */
function replacePlaceholderKey(element: LayoutElement, oldKey: string, newKey: string): LayoutElement {
  const token = `{${oldKey}}`
  const replacement = newKey ? `{${newKey}}` : ''
  if (element.kind === 'text') {
    return {
      ...element,
      text: element.text.split(token).join(replacement),
    }
  }
  if (element.kind === 'logo') {
    return {
      ...element,
      path: element.path.split(token).join(replacement),
    }
  }
  return element
}

// 保留旧名字，防止遗留引用直接报错
export { createOptions }
