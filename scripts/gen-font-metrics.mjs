/**
 * 从模组真实 TTF 里抽出「字宽 / 竖直度量」，生成 `src/app/lib/studio/font-metrics.ts`。
 *
 * 为什么必须这么做：
 * - 画布以前用 Minecraft **原版 ASCII 字体**的宽度表（`MC_CHAR_WIDTH`，'1'=6、'i'=2、'M'=6），
 *   但模组的交通字体是 TTF，真实推进宽度完全不一样（`re2014a.ttf`：'1'=3.37、'i'=3.59、'M'=7.26）。
 *   宽度一错，整行的中心就偏，游戏里是居中的、画布上就偏。
 * - 字体 json 里的 `size` / `shift` 也要一起带出来，才能算出基线与 em 大小。
 *
 * 用法：`node scripts/gen-font-metrics.mjs`
 */

import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const fontDir = path.join(root, 'public/fonts/traffic')
const outFile = path.join(root, 'src/app/lib/studio/font-metrics.ts')

/** 模组 assets/yunbeiuc/font/traf_sign_font_{a,b,c}.json 里的 provider 参数 */
const LATIN_PROVIDERS = [
  { key: 'a', file: 're2014a.ttf', size: 10.5, shiftY: 1.5 },
  { key: 'b', file: 'rg2014b.ttf', size: 10.5, shiftY: 1.5 },
  { key: 'c', file: 'rg2014c.ttf', size: 10.5, shiftY: 1.5 },
]
/** 第二个 provider：中文兜底 */
const CJK_PROVIDER = { file: 'misans_semibold.ttf', size: 10.0, shiftY: 1.0 }

/** 交通字体 json 里的 skip：这三段不给拉丁字体，落到 MiSans */
const SKIP_RANGES = [[0x4E00, 0x9FFF], [0x3000, 0x303F], [0xFF00, 0xFFEF]]

function isSkipped(cp) {
  return SKIP_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi)
}

function parseTtf(file) {
  const b = fs.readFileSync(file)
  const numTables = b.readUInt16BE(4)
  const tables = {}
  for (let i = 0; i < numTables; i++) {
    const o = 12 + i * 16
    tables[b.toString('ascii', o, o + 4)] = { offset: b.readUInt32BE(o + 8), length: b.readUInt32BE(o + 12) }
  }
  const unitsPerEm = b.readUInt16BE(tables.head.offset + 18)
  const hhea = tables.hhea.offset
  const ascent = b.readInt16BE(hhea + 4)
  const descent = b.readInt16BE(hhea + 6)
  const numberOfHMetrics = b.readUInt16BE(hhea + 34)
  const hmtx = tables.hmtx.offset
  const advanceOf = gid => b.readUInt16BE(hmtx + Math.min(gid, numberOfHMetrics - 1) * 4)

  // 取 cmap 里 BMP 的子表：优先 format 4，没有就用 format 12（MiSans 只有 12）
  const cmap = tables.cmap.offset
  const count = b.readUInt16BE(cmap + 2)
  const candidates = []
  for (let i = 0; i < count; i++) {
    const o = cmap + 4 + i * 8
    const pid = b.readUInt16BE(o)
    const eid = b.readUInt16BE(o + 2)
    const off = b.readUInt32BE(o + 4)
    if ((pid === 3 && (eid === 1 || eid === 10)) || pid === 0) candidates.push(cmap + off)
  }
  if (candidates.length === 0) throw new Error(`no usable cmap in ${file}`)
  const sub4 = candidates.find(at => b.readUInt16BE(at) === 4)
  const sub12 = candidates.find(at => b.readUInt16BE(at) === 12)
  const sub = sub4 ?? sub12
  if (!sub) throw new Error(`no cmap format 4/12 in ${file}`)

  let glyphId
  if (b.readUInt16BE(sub) === 4) {
    const segCountX2 = b.readUInt16BE(sub + 6)
    const segCount = segCountX2 / 2
    const endO = sub + 14
    const startO = endO + segCountX2 + 2
    const deltaO = startO + segCountX2
    const rangeO = deltaO + segCountX2
    glyphId = cp => {
      for (let i = 0; i < segCount; i++) {
        const end = b.readUInt16BE(endO + i * 2)
        if (cp > end) continue
        const start = b.readUInt16BE(startO + i * 2)
        if (cp < start) return 0
        const delta = b.readInt16BE(deltaO + i * 2)
        const ro = b.readUInt16BE(rangeO + i * 2)
        if (ro === 0) return (cp + delta) & 0xFFFF
        const at = rangeO + i * 2 + ro + (cp - start) * 2
        const g = b.readUInt16BE(at)
        return g === 0 ? 0 : (g + delta) & 0xFFFF
      }
      return 0
    }
  } else {
    const numGroups = b.readUInt32BE(sub + 12)
    const groups = []
    for (let i = 0; i < numGroups; i++) {
      const o = sub + 16 + i * 12
      groups.push([b.readUInt32BE(o), b.readUInt32BE(o + 4), b.readUInt32BE(o + 8)])
    }
    glyphId = cp => {
      for (const [start, end, gid] of groups) {
        if (cp < start) return 0
        if (cp <= end) return gid + (cp - start)
      }
      return 0
    }
  }

  return { unitsPerEm, ascent, descent, glyphId, advanceOf }
}

// ==================== 拉丁字体：逐码位字宽 ====================

const latin = LATIN_PROVIDERS.map(provider => {
  const font = parseTtf(path.join(fontDir, provider.file))
  const advances = new Map()
  for (let cp = 0; cp <= 0xFFFF; cp++) {
    if (isSkipped(cp)) continue
    const gid = font.glyphId(cp)
    if (gid === 0) continue
    advances.set(cp, font.advanceOf(gid))
  }
  return { ...provider, ...font, advances }
})

// 三套字体覆盖的码位不完全一致（rg2014c 缺 ²³¹），取并集；
// 缺的那个字体里记 -1，运行时回退到中文 provider 的字宽（与游戏里字体回退一致）
const codepoints = [...new Set(latin.flatMap(font => [...font.advances.keys()]))].sort((a, b) => a - b)
const gaps = latin.map(font => `${font.key} 缺 ${codepoints.filter(cp => !font.advances.has(cp)).length}`)

// ==================== 中文兜底：只取全角标点那两段 ====================

const cjk = parseTtf(path.join(fontDir, CJK_PROVIDER.file))
const cjkAdvances = new Map()
for (const [lo, hi] of [[0x3000, 0x303F], [0xFF00, 0xFFEF]]) {
  for (let cp = lo; cp <= hi; cp++) {
    const gid = cjk.glyphId(cp)
    if (gid !== 0) cjkAdvances.set(cp, cjk.advanceOf(gid))
  }
}
/** 汉字统一按全角算（MiSans 的汉字都是满宽），个别非满宽的在 CJK_ADVANCES 里覆盖 */
const CJK_DEFAULT_ADVANCE = cjk.unitsPerEm

// ==================== 输出 ====================

const lines = []
const push = (...rows) => lines.push(...rows)

push(
  '/**',
  ' * ★自动生成，勿手改★ —— 由 `node scripts/gen-font-metrics.mjs` 从',
  ' * `public/fonts/traffic/*.ttf` 抽出，数值与模组 `assets/yunbeiuc/font/traf_sign_font_{a,b,c}.json` 对应。',
  ' *',
  ' * 画布必须用**交通字体自己的**字宽，不能用 Minecraft 原版 ASCII 宽度表：',
  ' * 原版表里 `1` = 6、`i` = 2，而 re2014a.ttf 里 `1` = 3.37、`i` = 3.59、`M` = 7.26（文本像素）。',
  ' * 用错表会让整行宽度失真 —— 字被逐格拉伸，居中位置也跟游戏里对不上。',
  ' */',
  '',
  '/** 模组 font json 里的 provider 参数（size / shift 都是文本像素） */',
  'export interface FontProviderSpec {',
  '  size: number',
  '  shiftY: number',
  '}',
  '',
  'export const LATIN_PROVIDERS: Record<\'a\' | \'b\' | \'c\', FontProviderSpec> = {',
  ...LATIN_PROVIDERS.map(p => `  ${p.key}: { size: ${p.size}, shiftY: ${p.shiftY} },`),
  '}',
  '',
  'export const CJK_PROVIDER: FontProviderSpec = {',
  `  size: ${CJK_PROVIDER.size},`,
  `  shiftY: ${CJK_PROVIDER.shiftY},`,
  '}',
  '',
  '/** 三个交通 TTF 共用的竖直度量（upem = ascent - descent，所以 size 就是 em） */',
  `export const LATIN_FONT = { unitsPerEm: ${latin[0].unitsPerEm}, ascent: ${latin[0].ascent}, descent: ${latin[0].descent} }`,
  `export const CJK_FONT = { unitsPerEm: ${cjk.unitsPerEm}, ascent: ${cjk.ascent}, descent: ${cjk.descent} }`,
  '',
  '/** 交通字体覆盖的码位（升序） */',
  `export const LATIN_CODEPOINTS: readonly number[] = [${codepoints.join(',')}]`,
  '',
  '/** 与 LATIN_CODEPOINTS 一一对应的推进宽度（font units）；-1 = 该字体没有这个字，运行时回退中文 provider */',
  'export const LATIN_ADVANCES: Record<\'a\' | \'b\' | \'c\', readonly number[]> = {',
  ...latin.map(font => `  ${font.key}: [${codepoints.map(cp => font.advances.get(cp) ?? -1).join(',')}],`),
  '}',
  '',
  '/** 汉字默认满宽（font units） */',
  `export const CJK_DEFAULT_ADVANCE = ${CJK_DEFAULT_ADVANCE}`,
  '',
  '/** 全角标点等非满宽码位（font units） */',
  `export const CJK_ADVANCES: Readonly<Record<number, number>> = { ${[...cjkAdvances.entries()]
    .map(([cp, adv]) => `${cp}: ${adv}`)
    .join(', ')} }`,
  '',
)

fs.writeFileSync(outFile, `${lines.join('\n')}`, 'utf8')
console.log(`已写出 ${path.relative(root, outFile)}`)
console.log(`  拉丁码位 ${codepoints.length} 个 × 3 套字体（${gaps.join(' / ')}）；全角标点 ${cjkAdvances.size} 个`)
console.log(`  LATIN_FONT upem=${latin[0].unitsPerEm} ascent=${latin[0].ascent} descent=${latin[0].descent}`)
console.log(`  CJK_FONT   upem=${cjk.unitsPerEm} ascent=${cjk.ascent} descent=${cjk.descent}`)
