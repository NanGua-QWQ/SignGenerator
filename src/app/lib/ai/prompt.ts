/**
 * 提示词构建 —— 全部由**代码里的常量**生成，不手写死枚举。
 *
 * 这是本目录最重要的一条约定：牌型、基色、字体、对齐、贴图清单、选项组
 * 都来自 `lib/studio/*` 里那些「唯一事实来源」。以后加了新贴图 / 新基色，
 * 提示词自动跟着变，不会出现「AI 认识的颜色，代码里没有」这类漂移。
 */

import {
  DYNAMIC_OPTION_GROUPS, DYNAMIC_TEXTURES, optionGroupById,
} from '@/lib/studio/dynamic-textures'
import {
  BASEPLATE_PRESETS, LINE_FONT_OPTIONS,
} from '@/lib/studio/layout-model'
import {
  TEXTURE_GROUPS,
} from '@/lib/studio/texture-catalog'

/**
 * 提示词里给出哪些图案分组。
 *
 * 627 张全塞进去要几万 token，既贵又容易让模型分心；真正会用到的只有
 * 「基本图案（箭头）」「底图图案」「指路 · 高速」这几类，
 * 其余（禁令 / 警告 / 旅游区…）靠文字也能正确描述版式。
 */
const PROMPT_TEXTURE_GROUPS = ['basic', 'background', 'guide-expressway'] as const

/** 颜色名清单：与 `apply.ts` 的 `NAMED_COLORS` 一一对应 */
const PROMPT_COLORS = [
  'WHITE（白）',
  'BLACK（黑）',
  'YELLOW（黄）',
  'RED（红）',
  'GREEN（绿）',
  'BLUE（蓝）',
  'ORANGE（橙）',
  'BROWN（棕）',
  'GRAY（灰）',
].join(' | ')

function baseplateSection(): string {
  return BASEPLATE_PRESETS.map((preset) => {
    if (preset.id === 'plain') return '- none：不铺底色（透明）'
    return `- ${preset.id}：${preset.label}（${preset.hint}）`
  }).join('\n')
}

function fontSection(): string {
  return LINE_FONT_OPTIONS
    .map(option => `- ${option.value}：${option.label}（${option.hint}）`)
    .join('\n')
}

function textureSection(): string {
  const lines: string[] = []
  for (const key of PROMPT_TEXTURE_GROUPS) {
    const group = TEXTURE_GROUPS.find(item => item.key === key)
    if (!group) continue
    lines.push(`【${group.title}】`)
    for (const item of group.items) {
      lines.push(`- ${item.file} — ${item.label}`)
    }
  }

  lines.push('【动态模板（可带占位符，运行时由字段决定具体贴图）】')
  for (const entry of DYNAMIC_TEXTURES) {
    const group = optionGroupById(entry.group)
    const values = group
      ? `；${entry.keys.join('/')} 的可选值：${group.options.map(option => option.value).join(' / ')}`
      : ''
    lines.push(`- ${entry.file} — ${entry.label}${values}`)
  }
  return lines.join('\n')
}

/** 选项组说明（让模型知道某个占位符允许哪些值） */
function optionGroupSection(): string {
  return DYNAMIC_OPTION_GROUPS
    .map(group => `- ${group.title}：${group.options.map(option => option.value).join(' / ')}`)
    .join('\n')
}

/**
 * 输出 schema（与 `spec.ts` 的 `AiSpec` 严格对应）。
 *
 * 一个工程可以注册多个**方块变体**（`options.variants`，各有一个注册名），
 * 它们共用同一个方块实体类、按注册名分流各自的文本行 —— 所以「同一块牌子的
 * 几种状态」用 `variants` 表达，而不是让用户手工做几遍。
 */
const SPEC_SCHEMA = `{
  "note": "一句话：这是什么标志、主要信息是什么",
  "displayNameZh": "不超过 12 字的方块名，例如 高速出口预告-清远",
  "aspect": 1.6,
  "baseplate": "expressway",
  "variants": [
    {
      "registryId": "sign_custom_01",
      "nameZh": "第一版（可省）",
      "items": [ …元素… ]
    },
    {
      "registryId": "sign_custom_02",
      "nameZh": "第二版（可省）",
      "items": [ …元素… ]
    }
  ],
  "fields": [
    { "key": "text1", "label": "出口地点", "default": "清远" }
  ]
}
元素（items 里的一项，三种 kind）：
{ "kind": "text", "text": "清远", "x": 0.5, "y": 0.35, "sizePct": 0.3,
  "align": "center", "valign": "middle", "color": "WHITE", "font": "a", "bold": false }
{ "kind": "texture", "texture": "sign_expressway_straight.png", "x": 0.5, "y": 0.14, "sizePct": 0.4 }
{ "kind": "rect", "x": 0.5, "y": 0.62, "widthPct": 0.7, "heightPct": 0.04, "color": "WHITE" }`

let cachedSystemPrompt: string | null = null

/** 系统提示词（缓存：内容只取决于代码常量，一次构建即可） */
export function buildSystemPrompt(): string {
  if (cachedSystemPrompt) return cachedSystemPrompt

  cachedSystemPrompt = `你是「路牌版面工坊」的版面配置助手。用户会发一张中国道路交通标志的照片或截图，
你要读懂这块牌子，输出一份严格符合 schema 的 json，供工坊自动摆出版面。
你不生成代码、不写文件、不输出解释以外的任何内容。

# 输出格式
只输出一个 json 对象：不要 markdown 代码块，不要前后解释，不要注释。
（调用方开了 json 输出模式，所以你的回答必须整体是一个可解析的 json 对象。）

${SPEC_SCHEMA}

# 坐标与尺寸（都是相对值，不要写像素或方块数）
- x / y：0~1 的相对位置，原点在牌面左上角，x 向右、y 向下。元素锚点是元素中心。
- sizePct：文本**行高**（或贴图边长）占牌面高度的比例，取值 0.05 ~ 0.95。
  标题类大字 0.25~0.4，常规信息行 0.12~0.2，小字注释 0.08~0.12。
- widthPct / heightPct：色块的宽 / 高占牌面宽 / 高的比例。
- aspect：牌面宽高比 = 宽 ÷ 高。竖长牌约 0.7，方牌 1.0，横牌 1.4~2.2。

# 枚举（只能取下列值，不要自造）
## baseplate（**只影响画布预览，不会写进代码**）
选它只是为了画布上好判断字色对比；牌面底色由方块模型提供。
${baseplateSection()}

## color
${PROMPT_COLORS}

## font
${fontSection()}

## align / valign
align: left | center | right
valign: top | middle | bottom

# 贴图（texture 只能从下面这些文件名里选）
选不到合适的就**省略这个元素，不要编造文件名** —— 编造出来的路径在游戏里
会把整行指令原文画在牌面上，比没有贴图更糟。

${textureSection()}

动态模板的占位符可选值：
${optionGroupSection()}

# 变体（variants）
- 一个工程可以注册多个方块：同一块牌子在不同状态下的版面各自一份。
- 只给 1 个 variant 就是单状态（最常见）；最多 4 个。
- 多状态时，各变体的 items **按顺序一一对应同一批元素**，只改文字 / 位置 / 颜色 / 字号；
  某个状态少一行就省略那一项（其余项顺序不变），多一行就追加到对应位置。
- 各变体的元素种类（text / texture / rect）顺序必须一致，否则工坊只能把对不上的那个元素隐藏。
- registryId 可选（小写字母数字下划线），不给就自动编号；nameZh 给个能看出区别的中文名。
- fields 是**整个工程共用**的（所有变体共享同一批占位符），不要在每个变体里重复声明。

# 规则
1. 单个变体最多 24 个 items；每行文本不超过 12 个汉字。
2. 会变的内容（地名、出口编号、距离、路线编号）抽成 fields，
   同时在文本里用 {key} 引用（例如 key 为 text1 时，文本写 "清远" 或 "{text1} 2km"）。
   key 只能用小写字母、数字、下划线。
3. 动态模板的占位符默认值必须取自上面列出的可选项。
4. 看不清或没把握的贴图不要猜；宁可只放文字。
5. 版式自上而下、间距均匀，别把元素都堆在同一个位置。
6. 牌面上每一处可见文字都要输出：主地名、出口编号、距离、方向、英文/拼音副行。
7. 如果整块牌子本身就是一张图（例如禁令标志、圆形指示标志），
   用一个 texture 元素放在中心、sizePct 约 0.85~0.95。
8. rect 只用来画真正会出现在牌面上的色块 / 分隔线；**不要用 rect 铺满整块牌子** ——
   牌面底色由方块模型提供，不生成底色，baseplate 只影响画布预览。
9. 判断要不要给多个变体：**只有**照片里明显是同一块牌子的几种不同状态（不同地名组合、
   不同方向、路侧版与门架版）才拆成多个；一张照片表示一个状态时，绝不要为了“多给点”而硬拆。
`
  return cachedSystemPrompt
}

export interface UserPromptInput {
  /** 用户手写的补充要求 */
  hint?: string
  /** 当前画布宽（bit） */
  width: number
  /** 当前画布高（bit） */
  height: number
}

/** 用户消息里的文字块（图片作为独立内容块跟在后面） */
export function buildUserPrompt(input: UserPromptInput): string {
  const hint = input.hint?.trim()
  return [
    '【任务】把这张道路交通标志照片配置成工坊版面，输出 json。',
    `【当前画布】${input.width} × ${input.height} bit（1 bit = 1/16 方块，`
      + `约 ${round(input.width / 16)} × ${round(input.height / 16)} 方块）`,
    `【补充要求】${hint && hint.length > 0 ? hint : '（无）'}`,
  ].join('\n')
}

const round = (value: number) => Math.round(value * 100) / 100

/** 二次修复时的追问（模型第一次没给合格 json 时用） */
export function buildRepairPrompt(problems: string[]): string {
  return [
    '上面的回答不合格：',
    ...problems.map(problem => `- ${problem}`),
    '',
    '请重新输出**只包含**一个 json 对象的回答，不要任何解释、不要代码块。',
    '字段必须与下面 schema 完全一致：',
    SPEC_SCHEMA,
  ].join('\n')
}
