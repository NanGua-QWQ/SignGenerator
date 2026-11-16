/**
 * 校验「动态贴图目录」：模板 + 每一个选项值都能拼出一个**真实存在**的 PNG。
 *
 * `src/app/lib/studio/dynamic-textures.ts` 里的 `DYNAMIC_TEXTURES` /
 * `DYNAMIC_OPTION_GROUPS` 是逐条抄模组各实体 `ensureDefaultTextLines` +
 * `getFieldOptions` 得来的；抄错一个段名，画布就只会显示占位框。
 * 这个脚本把每个组合都拼出来，跟 `public/textures/sign/` 里的真实文件对一遍。
 *
 * 用法：
 *   node scripts/verify-dynamic-textures.mjs
 *
 * 退出码 0 = 全部命中；1 = 有缺失（会列出具体是哪条模板的哪个选项）。
 * ⚠️ 本脚本只读，不改任何文件。
 */

import {
  existsSync,
} from 'node:fs'
import {
  dirname, resolve,
} from 'node:path'
import {
  fileURLToPath, pathToFileURL,
} from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const textureDir = resolve(root, 'public/textures/sign')

const {
  DYNAMIC_TEXTURES,
  DYNAMIC_OPTION_GROUPS,
  optionGroupById,
  defaultTextureFile,
  resolveTextureFile,
  modFieldName,
} = await import(pathToFileURL(resolve(root, 'src/app/lib/studio/dynamic-textures.ts')).href)

const missing = []
const checked = new Set()

function probe(file, where) {
  if (checked.has(file)) return true
  checked.add(file)
  const ok = existsSync(resolve(textureDir, file))
  if (!ok) missing.push({ file, where })
  return ok
}

console.log(`贴图目录：${textureDir}`)
console.log(`模板 ${DYNAMIC_TEXTURES.length} 条 / 选项组 ${DYNAMIC_OPTION_GROUPS.length} 组\n`)

// 1. 模板自身 + 每个选项值的组合
for (const entry of DYNAMIC_TEXTURES) {
  const group = optionGroupById(entry.group)
  if (!group) {
    missing.push({ file: entry.file, where: `模板 ${entry.file} 引用了不存在的选项组 ${entry.group}` })
    continue
  }
  for (const option of group.options) {
    const values = {}
    for (const key of entry.keys) values[key] = option.value
    const file = resolveTextureFile(entry.file, values)
    if (file.includes('{')) {
      missing.push({ file, where: `${entry.file} 的 ${option.label} 没被替换干净` })
      continue
    }
    probe(file, `${entry.file} ← ${group.title}=${option.label}（${option.value}）`)
  }
}

// 2. 图案库默认缩略图
for (const entry of DYNAMIC_TEXTURES) {
  const preview = defaultTextureFile(entry)
  if (!preview) {
    missing.push({ file: entry.file, where: `${entry.file} 算不出默认预览文件名` })
    continue
  }
  probe(preview, `${entry.file} 的默认预览图`)
}

// 3. 每组默认值必须在自己的选项里（否则画布一选出来就解析不到）
for (const group of DYNAMIC_OPTION_GROUPS) {
  if (!group.options.some(option => option.value === group.default)) {
    missing.push({ file: group.id, where: `${group.title} 的 default（${group.default}）不在 options 里` })
  }
}

// 4. 字段名（写进 LayoutField.nbtKey 的那个）必须是非空合法标识符
for (const entry of DYNAMIC_TEXTURES) {
  const group = optionGroupById(entry.group)
  if (!group) continue
  for (const key of entry.keys) {
    const field = modFieldName(group, key)
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(field)) {
      missing.push({ file: entry.file, where: `${entry.file} 的 {${key}} → 字段名 "${field}" 非法` })
    }
  }
}

console.log(`已检查 ${checked.size} 个唯一贴图文件\n`)

if (missing.length > 0) {
  console.error(`✗ 有 ${missing.length} 处不成立：`)
  for (const item of missing) console.error(`  - ${item.file}\n      ${item.where}`)
  process.exit(1)
}

console.log('✓ 动态贴图目录全部命中真实 PNG')
