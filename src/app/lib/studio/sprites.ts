/**
 * 内置贴图资源库。
 *
 * 目录数据（627 张贴图 / 12 个分组）由 `scripts/gen-texture-catalog.mjs`
 * 从模组真实素材生成，见 `./texture-catalog`。
 * 这里只负责把它包装成「图案库」需要的形状：把文件名拼成 `logo(...)` 用的
 * 完整资源路径，并给出可直接 `<img>` 的缩略图 URL。
 */

import type {
  LayoutFieldOption,
} from './layout-model'
import {
  LINE_FONT_OPTIONS,
} from './layout-model'
import {
  DYNAMIC_OPTION_GROUPS, DYNAMIC_TEXTURES, defaultTextureFile,
} from './dynamic-textures'
import {
  TEXTURE_GROUPS, TEXTURE_PUBLIC_DIR,
} from './texture-catalog'

/** 资源库条目 */
export interface SpriteItem extends LayoutFieldOption {
  /** 缩略图 URL（内置贴图）；动态占位符条目为 `null` */
  thumb: string | null
  /** 内置贴图文件名；动态占位符条目为 `null` */
  file: string | null
  /** 占位符路径时，说明它依赖哪个字段 */
  requires?: string
}

export interface SpriteGroup {
  key: string
  title: string
  hint: string
  items: SpriteItem[]
}

/** 路径前缀：模组里 logo(...) 一律用完整资源路径（含 textures/ 段） */
export const SIGN_TEXTURE_PREFIX = 'yunbeiuc:textures/block/sign/'

/** 贴图静态目录（本站） */
export { TEXTURE_PUBLIC_DIR }

/** 贴图静态目录里的文件 → 完整资源路径 */
export function texturePathOf(file: string): string {
  return `${SIGN_TEXTURE_PREFIX}${file}`
}

/**
 * 动态贴图（路径里带 `{占位符}`）。
 *
 * 模板与选项组来自 `./dynamic-textures`，那里逐条复刻了模组各实体的
 * `getFieldOptions`。选中这类贴图时工坊会自动补一个 enum 字段，
 * 画布也会按字段值换成真实 PNG 显示。
 *
 * 缩略图用「选项组默认值」把占位符填满，所以这里也能显示真实 PNG ——
 * 例如 `sign_expressway_{logo1}.png` 默认显示 `sign_expressway_national_logo_1.png`。
 */
const DYNAMIC_GROUP: SpriteGroup = {
  key: 'dynamic',
  title: '动态贴图',
  hint: '纹理段由同名字段切换（{logo1} / {dir1} / {arrow1} …）。选中后会自动补一个 enum 字段，并显示对应图片。',
  items: DYNAMIC_TEXTURES.map(entry => {
    const preview = defaultTextureFile(entry)
    return {
      label: entry.label,
      value: texturePathOf(entry.file),
      thumb: preview ? `${TEXTURE_PUBLIC_DIR}/${preview}` : null,
      file: preview,
      requires: entry.keys[0],
    }
  }),
}

/**
 * 贴图库分组：真实 PNG 缩略图 + 动态占位符条目。
 *
 * 分组顺序与模组「图案」标签页一致（基本图案 → 底图 → 禁令 → 指示 →
 * 警告 → 指路×4 → 旅游区 → 告示 → 辅助），最后是动态贴图。
 */
export const SPRITE_GROUPS: readonly SpriteGroup[] = [
  ...TEXTURE_GROUPS.map<SpriteGroup>(group => ({
    key: group.key,
    title: group.title,
    hint: group.hint,
    items: group.items.map(item => ({
      label: item.label,
      value: texturePathOf(item.file),
      thumb: `${TEXTURE_PUBLIC_DIR}/${item.file}`,
      file: item.file,
    })),
  })),
  DYNAMIC_GROUP,
]

/** 贴图总数（不含动态条目） */
export const SPRITE_TOTAL = TEXTURE_GROUPS.reduce((sum, group) => sum + group.items.length, 0)

/**
 * 常用字段选项预设（`FieldPanel` 里「载入内置选项预设」的按钮）。
 *
 * 前六组直接来自 `./dynamic-textures` 的 `DYNAMIC_OPTION_GROUPS`
 * —— 也就是模组各实体 `getFieldOptions` 的真实枚举，**唯一来源**，
 * 这里不再重复写一遍（以前两处各写一份，`底色` 的值还对不上）。
 * 末尾两条是纯文本占位符的枚举，模组里没有对应贴图，单独列在这里。
 *
 * ⚠️ 选项 `value` 是**直通**的（生成代码里 `getPlaceholderValue` 原样返回），
 * 所以「单位」给的是 `km` / `m`，而不是模组内部的枚举名 `kilometre` / `metre`。
 */
export const FIELD_OPTION_PRESETS: readonly { key: string, title: string, options: LayoutFieldOption[] }[] = [
  ...DYNAMIC_OPTION_GROUPS.map(group => ({
    key: group.id,
    title: group.title,
    options: group.options,
  })),
  {
    key: 'distanceUnit',
    title: '单位',
    options: [
      { label: '公里（km）', value: 'km' },
      { label: '米（m）', value: 'm' },
    ],
  },
  {
    key: 'roadKind',
    title: '道路类型',
    options: [
      { label: '高速公路', value: 'expressway' },
      { label: '普通公路', value: 'ordinary_municipal' },
    ],
  },
]

/**
 * 括号内字体选项（helper 第 6 个参数 / `TextLineData.abcFont`）。
 *
 * **只有交通字体 A / B / C 三种**。模组「全局字体」里的原版 uniform 与
 * 路牌自适应是**全局模式**，它们作用在这个 a/b/c 之上，不是每行可选项。
 * 唯一来源是 `layout-model.ts` 的 `LINE_FONT_OPTIONS`。
 */
export const ABC_FONT_OPTIONS = LINE_FONT_OPTIONS.map(item => ({
  value: item.value,
  label: item.label,
}))

/** 牌面尺寸预设（bit） */
export const SIZE_PRESETS = [
  { width: 16, height: 16, label: '16×16', hint: '1×1 方块' },
  { width: 32, height: 16, label: '32×16', hint: '2×1 方块' },
  { width: 32, height: 20, label: '32×20', hint: '2×1.25 方块' },
  { width: 32, height: 32, label: '32×32', hint: '2×2 方块' },
  { width: 48, height: 24, label: '48×24', hint: '3×1.5 方块' },
  { width: 64, height: 32, label: '64×32', hint: '4×2 方块' },
] as const
