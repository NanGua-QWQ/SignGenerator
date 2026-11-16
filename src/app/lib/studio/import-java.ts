/**
 * 把模组现成的方块实体源码「反解析」回版面工程。
 *
 * 模组里每个标志牌的版面都写死在 `<X>Entity.java` 的
 * `ensureDefaultTextLines()` 里，形状非常规整（见下方注释）。
 * 与其让用户照着源码手摆一遍，不如直接读回来 —— 打开 → 微调 → 重新生成，
 * 这样工坊既能「造新牌」，也能「改旧牌」。
 *
 * 支持的语句形态（覆盖仓库里 34 个标志实体全部用到的写法）：
 *
 * ```java
 * lines.add(SignTextLinesHelper.centered("清远", 0f, 4f, 0.0417f, 0xFFFFFF, "a"));
 * lines.add(SignTextLinesHelper.left|right(...));
 * lines.add(SignTextLinesHelper.centeredWithZ("x", x, y, scale, color, zDelta, "b"));
 * lines.add(SignTextLinesHelper.logo("yunbeiuc:textures/block/sign/sign_x.png", x, y, size[, rotZ]));
 * TextLineData line3 = new TextLineData("-rect 36 32");   // 或普通文本
 * line3.setXOffset(0f); … line3.setBuiltin(true);
 * lines.add(line3);
 * ```
 *
 * 解析不出来的东西一律「记一条 warning 然后跳过」，绝不抛异常 —— 用户点开一块
 * 牌子的第一诉求是看到版面，不是看到报错。
 */

import {
  BASEPLATE_PRESETS,
} from './layout-model'
import {
  createField, createLayoutId, createLayoutProject, createLogoElement, createRectElement,
  createTextElement,
} from './project'
import {
  variantDiffPatch,
} from './variant'

import type {
  AbcFont, LayoutAlignment, LayoutElement, LayoutElementKind, LayoutField, LayoutProject,
  VariantOverrideValue,
} from './layout-model'

/** 模组贴图命名空间前缀 */
const SIGN_TEXTURE_PREFIX = 'yunbeiuc:textures/block/sign/'

const VALID_ALIGNMENTS = new Set<string>([
  'LEFT_TOP', 'LEFT_CENTER', 'LEFT_BOTTOM',
  'CENTER_TOP', 'CENTER_CENTER', 'CENTER_BOTTOM',
  'RIGHT_TOP', 'RIGHT_CENTER', 'RIGHT_BOTTOM',
])

/** 一个方块类可能注册成多个方块（= 多个「变体」），这里按注册顺序列出 */
export interface SignRegistration {
  registryId: string
  displayNameZh?: string | null
  displayNameEn?: string | null
}

export interface SignImportOptions {
  /** 方块类名，例如 `SignExpresswayExit1` */
  className: string
  /** 实体源码全文 */
  source: string
  /**
   * 该方块类注册过的**全部**注册名（来自 SignBlocks / MunicipalBlocks 的顺序）。
   *
   * 一个类注册多块牌子在模组里很常见（`SignGuideIntersectionWarning1` 就有 11 个），
   * 它们共用一个实体类，所以天然是一组「变体」。空数组 = 按类名猜一个。
   */
  registrations: SignRegistration[]
  category: 'sign' | 'municipal'
  packageName: string
  modId: string
}

export interface SignImportResult {
  project: LayoutProject
  warnings: string[]
}

// ==================== 词法小工具 ====================

/** 从 `"` 开始跳过字符串字面量，返回结束引号的下标 */
function skipString(source: string, start: number): number {
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index]
    if (char === '\\') {
      index += 1
      continue
    }
    if (char === '"') return index
  }
  return source.length - 1
}

/** 从 `{` 开始配对括号（跳过字符串 / 注释里的花括号），返回块内内容 */
function extractBraceBlock(source: string, start: number): string | null {
  if (source[start] !== '{') return null
  let depth = 0
  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    if (char === '"') {
      index = skipString(source, index)
      continue
    }
    if (char === '/' && source[index + 1] === '/') {
      const newline = source.indexOf('\n', index)
      if (newline < 0) return null
      index = newline
      continue
    }
    if (char === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2)
      if (end < 0) return null
      index = end + 1
      continue
    }
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start + 1, index)
    }
  }
  return null
}

/** 按顶层逗号切参数（跳过括号 / 字符串里的逗号） */
function splitArgs(input: string): string[] {
  const args: string[] = []
  let depth = 0
  let current = ''
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]
    if (char === '"') {
      const end = skipString(input, index)
      current += input.slice(index, end + 1)
      index = end
      continue
    }
    if (char === '(' || char === '[') depth += 1
    if (char === ')' || char === ']') depth -= 1
    if (char === ',' && depth === 0) {
      args.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  if (current.trim() !== '') args.push(current.trim())
  return args
}

/** `"abc"` → `abc`（只去掉最外层引号，反转义常见转义序列） */
function unquote(value: string): string {
  const trimmed = value.trim()
  if (!trimmed.startsWith('"')) return trimmed
  const end = skipString(trimmed, 0)
  const body = trimmed.slice(1, end)
  return body
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

/** 按顶层 `+` 切分字符串表达式（字符串字面量里的加号不算） */
function splitByPlus(value: string): string[] {
  const parts: string[] = []
  let current = ''
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    if (char === '"') {
      const end = skipString(value, index)
      current += value.slice(index, end + 1)
      index = end
      continue
    }
    if (char === '+') {
      parts.push(current)
      current = ''
      continue
    }
    current += char
  }
  parts.push(current)
  return parts
}

/**
 * 字符串字面量 / 字面量拼接 → 字符串。
 *
 * 模组里贴图路径常写成 `".../sign_{" + logoKey + "}.png"`；调用点把参数展开成
 * 字面量之后，这里把几段拼回去，才能得到 `.../sign_{logo1}.png` 并认出占位符。
 */
function readString(value: string): string {
  const parts = splitByPlus(value)
  if (parts.length <= 1) return unquote(value)
  return parts
    .map(part => {
      const text = part.trim()
      return text.startsWith('"') ? unquote(text) : text
    })
    .join('')
}

/** `-10.2f` / `3` / `(float) 1.5` → 数字 */
function readNumber(value: string): number | undefined {
  const cleaned = value
    .replace(/^\(float\)\s*/, '')
    .replace(/[fFdD]$/, '')
    .trim()
  if (cleaned === '') return undefined
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** `0xFFFFFF` → 16777215 */
function readColor(value: string): number | undefined {
  const cleaned = value.trim().replace(/^\(int\)\s*/, '')
  if (!/^0[xX][0-9a-fA-F]+$/.test(cleaned)) {
    const parsed = readNumber(cleaned)
    return parsed === undefined ? undefined : Math.trunc(parsed)
  }
  return Number.parseInt(cleaned.slice(2), 16)
}

function readFont(value: string | undefined): AbcFont {
  const font = value === undefined ? '' : unquote(value).trim()
  return font === 'b' || font === 'c' ? font : 'a'
}

function readAlignment(value: string): LayoutAlignment | undefined {
  const name = value.trim().replace(/^TextAlignment\./, '')
  return VALID_ALIGNMENTS.has(name) ? name as LayoutAlignment : undefined
}

/** `left` / `right` / `centered` → 对齐方式 */
function helperAlignment(factory: string): LayoutAlignment {
  if (factory === 'left') return 'LEFT_CENTER'
  if (factory === 'right') return 'RIGHT_CENTER'
  return 'CENTER_CENTER'
}

// ==================== 实体源码解析 ====================

/** 单个元素解析过程中的原始状态 */
interface RawLine {
  /** 元素种类 */
  kind: 'text' | 'logo' | 'rect'
  /** 文本 / 贴图路径 / `-rect w h` */
  content: string
  x: number
  y: number
  color?: number
  scale?: number
  size?: number
  rotX?: number
  rotY?: number
  rotZ?: number
  zDelta?: number
  alignment?: LayoutAlignment
  abcFont?: AbcFont
  bold?: boolean
  italic?: boolean
  underline?: boolean
  shadow?: boolean
  outline?: boolean
  outlineColor?: number
  glowing?: boolean
  scaleX?: number
  scaleY?: number
  scaleZ?: number
  width?: number
  height?: number
}

/** 可被 `setXxx` 覆盖的字段 */
type RawSetter = (line: RawLine, value: string) => void

const SETTERS: Record<string, RawSetter> = {
  setXOffset: (line, value) => {
    const parsed = readNumber(value)
    if (parsed !== undefined) line.x = parsed
  },
  setYOffset: (line, value) => {
    const parsed = readNumber(value)
    if (parsed !== undefined) line.y = parsed
  },
  setZOffset: (line, value) => {
    const parsed = readNumber(value)
    if (parsed !== undefined) line.zDelta = parsed / 16
  },
  setColor: (line, value) => {
    const parsed = readColor(value)
    if (parsed !== undefined) line.color = parsed
  },
  setAlignment: (line, value) => {
    const parsed = readAlignment(value)
    if (parsed !== undefined) line.alignment = parsed
  },
  setFontSize: (line, value) => {
    const parsed = readNumber(value)
    if (parsed !== undefined) line.scale = parsed / 20
  },
  setAbcFont: (line, value) => {
    line.abcFont = readFont(value)
  },
  setBold: (line, value) => {
    line.bold = value.trim() === 'true'
  },
  setItalic: (line, value) => {
    line.italic = value.trim() === 'true'
  },
  setUnderline: (line, value) => {
    line.underline = value.trim() === 'true'
  },
  setShadow: (line, value) => {
    line.shadow = value.trim() === 'true'
  },
  setOutline: (line, value) => {
    line.outline = value.trim() === 'true'
  },
  setOutlineColor: (line, value) => {
    const parsed = readColor(value)
    if (parsed !== undefined) line.outlineColor = parsed
  },
  setGlowing: (line, value) => {
    line.glowing = value.trim() === 'true'
  },
  setScaleX: (line, value) => {
    const parsed = readNumber(value)
    if (parsed !== undefined) line.scaleX = parsed
  },
  setScaleY: (line, value) => {
    const parsed = readNumber(value)
    if (parsed !== undefined) line.scaleY = parsed
  },
  setScaleZ: (line, value) => {
    const parsed = readNumber(value)
    if (parsed !== undefined) line.scaleZ = parsed
  },
  setRotX: (line, value) => {
    const parsed = readNumber(value)
    if (parsed !== undefined) line.rotX = parsed
  },
  setRotY: (line, value) => {
    const parsed = readNumber(value)
    if (parsed !== undefined) line.rotY = parsed
  },
  setRotZ: (line, value) => {
    const parsed = readNumber(value)
    if (parsed !== undefined) line.rotZ = parsed
  },
}

/** `-rect W H` → 宽高 */
function readRectDirective(text: string): { width: number, height: number } | null {
  const match = /^-rect\s+(-?[\d.]+)\s+(-?[\d.]+)/.exec(text.trim())
  if (!match) return null
  const width = Number(match[1])
  const height = Number(match[2])
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null
  return {
    width,
    height,
  }
}

/**
 * 求值一个「数值表达式」：直接字面量、已声明的变量、或三元表达式。
 *
 * 三元表达式（`direction1 == Right ? -4f : 4f`）**取 true 分支** ——
 * 这是用户定的规则：导入时把「条件成立」的那套坐标当默认值。
 */
function readNumberExpression(
  raw: string,
  variables: Map<string, number>,
): number | undefined {
  const text = raw.trim()
  if (text === '') return undefined

  const direct = readNumber(text)
  if (direct !== undefined) return direct

  const fromVariable = variables.get(text)
  if (fromVariable !== undefined) return fromVariable

  // `cond ? A : B` —— 取 A（true 分支）；允许 A 是变量
  const question = text.indexOf('?')
  if (question >= 0) {
    const rest = text.slice(question + 1)
    // 从右往左找顶层的 `:`，避开嵌套三元
    let depth = 0
    let colon = -1
    for (let index = rest.length - 1; index >= 0; index -= 1) {
      const char = rest[index]
      if (char === ')') depth += 1
      else if (char === '(') depth -= 1
      else if (char === ':' && depth === 0) {
        colon = index
        break
      }
    }
    const whenTrue = colon < 0 ? rest : rest.slice(0, colon)
    return readNumberExpression(whenTrue, variables)
  }

  return undefined
}

/** 方法体里声明的数值变量：`float textX = cond ? -4f : 4f;` → textX: -4 */
function collectNumericVariables(body: string): Map<string, number> {
  const variables = new Map<string, number>()
  const pattern = /(?:float|double|int)\s+(\w+)\s*=\s*([^;]+);/g
  // 两趟：允许变量引用前面声明的变量
  for (let pass = 0; pass < 2; pass += 1) {
    for (const match of body.matchAll(pattern)) {
      if (variables.has(match[1])) continue
      const value = readNumberExpression(match[2], variables)
      if (value !== undefined) variables.set(match[1], value)
    }
  }
  return variables
}

/** `lines.add(SignTextLinesHelper.xxx(...));` 或 `TextLineData x = SignTextLinesHelper.xxx(...)` */
function parseHelperCall(
  statement: string,
  warnings: string[],
  variables: Map<string, number> = new Map(),
): RawLine | null {
  let text = statement.trim()
  const added = /^lines\.add\(\s*([\s\S]*?)\s*\)$/.exec(text)
  if (added) text = added[1].trim()
  const match = /^SignTextLinesHelper\.(\w+)\(([\s\S]*)\)$/.exec(text)
  if (!match) return null
  const factory = match[1]
  const args = splitArgs(match[2])

  /** 坐标可能是变量 / 三元（`float textX = … ? -4f : 4f;`），按 true 分支求值 */
  const readCoordinate = (raw: string | undefined, axis: string): number => {
    const source = (raw ?? '').trim()
    const value = readNumberExpression(source, variables)
    if (value === undefined) {
      warnings.push(`有一行的 ${axis} 坐标是变量表达式（${source}），已按 0 处理，需要手动调`)
      return 0
    }
    if (readNumber(source) === undefined) {
      warnings.push(`${axis} 坐标「${source}」按 true 分支取 ${value}`)
    }
    return value
  }

  if (factory === 'logo') {
    if (args.length < 4) {
      warnings.push('有一条 logo(...) 参数不足，已跳过')
      return null
    }
    const line: RawLine = {
      kind: 'logo',
      content: readString(args[0]),
      x: readCoordinate(args[1], 'x'),
      y: readCoordinate(args[2], 'y'),
      size: readNumber(args[3]) ?? 0.65,
    }
    if (args.length >= 5) line.rotZ = readNumber(args[4]) ?? 0
    return line
  }

  if (factory === 'centered' || factory === 'left' || factory === 'right') {
    if (args.length < 5) {
      warnings.push(`有一条 ${factory}(...) 参数不足，已跳过`)
      return null
    }
    return {
      kind: 'text',
      content: readString(args[0]),
      x: readCoordinate(args[1], 'x'),
      y: readCoordinate(args[2], 'y'),
      scale: readNumber(args[3]) ?? 0.05,
      color: readColor(args[4]) ?? 0xFFFFFF,
      alignment: helperAlignment(factory),
      abcFont: readFont(args[5]),
    }
  }

  if (factory === 'centeredWithZ') {
    if (args.length < 6) {
      warnings.push('有一条 centeredWithZ(...) 参数不足，已跳过')
      return null
    }
    return {
      kind: 'text',
      content: readString(args[0]),
      x: readCoordinate(args[1], 'x'),
      y: readCoordinate(args[2], 'y'),
      scale: readNumber(args[3]) ?? 0.05,
      color: readColor(args[4]) ?? 0xFFFFFF,
      zDelta: readNumber(args[5]) ?? 0,
      alignment: 'CENTER_CENTER',
      abcFont: readFont(args[6]),
    }
  }

  warnings.push(`不认识的 helper 工厂 ${factory}(...)，已跳过`)
  return null
}

/** 把 `ensureDefaultTextLines` 的方法体切成语句（保留原始顺序） */
function splitStatements(body: string): string[] {
  const statements: string[] = []
  let current = ''
  let depth = 0
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index]
    if (char === '"') {
      const end = skipString(body, index)
      current += body.slice(index, end + 1)
      index = end
      continue
    }
    if (char === '{' || char === '(') depth += 1
    if (char === '}' || char === ')') depth -= 1
    current += char
    if (char === ';' && depth === 0) {
      statements.push(current.trim())
      current = ''
    }
  }
  if (current.trim() !== '') statements.push(current.trim())
  return statements
}

/** 从 `open` 指向的括号开始配对，返回闭括号下标（跳过字符串） */
function findMatching(source: string, open: number): number {
  const openChar = source[open]
  const closeChar = openChar === '(' ? ')' : '}'
  let depth = 0
  for (let index = open; index < source.length; index += 1) {
    const char = source[index]
    if (char === '"') {
      index = skipString(source, index)
      continue
    }
    if (char === openChar) depth += 1
    else if (char === closeChar) {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

/**
 * 把 `if (cond) { A } else { B }` 压平成其中一个分支。
 *
 * 模组里有几个实体是「一个类服务多块牌子」，靠方块状态分支（
 * `SignGuideIntersectionAdvanceWarning1` 的 `isWarning2`）。
 * `variantOverrides` 表达不了「看方块决定整块版面」，所以导入时取
 * **else 分支**（= 默认/主版面），并给用户一条提示。
 */
function flattenConditionals(body: string, warnings: string[]): string {
  let text = body
  let flattened = false
  let usedElse = false

  for (let guard = 0; guard < 24; guard += 1) {
    const match = /(?:^|[\s{};])if\s*\(/.exec(text)
    if (!match) break
    const openParen = match.index + match[0].length - 1
    const closeParen = findMatching(text, openParen)
    if (closeParen < 0) break
    const braceIndex = text.indexOf('{', closeParen)
    if (braceIndex < 0 || text.slice(closeParen + 1, braceIndex).trim() !== '') {
      // 没有花括号的条件语句（`if (x) return;`），跳过它
      text = `${text.slice(0, match.index)}\n${text.slice(closeParen + 1)}`
      continue
    }
    const braceEnd = findMatching(text, braceIndex)
    if (braceEnd < 0) break
    const thenBody = text.slice(braceIndex + 1, braceEnd)

    let replacement = thenBody
    let end = braceEnd + 1
    const elseMatch = /^\s*else\s*\{/.exec(text.slice(braceEnd + 1))
    if (elseMatch) {
      // `elseBrace` 指向 `{` 本身（切片从 `}` 之后算起，长度含 `{`）
      const elseBrace = braceEnd + elseMatch[0].length
      const elseEnd = findMatching(text, elseBrace)
      if (elseEnd > 0) {
        replacement = text.slice(elseBrace + 1, elseEnd)
        end = elseEnd + 1
        usedElse = true
      }
    }

    text = `${text.slice(0, match.index)}\n${replacement}\n${text.slice(end)}`
    flattened = true
  }

  if (flattened) {
    warnings.push(usedElse
      ? '版面按方块状态做了 if/else 分支，只导入了 else 分支（默认版面）'
      : '版面里的条件语句只导入了条件成立的分支，请核对导入结果')
  }
  return text
}

/** 工坊生成的 `switch (signVariantId)`：default 分支 + 各 case 分支 */
interface VariantSwitch {
  defaultBody: string
  cases: { registryId: string, body: string }[]
}

/**
 * 解析 `switch (signVariantId) { case "sign_x" -> { … } default -> { … } }`。
 *
 * 这是**工坊自己生成的**多变体分流（模组手写源码不用它），所以导入时必须
 * 把每个 case 也读回来 —— 否则「重新打开刚生成过的牌子」会丢掉变体 2/3 的
 * 覆盖，在编辑器里看着就像「变体 3 又变回基础版面」。
 */
function extractVariantSwitch(body: string): VariantSwitch | null {
  const switchIndex = body.indexOf('switch (signVariantId)')
  if (switchIndex < 0) return null
  const open = body.indexOf('{', switchIndex)
  if (open < 0) return null
  const end = findMatching(body, open)
  if (end < 0) return null
  const inner = body.slice(open + 1, end)

  const cases: { registryId: string, body: string }[] = []
  let defaultBody: string | null = null
  const pattern = /(?:case\s+"([^"]+)"|default)\s*->\s*\{/g
  let match: RegExpExecArray | null = pattern.exec(inner)
  while (match !== null) {
    const brace = match.index + match[0].length - 1
    const close = findMatching(inner, brace)
    if (close < 0) break
    const content = inner.slice(brace + 1, close)
    if (match[1] === undefined) {
      if (defaultBody === null) defaultBody = content
    }
    else {
      cases.push({
        registryId: match[1],
        body: content,
      })
    }
    pattern.lastIndex = close + 1
    match = pattern.exec(inner)
  }

  if (defaultBody === null && cases.length === 0) return null
  return {
    defaultBody: defaultBody ?? '',
    cases,
  }
}

/**
 * 从方法体里取出「基础版式」的语句序列。
 *
 * 里面若还有 `switch (signVariantId)`（调用方没先拆），这里只取 `default` 分支兜底。
 */
function extractBaseStatements(body: string, warnings: string[]): string[] {
  const variantSwitch = extractVariantSwitch(body)
  const source = variantSwitch === null ? body : variantSwitch.defaultBody
  if (variantSwitch !== null && variantSwitch.cases.length > 0) {
    warnings.push('这段版面里还有未展开的变体 switch，只取了 default 分支')
  }
  return splitStatements(flattenConditionals(source, warnings))
}

/** 返回 `List<TextLineData>` 的私有辅助方法（`buildRow(...)` 这类） */
interface LineHelper {
  params: string[]
  body: string
}

function parseLineHelpers(source: string): Map<string, LineHelper> {
  const helpers = new Map<string, LineHelper>()
  const pattern = /private\s+List<TextLineData>\s+(\w+)\s*\(([^)]*)\)\s*\{/g
  for (const match of source.matchAll(pattern)) {
    const brace = (match.index ?? 0) + match[0].length - 1
    const body = extractBraceBlock(source, brace)
    if (body === null) continue
    const params = splitArgs(match[2])
      .map(param => param.trim().split(/\s+/).pop() ?? '')
      .filter(name => name !== '')
    helpers.set(match[1], {
      params,
      body,
    })
  }
  return helpers
}

/** 辅助方法体里把形参名换回调用点的实参文本 */
function substituteParams(
  text: string,
  params: readonly string[],
  args: readonly string[],
): string {
  let out = text
  params.forEach((param, index) => {
    const arg = args[index]
    if (arg === undefined || param === '') return
    out = out.replace(new RegExp(`\\b${param}\\b`, 'g'), arg)
  })
  return out
}

/**
 * 方法体 → 元素表（含只被 setter 描述的行）。
 *
 * `lines.addAll(buildRow(...))` 这种「把几行封装进辅助方法」的写法在模组里很常见，
 * 这里会把辅助方法体按调用点的实参展开后再按同一套规则解析 —— 否则整块版面
 * 会只剩手写的那几行（`SignExpresswayDistanceFromLocation4` 就是三行地名 + 三个 logo 全丢）。
 */
function parseLines(body: string, warnings: string[], source = ''): RawLine[] {
  const helpers = parseLineHelpers(source)

  // 方法体里声明的数值变量（`float textX = cond ? -4f : 4f;`），
  // 供 helper 的坐标参数回查 —— 三元取 **true 分支**。
  const variables = collectNumericVariables(body)

  const lines: RawLine[] = []
  const pending = new Map<string, RawLine>()

  const queue = extractBaseStatements(body, warnings)
    .map(statement => ({ statement, depth: 0 }))

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const { statement: rawStatement, depth } = queue[cursor]
    // `splitStatements` 保留了结尾分号（helper 的正则要吃它），
    // 其余匹配统一在去掉分号的文本上做。
    const statement = rawStatement.trim().replace(/;$/, '').trim()

    // lines.addAll(helper(...)) → 展开辅助方法，语句插回当前位置继续解析
    // ⚠️ 结尾是两个右括号：helper(...) 一个、addAll(...) 一个，参数只到倒数第二个
    const addAll = /^lines\.addAll\(\s*(\w+)\s*\(([\s\S]*)\)\s*\)$/.exec(statement)
    if (addAll) {
      const helper = helpers.get(addAll[1])
      if (!helper) {
        warnings.push(`有一处 lines.addAll(${addAll[1]}(...)) 找不到对应辅助方法，已跳过`)
        continue
      }
      if (depth >= 4) {
        warnings.push(`辅助方法 ${addAll[1]}(...) 嵌套过深，已跳过`)
        continue
      }
      const args = splitArgs(addAll[2])
      if (args.length < helper.params.length) {
        warnings.push(`辅助方法 ${addAll[1]}(...) 的调用参数不足，已按现有参数展开`)
      }
      for (const [name, value] of collectNumericVariables(helper.body)) {
        if (!variables.has(name)) variables.set(name, value)
      }
      const expanded = splitStatements(flattenConditionals(
        substituteParams(helper.body, helper.params, args),
        warnings,
      ))
      queue.splice(cursor + 1, 0, ...expanded.map(item => ({
        statement: item,
        depth: depth + 1,
      })))
      continue
    }

    const helper = parseHelperCall(statement, warnings, variables)
    if (helper) {
      lines.push(helper)
      continue
    }

    // TextLineData name = new TextLineData("...");
    const created = /^TextLineData\s+(\w+)\s*=\s*new\s+TextLineData\((.*)\)$/s.exec(statement)
    if (created) {
      const content = unquote(created[2])
      const rect = readRectDirective(content)
      pending.set(created[1], {
        kind: rect ? 'rect' : 'text',
        content,
        x: 0,
        y: 0,
        ...(rect ? {
          width: rect.width,
          height: rect.height,
        } : {}),
        ...(rect ? {
          color: 0xFFFFFF,
        } : {}),
        alignment: 'CENTER_CENTER',
      })
      continue
    }

    // TextLineData name = SignTextLinesHelper.xxx(...);  ← 后面还会被 setter 修饰
    const assigned = /^TextLineData\s+(\w+)\s*=\s*(SignTextLinesHelper\.[\s\S]*)$/.exec(statement)
    if (assigned) {
      const line = parseHelperCall(assigned[2], warnings, variables)
      if (line) pending.set(assigned[1], line)
      continue
    }

    // name.setXxx(value);
    // lines.add(name);  ← 必须排在通配 setter 之前：
    // `lines.add(baseplate)` 也能被 `^(\w+)\.(\w+)\(...\)` 匹配，
    // 先当成 `lines.add` 处理，否则手工声明的 TextLineData 会被整条丢掉。
    const added = /^lines\.add\(\s*(\w+)\s*\)$/.exec(statement)
    if (added) {
      const line = pending.get(added[1])
      if (line) {
        lines.push(line)
        pending.delete(added[1])
      }
      continue
    }

    // name.setXxx(value);
    const setter = /^(\w+)\.(\w+)\((.*)\)$/s.exec(statement)
    if (setter) {
      const [, name, method, rawValue] = setter
      const line = pending.get(name)
      if (!line) continue
      if (method === 'setBuiltin') continue
      const handler = SETTERS[method]
      if (handler) handler(line, rawValue)
      else warnings.push(`未识别的 setter ${method}(...)，已忽略`)
      continue
    }

    // 其余语句（if (!getTextLines()...) / List<TextLineData> lines = ... / setTextLines）忽略
  }

  return lines
}

/** RawLine → 版面元素 */
function toElement(line: RawLine): LayoutElement {
  if (line.kind === 'logo') {
    const path = line.content.startsWith('yunbeiuc:')
      ? line.content
      : `${SIGN_TEXTURE_PREFIX}${line.content}`
    return createLogoElement({
      id: createLayoutId('logo'),
      name: path.split('/').pop()?.replace(/\.png$/i, '') ?? '贴图',
      path,
      x: line.x,
      y: line.y,
      size: line.size ?? 0.65,
      rotZ: line.rotZ ?? 0,
    })
  }

  if (line.kind === 'rect') {
    const rect = readRectDirective(line.content)
    return createRectElement({
      id: createLayoutId('rect'),
      name: '色块',
      x: line.x,
      y: line.y,
      width: rect?.width ?? line.width ?? 8,
      height: rect?.height ?? line.height ?? 4,
      color: line.color ?? 0xFFFFFF,
    })
  }

  return createTextElement({
    id: createLayoutId('text'),
    name: Array.from(line.content).slice(0, 8).join(''),
    text: line.content,
    x: line.x,
    y: line.y,
    scale: line.scale ?? 0.05,
    color: line.color ?? 0xFFFFFF,
    abcFont: line.abcFont ?? 'a',
    alignment: line.alignment ?? 'CENTER_CENTER',
    bold: line.bold === true,
    italic: line.italic === true,
    underline: line.underline === true,
    shadow: line.shadow === true,
    outline: line.outline === true,
    outlineColor: line.outlineColor ?? 0x000000,
    glowing: line.glowing === true,
    zDelta: line.zDelta ?? 0,
    rotX: line.rotX ?? 0,
    rotY: line.rotY ?? 0,
    rotZ: line.rotZ ?? 0,
    scaleX: line.scaleX ?? 1,
    scaleY: line.scaleY ?? 1,
    scaleZ: line.scaleZ ?? 1,
  })
}

// ==================== 字段解析 ====================

/** 实体里的 Java 字段（`String x = ""` / 枚举 `ArrowDirection d = ArrowDirection.STRAIGHT`） */
interface EntityField {
  name: string
  type: string
  defaultValue: string
  isEnum: boolean
}

function parseEntityFields(source: string): EntityField[] {
  const fields: EntityField[] = []
  // 枚举常量的字符串值：`STRAIGHT("straight")`
  const enumValues = new Map<string, string>()
  for (const match of source.matchAll(/(\w+)\("([^"]*)"\)/g)) {
    enumValues.set(match[1], match[2])
  }

  for (const match of source.matchAll(/private\s+(\w+)\s+(\w+)\s*=\s*([^;]+);/g)) {
    const [, type, name, rawValue] = match
    if (name === '' || type === 'final') continue
    const value = rawValue.trim()
    const isEnum = !type.startsWith('String')
    let defaultValue = ''
    if (isEnum) {
      const constant = value.split('.').pop() ?? ''
      defaultValue = enumValues.get(constant) ?? constant
    }
    else {
      defaultValue = unquote(value)
    }
    fields.push({
      name,
      type,
      defaultValue,
      isEnum,
    })
  }
  return fields
}

/** NBT 键名映射：`nbt.putString("k", this.f)` → f → k */
function parseNbtKeys(source: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const match of source.matchAll(/nbt\.putString\("([^"]+)",\s*this\.(\w+)\)/g)) {
    map.set(match[2], match[1])
  }
  return map
}

/** 占位符 → Java 字段：`case "logo1" -> logo1;` */
function parsePlaceholderFields(
  source: string,
  entityFields: readonly EntityField[] = [],
): Map<string, string> {
  const map = new Map<string, string>()
  for (const match of source.matchAll(/case\s+"([^"]+)"\s*->\s*(\w+)\s*;/g)) {
    map.set(match[1], match[2])
  }

  /*
   * 三元写法：`case "logo1" -> roadType1 == RoadType.ORDINARY_MUNICIPAL ? logoType1 : "";`
   *
   * 取条件成立那一支里出现的实体字段名（`logoType1`），这样字段的默认值才是
   * 模组里真正用的那张图，而不是空串。
   */
  const known = new Set(entityFields.map(field => field.name))
  for (const match of source.matchAll(/case\s+"([^"]+)"\s*->\s*([^;]+);/g)) {
    const key = match[1]
    if (map.has(key)) continue
    const trueBranch = match[2].split('?')[1]?.split(':')[0] ?? ''
    const field = Array.from(trueBranch.matchAll(/\b([a-z]\w*)\b/g))
      .map(item => item[1])
      .find(name => known.has(name))
    if (field) map.set(key, field)
  }
  return map
}

interface OptionFieldInfo {
  title: string
  javaField: string
  options: { label: string, value: string }[]
}

/**
 * `getFieldOptions` → 占位符 → 选项组（标题 / Java 字段 / 选项）。
 *
 * 注意 `case "logo1", "logo2" -> …` 这种**一个分支挂多个占位符**的写法很常见
 * （`SignGuideIntersectionWarning4Entity` 就是），所以 case 标签要按逗号拆开，
 * 每个 key 都登记到同一组选项上。
 */
function parseOptionFields(source: string): Map<string, OptionFieldInfo> {
  const map = new Map<string, OptionFieldInfo>()
  const casePattern = /case\s+((?:"[^"]+"\s*,\s*)*"[^"]+")\s*->\s*List\.of\(new\s+FieldOptionGroup\("([^"]*)",\s*"([^"]*)"/g
  for (const match of source.matchAll(casePattern)) {
    const [full, labels, title, javaField] = match
    const keys = Array.from(labels.matchAll(/"([^"]+)"/g)).map(item => item[1])
    const start = (match.index ?? 0) + full.length
    // ⚠️ 必须只截到**下一个 case** 为止：否则会把后面几个 case 的 opt(...)
    // 全算成这一组的选项（实测箭头牌会从 6 个选项涨到 24 个）。
    const rest = source.slice(start, start + 4000)
    const nextCase = /(?:case\s+"|default\s*->)/.exec(rest)
    const tail = nextCase === null ? rest : rest.slice(0, nextCase.index)
    const options: { label: string, value: string }[] = []
    for (const option of tail.matchAll(/opt\("([^"]*)",\s*"([^"]*)"/g)) {
      options.push({
        label: option[1],
        value: option[2],
      })
    }
    for (const placeholder of keys) {
      map.set(placeholder, {
        title,
        javaField,
        options,
      })
    }
  }
  return map
}

/** 元素里引用到的占位符 key */
function collectPlaceholders(lines: RawLine[], extraTexts: readonly string[] = []): Set<string> {
  const keys = new Set<string>()
  const collect = (source: string) => {
    for (const match of source.matchAll(/\{(\w+)\}/g)) keys.add(match[1])
  }
  for (const line of lines) collect(line.content)
  for (const text of extraTexts) collect(text)
  return keys
}

/**
 * 枚举字段的默认值。
 *
 * 枚举类常常在**别的文件**里（`SignTurnDirection`），本文件只能读到常量名
 * （`SignTurnDirection.STRAIGHT`）。所以先按值精确匹配，再拿常量名去选项值里
 * 找包含关系（`STRAIGHT` → `straight`），都不中才退回第一个选项。
 */
function resolveEnumDefault(
  declaredValue: string | undefined,
  options: { label: string, value: string }[],
): string {
  const declared = typeof declaredValue === 'string' ? declaredValue.trim() : ''
  if (declared !== '') {
    if (options.some(option => option.value === declared)) return declared
    const guess = declared.toLowerCase()
    const exact = options.find(option => option.value.toLowerCase() === guess)
    if (exact) return exact.value
    const partial = options.find(option => option.value.toLowerCase().includes(guess))
    if (partial) return partial.value
  }
  return options[0]?.value ?? ''
}

function buildFields(
  lines: RawLine[],
  entityFields: EntityField[],
  nbtKeys: Map<string, string>,
  placeholderFields: Map<string, string>,
  optionFields: Map<string, OptionFieldInfo>,
  warnings: string[],
  extraTexts: readonly string[] = [],
): LayoutField[] {
  const used = collectPlaceholders(lines, extraTexts)
  const byName = new Map(entityFields.map(field => [field.name, field]))
  const result: LayoutField[] = []
  const seen = new Set<string>()

  // 先按选项组补（它们带类型与中文标题），再补普通字符串字段
  for (const [placeholder, info] of optionFields) {
    if (!used.has(placeholder)) continue
    if (seen.has(placeholder)) continue
    seen.add(placeholder)
    const nbtKey = nbtKeys.get(info.javaField) ?? info.javaField
    const declared = byName.get(info.javaField)
    result.push(createField({
      key: placeholder,
      label: info.title || placeholder,
      nbtKey: nbtKey === placeholder ? '' : nbtKey,
      type: 'enum',
      defaultValue: resolveEnumDefault(declared?.defaultValue, info.options),
      options: info.options.map(option => ({
        label: option.label,
        value: option.value,
      })),
    }))
  }

  for (const placeholder of used) {
    if (seen.has(placeholder)) continue
    seen.add(placeholder)
    const javaField = placeholderFields.get(placeholder) ?? placeholder
    const declared = byName.get(javaField)
    const nbtKey = nbtKeys.get(javaField) ?? javaField
    if (!declared) {
      warnings.push(`占位符 {${placeholder}} 找不到对应字段，已按字符串字段补上`)
    }
    result.push(createField({
      key: placeholder,
      label: placeholder,
      nbtKey: nbtKey === placeholder ? '' : nbtKey,
      defaultValue: declared?.isEnum ? declared.defaultValue : (declared?.defaultValue ?? ''),
      options: declared?.isEnum
        ? [{
            label: declared.defaultValue,
            value: declared.defaultValue,
          }]
        : [],
    }))
  }

  return result
}

// ==================== 对外入口 ====================

/** 从 `ensureDefaultTextLines()` 抽出方法体 */
function extractLayoutBody(source: string): string | null {
  const signature = /private\s+void\s+ensureDefaultTextLines\s*\(\s*\)\s*\{/.exec(source)
  if (!signature) return null
  const braceIndex = (signature.index ?? 0) + signature[0].length - 1
  return extractBraceBlock(source, braceIndex)
}

/** 条件链里的一个分支：`condition` 为空 = 最后的 `else` */
interface LayoutBranch {
  condition: string
  body: string
}

/**
 * 解析 `if (…) {…} else if (…) {…} else {…}` 这条链。
 *
 * 模组里既有两分支（`SignGuideIntersectionWarning4`：4 号 / 5 号），
 * 也有一长串 else-if（`SignGuideIntersectionWarning1`：11 块牌子分 6 组）。
 * 只认「条件后面紧跟花括号」的那种 if —— 方法体开头的
 * `if (!getTextLines().isEmpty()) return;` 没有花括号，会自然被跳过。
 */
function extractConditionalChain(body: string): LayoutBranch[] | null {
  const findIfFrom = (from: number): { condStart: number, condEnd: number, brace: number } | null => {
    const pattern = /(?:^|[\s{};])if\s*\(/g
    pattern.lastIndex = from
    let match: RegExpExecArray | null = pattern.exec(body)
    while (match !== null) {
      const openParen = match.index + match[0].length - 1
      const closeParen = findMatching(body, openParen)
      if (closeParen >= 0) {
        const brace = body.indexOf('{', closeParen)
        if (brace >= 0 && body.slice(closeParen + 1, brace).trim() === '') {
          return {
            condStart: openParen + 1,
            condEnd: closeParen,
            brace,
          }
        }
      }
      match = pattern.exec(body)
    }
    return null
  }

  let cursor = findIfFrom(0)
  if (!cursor) return null
  const branches: LayoutBranch[] = []

  for (let guard = 0; guard < 32; guard += 1) {
    if (!cursor) break
    const blockEnd = findMatching(body, cursor.brace)
    if (blockEnd < 0) break
    branches.push({
      condition: body.slice(cursor.condStart, cursor.condEnd),
      body: body.slice(cursor.brace + 1, blockEnd),
    })

    const after = body.slice(blockEnd + 1)
    const elseIf = /^\s*else\s+if\s*\(/.exec(after)
    if (elseIf) {
      const openParen = blockEnd + 1 + elseIf[0].length - 1
      const closeParen = findMatching(body, openParen)
      if (closeParen < 0) break
      const brace = body.indexOf('{', closeParen)
      if (brace < 0) break
      cursor = {
        condStart: openParen + 1,
        condEnd: closeParen,
        brace,
      }
      continue
    }

    const elseOnly = /^\s*else\s*\{/.exec(after)
    if (elseOnly) {
      const brace = blockEnd + elseOnly[0].length
      const end = findMatching(body, brace)
      if (end > 0) {
        branches.push({
          condition: '',
          body: body.slice(brace + 1, end),
        })
      }
    }
    break
  }

  return branches.length > 0 ? branches : null
}

/** 注册名 → 注册常量名：`sign_guide_intersection_warning_4` → `SIGN_GUIDE_INTERSECTION_WARNING_4` */
function registryIdToConst(registryId: string): string {
  return registryId
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '')
    .toUpperCase()
}

/**
 * 条件表达式 → 它点名的那些牌子的注册常量（可能多个，`||` 连接）。
 *
 * 模组里两种写法都有：
 * - 直接比较：`if (block == SignBlocks.A.get() || block == SignBlocks.B.get())`
 * - 先存布尔：`boolean isWarning4 = ... == SignBlocks.X.get(); ... if (isWarning4)`
 *
 * 第二种必须回查变量声明，否则「条件里没有常量」会让分支张冠李戴。
 */
function resolveConditionConstants(condition: string, body: string): string[] {
  const collect = (source: string) =>
    Array.from(source.matchAll(/(?:SignBlocks|MunicipalBlocks)\.(\w+)/g))
      .map(match => match[1])
  const direct = collect(condition)
  if (direct.length > 0) return direct

  const identifier = /^\s*(\w+)\s*$/.exec(condition)?.[1] ?? ''
  if (identifier === '') return []
  const declaration = new RegExp(`(?:boolean\\s+)?${identifier}\\s*=\\s*[^;]*;`).exec(body)
  return declaration ? collect(declaration[0]) : []
}

/** `isBlockType(...) ? A : B` 形式的数值声明，按条件点名的注册名归到变体 */
interface BlockTernary {
  /** 整条声明在原方法体里的区间（含分号） */
  start: number
  end: number
  type: string
  name: string
  whenTrue: string
  whenFalse: string
  /** 条件点名的注册名对应的变体下标 */
  targets: number[]
}

/**
 * 收集方法体里「按方块类型取不同数值」的三元声明。
 *
 * 模组手写实体常用 `float x = isBlockType(SignBlocks.X_2) ? -4.5f : 4.5f;`
 * 或先存布尔再三元；这类写法不像 if/else 那样能整段拆分版面，
 * 所以导入时把 false 分支当基础、true 分支写成对应变体的覆盖。
 */
function extractBlockTernaries(body: string, registryIds: readonly string[]): BlockTernary[] {
  const found: BlockTernary[] = []
  const pattern = /(?:float|double|int)\s+(\w+)\s*=\s*([^;\n]+);/g
  for (const match of body.matchAll(pattern)) {
    const expression = match[2]
    const question = topLevelQuestion(expression)
    if (question < 0) continue
    const colon = topLevelColon(expression, question + 1)
    if (colon < 0) continue

    const condition = expression.slice(0, question)
    const constants = resolveConditionConstants(condition, body)
    if (constants.length === 0) continue
    const targets = constants
      .map(name => registryIds.findIndex(registryId => registryIdToConst(registryId) === name.toUpperCase()))
      .filter(index => index >= 0)
    if (targets.length === 0) continue

    const start = match.index ?? 0
    found.push({
      start,
      end: start + match[0].length,
      type: match[0].trim().split(/\s+/)[0],
      name: match[1],
      whenTrue: expression.slice(question + 1, colon).trim(),
      whenFalse: expression.slice(colon + 1).trim(),
      targets: [...new Set(targets)],
    })
  }
  return found
}

/** 表达式中第一个顶层 `?`（跳过括号内的三元） */
function topLevelQuestion(text: string): number {
  let depth = 0
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '(') depth += 1
    else if (char === ')') depth -= 1
    else if (char === '?' && depth === 0) return index
  }
  return -1
}

/** `?` 之后与它配对的顶层 `:` */
function topLevelColon(text: string, from: number): number {
  let depth = 0
  let nested = 0
  for (let index = from; index < text.length; index += 1) {
    const char = text[index]
    if (char === '(') depth += 1
    else if (char === ')') depth -= 1
    else if (char === '?') nested += 1
    else if (char === ':') {
      if (nested > 0) nested -= 1
      else if (depth === 0) return index
    }
  }
  return -1
}

/** 把三元声明展开成字面量：`variantIndex = null` 取 false 分支，指定变体取 true 分支 */
function rewriteBlockTernaries(
  body: string,
  entries: readonly BlockTernary[],
  variantIndex: number | null,
): string {
  let out = body
  for (const entry of [...entries].sort((a, b) => b.start - a.start)) {
    const useTrue = variantIndex !== null && entry.targets.includes(variantIndex)
    const value = useTrue ? entry.whenTrue : entry.whenFalse
    const declaration = `${entry.type} ${entry.name} = ${value};`
    out = out.slice(0, entry.start) + declaration + out.slice(entry.end)
  }
  return out
}

/**
 * 元素**按种类**对齐后算出某个变体的覆盖表。
 *
 * 为什么不是按下标对齐：两个分支的元素数量、顺序经常不一样
 * （`SignGuideIntersectionWarning4` 的 then 是「logo + 一行文字」，
 * else 是「文字 + logo + 4 行占位文字」），按下标会把 logo 和文字错配、
 * 整块版面就丢了。按种类分组后各自按顺序配对，多出来的隐藏/追加。
 */
function applyPairOverrides(
  baseElements: LayoutElement[],
  otherLines: RawLine[],
  variantId: string,
  warnings: string[],
): LayoutElement[] {
  const other = otherLines.map(toElement)
  const set = (element: LayoutElement, patch: Record<string, VariantOverrideValue>) => {
    element.variantOverrides = {
      ...(element.variantOverrides ?? {}),
      [variantId]: {
        ...(element.variantOverrides?.[variantId] ?? {}),
        ...patch,
      },
    }
  }

  const kinds: LayoutElementKind[] = ['rect', 'logo', 'text']
  const extras: LayoutElement[] = []
  let paired = 0
  for (const kind of kinds) {
    const baseOfKind = baseElements.filter(element => element.kind === kind)
    const otherOfKind = other.filter(element => element.kind === kind)
    const common = Math.min(baseOfKind.length, otherOfKind.length)

    for (let index = 0; index < common; index += 1) {
      const base = baseOfKind[index]
      const next = otherOfKind[index]
      // 只写真正不同的字段；基础版式本来就可见时不再重复写 `visible: true`，
      // 否则每个变体都会挂一堆「已覆盖 visible」的空条目。
      const patch = variantDiffPatch(base, next)
      if (base.visible === false) patch.visible = true
      if (Object.keys(patch).length > 0) set(base, patch)
      paired += 1
    }
    for (let index = common; index < baseOfKind.length; index += 1) {
      set(baseOfKind[index], {
        visible: false,
      })
    }
    for (let index = common; index < otherOfKind.length; index += 1) {
      const element: LayoutElement = {
        ...otherOfKind[index],
        id: createLayoutId(kind),
        visible: false,
      }
      set(element, {
        visible: true,
      })
      extras.push(element)
    }
  }

  if (paired === 0) {
    warnings.push('这个变体分支里的元素和基础版式对不上，已只保留基础版面')
  }
  return extras
}
function estimateSize(lines: RawLine[]): { width: number, height: number } {
  let maxX = 0
  let maxY = 0
  for (const line of lines) {
    maxX = Math.max(maxX, Math.abs(line.x))
    maxY = Math.max(maxY, Math.abs(line.y))
  }
  const width = Math.min(128, Math.max(16, Math.round((maxX * 2 + 8) / 2) * 2))
  const height = Math.min(128, Math.max(9, Math.round((maxY * 2 + 8) / 2) * 2))
  return {
    width,
    height,
  }
}

/**
 * 实体源码 → 版面工程。
 *
 * 画布尺寸优先级：`-rect` 指令 > 元素坐标估算。默认把 `-rect` 当成
 * **一个色块元素**导入（而不是 `baseplate`）—— 因为底色现在不参与生成，
 * 只有当成元素才能在重新生成时原样保留那行 `-rect`。
 *
 * 变体：
 * - 一个方块类注册多块牌子（`SignBlocks` 里同一个 `new X(...)` 出现多次）→
 *   全部进 `options.variants`，共用一套版面；
 * - 若实体里有 `if (cond) { A } else { B }`：else 当基础版式，
 *   then 写成**条件里点名那块牌子**对应变体的覆盖（按行对齐）。
 */
export function parseSignEntity(options: SignImportOptions): SignImportResult {
  const warnings: string[] = []
  const body = extractLayoutBody(options.source)
  if (body === null) {
    throw new Error(`${options.className} 里没有 ensureDefaultTextLines()，无法读取版面`)
  }

  // ---- 注册名 → 变体 ----
  let registrations = options.registrations.filter(item => item.registryId.trim() !== '')
  if (registrations.length === 0) {
    const guessed = options.className
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
      .toLowerCase()
    registrations = [{
      registryId: guessed,
    }]
  }
  const variantIds = registrations.map(() => createLayoutId('variant'))

  /** 工坊生成的 `switch (signVariantId)`：default 当基础、每个 case 当一个变体 */
  const variantSwitch = extractVariantSwitch(body)
  const chain = variantSwitch === null ? extractConditionalChain(body) : null
  /**
   * 手写的 `float x = isBlockType(...) ? A : B;`：
   * false 分支当基础、true 分支写进对应变体，避免整块牌子共用一套坐标。
   */
  const ternaries = variantSwitch === null && chain === null
    ? extractBlockTernaries(body, registrations.map(item => item.registryId))
    : []
  /** 最后的 `else` 分支（没有 else 时用第一个分支）当基础版式 */
  const elseBranch = chain === null ? null : chain.find(branch => branch.condition === '') ?? null
  const baseBody = variantSwitch !== null
    ? variantSwitch.defaultBody
    : chain === null
      ? rewriteBlockTernaries(body, ternaries, null)
      : (elseBranch === null ? chain[0].body : elseBranch.body)
  const lines = parseLines(baseBody, warnings, options.source)
  if (lines.length === 0) {
    throw new Error(`${options.className} 的 ensureDefaultTextLines() 里没有可识别的文本行`)
  }

  const baseElements = lines.map(toElement)
  const rectLine = lines.find(line => line.kind === 'rect')
  const rectDirective = rectLine ? readRectDirective(rectLine.content) : null
  const size = rectDirective
    ? {
        width: Math.min(128, Math.max(1, Math.round(rectDirective.width))),
        height: Math.min(128, Math.max(1, Math.round(rectDirective.height))),
      }
    : estimateSize(lines)

  // ---- 变体覆盖：先看工坊的 switch，再看模组的 if/else 分支 ----
  //
  // - `switch (signVariantId)`：工坊生成的，`case "注册名"` 直接就是变体身份；
  // - `if (cond) {…} else {…}`：模组手写的，条件里点名的牌子才吃 then 分支
  //   （`SignGuideIntersectionWarning4` 是 `isWarning4`，搞反就会「4 用 5 的版面」）。
  const extras: LayoutElement[] = []
  const branchTexts: string[] = []
  let applied = 0

  if (variantSwitch !== null) {
    for (const item of variantSwitch.cases) {
      const index = registrations.findIndex(registration =>
        registration.registryId === item.registryId
        || registryIdToConst(registration.registryId) === item.registryId.toUpperCase())
      if (index < 0) {
        warnings.push(`switch 里的变体「${item.registryId}」找不到对应注册名，已跳过`)
        continue
      }
      const branchLines = parseLines(item.body, warnings, options.source)
      if (branchLines.length === 0) continue
      for (const line of branchLines) branchTexts.push(line.content)
      extras.push(...applyPairOverrides(baseElements, branchLines, variantIds[index], warnings))
      applied += 1
    }
    if (applied > 0) {
      warnings.push(`已按 switch 的 ${applied} 个变体分支导入各自覆盖（default = 基础版式）`)
    }
  }
  else if (chain !== null) {
    const branches = chain.filter(branch => branch !== elseBranch)
    for (const branch of branches) {
      const branchLines = parseLines(branch.body, warnings, options.source)
      if (branchLines.length === 0) continue
      for (const line of branchLines) branchTexts.push(line.content)

      const constants = resolveConditionConstants(branch.condition, body)
      const targets = constants
        .map(name => registrations.findIndex(item => registryIdToConst(item.registryId) === name.toUpperCase()))
        .filter(index => index >= 0)

      if (targets.length === 0) {
        warnings.push(`有一段 if 分支没认出对应哪块牌子（条件：${branch.condition.trim()}），已跳过这段版面`)
        continue
      }
      for (const index of new Set(targets)) {
        extras.push(...applyPairOverrides(baseElements, branchLines, variantIds[index], warnings))
        applied += 1
      }
    }
    if (applied > 0) {
      warnings.push(
        `实体里按方块状态分支：else 作为基础版式，其余 ${applied} 处分段版面已作为对应变体的覆盖导入`,
      )
    }
  }
  else if (ternaries.length > 0) {
    // 手写的三元写法：逐块牌子各展开一遍，差异写进该变体的覆盖
    for (let index = 0; index < registrations.length; index += 1) {
      if (!ternaries.some(entry => entry.targets.includes(index))) continue
      const branchLines = parseLines(rewriteBlockTernaries(body, ternaries, index), warnings, options.source)
      if (branchLines.length === 0) continue
      for (const line of branchLines) branchTexts.push(line.content)
      extras.push(...applyPairOverrides(baseElements, branchLines, variantIds[index], warnings))
      applied += 1
    }
    if (applied > 0) {
      warnings.push(
        `实体里按 isBlockType 三元取值：false 分支作为基础版式，其余 ${applied} 个变体已导入各自覆盖`,
      )
    }
  }

  const elements = [...baseElements, ...extras]

  const entityFields = parseEntityFields(options.source)
  const nbtKeys = parseNbtKeys(options.source)
  const placeholderFields = parsePlaceholderFields(options.source, entityFields)
  const optionFields = parseOptionFields(options.source)
  const fields = buildFields(
    lines,
    entityFields,
    nbtKeys,
    placeholderFields,
    optionFields,
    warnings,
    branchTexts,
  )

  const variants = registrations.map((registration, index) => {
    const zh = pickLabel(registration.displayNameZh, options.className, index)
    return {
      id: variantIds[index],
      registryId: sanitizeRegistryId(registration.registryId),
      displayNameZh: zh,
      displayNameEn: pickLabel(registration.displayNameEn, zh, index),
    }
  })

  const base = createLayoutProject(size.width, size.height)
  const preset = BASEPLATE_PRESETS[0]
  const project: LayoutProject = {
    ...base,
    width: size.width,
    height: size.height,
    // 预览底色：用 `-rect` 的颜色，但**不显示**（这一层是真实元素，别再叠一层）
    baseplate: {
      color: rectLine?.color ?? preset.color,
      visible: false,
    },
    options: {
      ...base.options,
      packageName: options.packageName,
      modId: options.modId,
      className: options.className,
      category: options.category,
      displayNameZh: variants[0]?.displayNameZh ?? options.className,
      displayNameEn: variants[0]?.displayNameEn ?? options.className,
      variants,
    },
    elements,
    fields,
  }

  return {
    project,
    // 辅助方法会被多次展开，同一条提示只留一次
    warnings: Array.from(new Set(warnings)),
  }
}

/** 变体显示名：优先用语言文件；没有就在名字后面加序号（多于 1 个变体时） */
function pickLabel(value: string | null | undefined, fallback: string, index: number): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (text !== '') return text
  return index === 0 ? fallback : `${fallback} ${index + 1}`
}

/** 注册名清洗：只留小写字母数字下划线 */
function sanitizeRegistryId(value: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '')
  return cleaned === '' ? 'sign_custom' : cleaned
}
