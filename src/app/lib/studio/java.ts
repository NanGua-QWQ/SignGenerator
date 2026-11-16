/**
 * 标牌代码生成器 —— 版面 -> Java 源码与 mod 资源文件（纯 TypeScript、零依赖）。
 *
 * 输入 2D 版面设计器的 LayoutProject（牌面尺寸 + 元素表 + 数据字段），
 * 输出可直接放进 yunbeiuc（Fabric / Architectury）模组工程的 Java 源文件、
 * 资源 JSON、注册片段与中文说明。
 *
 * 生成风格逐条对齐 java/ 参考源码（Mojang 官方映射命名，非 Yarn）：
 * - 方块继承 AbstractEditableSignBlockWithTooltip（工具提示键由 options.tooltipKey 指定），
 *   构造参数为 BlockBehaviour.Properties，重写 protected newBlockEntityCompat(...)；
 * - 实体继承 CustomSignBlockEntity，NBT 走 loadCompat / saveAdditionalCompat(CompoundTag)，
 *   固定字段读写 + 占位符解析 + 枚举字段选项，刷新用 setChanged() + level.sendBlockUpdated(...)；
 * - 渲染器继承 AbstractTextDisplayEntityRenderer，用 PoseStack / BlockEntityRendererProvider.Context，
 *   朝向变换走 VersionServices.render().rotateY(...)，Z 偏移按 SignTypeConverter.convert(...) 分支；
 * - 版面元素按「helper 能表达就用工厂，不能表达就展开为 TextLineData 显式 setter」生成；
 * - 元素可按方块变体（`options.variants`）分别覆盖参数：给实体生成了一个按方块
 *   注册名分流的 `switch`，每个变体拿到自己的一套 `lines.add(...)`。
 * - 注册片段按 SignBlocks / ModBlockEntities 的 DeferredRegister + VersionServices 写法生成。
 *
 * 单位：版面坐标就是 bit（1 bit = 1/16 方块），与 TextLineData.xOffset/yOffset
 * 以及 SignTextLinesHelper 的 andX/andY 完全一致，无需换算。
 */

import type {
  AbcFont,
  LayoutAlignment,
  LayoutElement,
  LayoutField,
  LayoutLogoElement,
  LayoutOptions,
  LayoutProject,
  LayoutRectElement,
  LayoutTextElement,
} from './layout-model'
import {
  DEFAULT_ABC_FONT, VALID_ABC_FONTS, fieldNbtKey,
} from './layout-model'
import {
  dataUrlToBase64, textureResourcePath,
} from './assets'
import {
  repairPlaceholders,
} from './project'
import {
  applyVariantOverrides, hasVariantOverride,
} from './variant'

// ==================== 常量 ====================

/** 模组自身 Java 基础包（与 java/ 参考源码一致） */
const DEFAULT_PACKAGE = 'com.beigu.yunbeiuc'
/** 默认资源命名空间 / MOD_ID */
const DEFAULT_MOD_ID = 'yunbeiuc'
/**
 * 方块注册默认 Properties 表达式。
 *
 * 26.x 起模组统一用 `VanillaBlocks`（`com.beigu.yunbeiuc.api.vanilla.VanillaBlocks`）
 * 取原版方块，`Blocks.CYAN_TERRACOTTA` 的写法在 `SignBlocks` / `MunicipalBlocks`
 * 里已经全部改掉；顺序也固定为 `copyProperties(...).noOcclusion().requiresCorrectToolForDrops()`。
 */
const DEFAULT_BLOCK_SETTINGS =
  'VersionServices.blocks().copyProperties(VanillaBlocks.CYAN_TERRACOTTA).noOcclusion().requiresCorrectToolForDrops()'
/** getZOffset 默认值（与 SignExpresswayDirection1EntityRenderer 一致） */
const DEFAULT_Z_OFFSET: Record<SignTypeName, number> = {
  POLE_L: -0.74,
  POLE_H: -0.81,
  NORMAL: -0.45,
}

type SignTypeName = 'NORMAL' | 'POLE_H' | 'POLE_L'

/** 三种安装类型对应的方块状态 property 取值 */
const TYPE_STATE_NAME: Record<SignTypeName, string> = {
  NORMAL: 'normal',
  POLE_H: 'pole_h',
  POLE_L: 'pole_l',
}
/**
 * 三种安装类型的模型目录名。
 *
 * ⚠️ 模组的牌面模型放在 `models/block/sign/<type>/<注册名>.json`（**嵌套**），
 * 不是 `models/block/<注册名>_pole_l.json` 那种扁平写法 ——
 * 生成器**不产出**这些模型文件（Blockbench 手搓），只在 blockstate 里指向它们。
 */
const TYPE_MODEL_DIR: Record<SignTypeName, string> = {
  NORMAL: 'normal',
  POLE_H: 'pole_h',
  POLE_L: 'pole_l',
}
/**
 * blockstate 里 type 的展开顺序。
 *
 * 与仓库里已有的 blockstate（如 `sign_custom_expressway_exit_1.json`）保持一致的
 * `normal → pole_l → pole_h` 顺序，方便 diff。
 */
const SIGN_TYPES: readonly SignTypeName[] = ['NORMAL', 'POLE_L', 'POLE_H']
/**
 * 水平朝向与 blockstate 的 y 旋转（Minecraft 约定：north=0 / east=90 / south=180 / west=270）。
 * `y === 0` 时按模组惯例**省略 `y` 字段**。
 */
const BLOCKSTATE_FACINGS: readonly { facing: string; y: number }[] = [
  { facing: 'north', y: 0 },
  { facing: 'east', y: 90 },
  { facing: 'south', y: 180 },
  { facing: 'west', y: 270 },
]
/** 合法文本对齐枚举（越界值兜底 CENTER_CENTER，避免生成非法 Java） */
const VALID_ALIGNMENTS: readonly LayoutAlignment[] = [
  'LEFT_TOP', 'LEFT_CENTER', 'LEFT_BOTTOM',
  'CENTER_TOP', 'CENTER_CENTER', 'CENTER_BOTTOM',
  'RIGHT_TOP', 'RIGHT_CENTER', 'RIGHT_BOTTOM',
]
/** 对齐枚举兜底值 */
const FALLBACK_ALIGNMENT: LayoutAlignment = 'CENTER_CENTER'
/** -rect 指令在宽高缺失时的兜底值（bit） */
const FALLBACK_RECT_SIZE: readonly number[] = [8, 4]
/** 合法字体标识：模组只认交通字体 A / B / C */
const VALID_FONTS: readonly string[] = VALID_ABC_FONTS

// ==================== 公共 API ====================

/**
 * 清洗类名：按非字母数字边界切分、逐段首字母大写，得到合法的 Java 类名。
 * 例：`sign-custom-01` / `sign_custom_01` / `Sign Custom 01` 都会得到 `SignCustom01`。
 */
export function safeIdentifier(value: string): string {
  const parts = (typeof value === 'string' ? value : '')
    .split(/[^A-Za-z0-9]+/)
    .filter(part => part.length > 0)
  const joined = parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')
  if (joined.length === 0) return 'SignCustom'
  return /^[0-9]/.test(joined) ? `Sign${joined}` : joined
}

/**
 * 注册名 → 注册常量名：`sign_custom_01` → `SIGN_CUSTOM_01`（驼峰也会被拆成下划线）。
 */
export function registryConstant(registryId: string): string {
  const source = typeof registryId === 'string' ? registryId : ''
  return source
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '')
    .toUpperCase()
}

/** 仅生成 3 个 Java 源文件：方块、方块实体、渲染器。 */
export function generateJavaFiles(project: LayoutProject): GeneratedFile[] {
  return buildJavaFiles(createContext(project))
}

/** 生成全部产物：Java 源文件 + 资源 JSON + 注册片段文件。 */
export function generateProject(project: LayoutProject): GenerationResult {
  // 先修一遍占位符字段：缺字段 / 默认值为空都会让贴图路径拼出空段
  const { project: repaired, warnings } = repairPlaceholders(project)
  const ctx = createContext(repaired)
  // 变体注册名撞车时 `normalizeVariants` 会自动补 `_2`，这里把改名结果说出来
  const requestedIds = (Array.isArray(repaired.options.variants) ? repaired.options.variants : [])
    .map(variant => (typeof variant.registryId === 'string' ? variant.registryId.trim() : ''))
    .filter(registryId => registryId !== '')
  if (new Set(requestedIds).size !== requestedIds.length) {
    warnings.push(
      '变体注册名有重复，已自动改名避免覆盖同一份文件：'
      + ctx.variants.map(variant => variant.registryId).join(', '),
    )
  }
  const files: GeneratedFile[] = buildJavaFiles(ctx)
  files.push(...buildResourceFiles(ctx))
  files.push(...buildAssetFiles(repaired))
  const snippets = buildSnippets(ctx)
  files.push(...buildSnippetFiles(ctx, snippets))
  return {
    // 兜底去重：同一个路径只保留第一份（变体注册名撞车时会生成同名的 blockstate /
    // 模型 / 方块类，落到界面与 ZIP 里就是重复 key）。
    files: dedupeFilesByPath(files),
    snippets,
    warnings,
  }
}

/** 按 path 去重（保留首次出现），顺带保证「写入文件」不会重复写同一个文件 */
function dedupeFilesByPath(files: GeneratedFile[]): GeneratedFile[] {
  const seen = new Set<string>()
  const out: GeneratedFile[] = []
  for (const file of files) {
    if (seen.has(file.path)) continue
    seen.add(file.path)
    out.push(file)
  }
  return out
}

/**
 * 用户导入的图片 → 二进制资源文件。
 *
 * 直接以 base64 携带，落盘时解码成字节写进
 * `src/main/resources/assets/<ns>/textures/...`，这样生成的 `logo(...)`
 * 路径在模组里能真正解析到图片。
 */
function buildAssetFiles(project: LayoutProject): GeneratedFile[] {
  const assets = Array.isArray(project.assets) ? project.assets : []
  const out: GeneratedFile[] = []
  for (const asset of assets) {
    const path = textureResourcePath(asset.texturePath)
    if (!path) continue
    out.push({
      path,
      language: 'text',
      note: `导入图片「${asset.name}」（${asset.width}×${asset.height}）`,
      content: dataUrlToBase64(asset.dataUrl),
      encoding: 'base64',
    })
  }
  return out
}

// ==================== 生成结果类型 ====================

export type GeneratedLanguage = 'java' | 'json' | 'text'

export interface GeneratedFile {
  /** 相对 mod 工程根目录的路径 */
  path: string
  language: GeneratedLanguage
  /** 生成文件作用的说明 */
  note: string
  /**
   * 落盘范围：
   * - `shared`（默认）：写到所选源码根目录（`versions/common`）；
   * - `version`：只写进各版本子目录（`versions/<版本>/common`），
   *   由写入接口按目标目录是否已存在自动分发，绝不落到 `versions/common`。
   */
  scope?: 'shared' | 'version'
  content: string
  /**
   * `content` 的编码。
   * - `utf8`（默认）：纯文本源码；
   * - `base64`：二进制资源（用户导入的 PNG 等），落盘时解码成字节。
   */
  encoding?: 'utf8' | 'base64'
}

export interface GenerationResult {
  files: GeneratedFile[]
  /** 需要手工粘贴的注册片段 */
  snippets: { title: string; target: string; code: string }[]
  /** 生成前的占位符自检结果（已自动修正的项也记在这里） */
  warnings: string[]
}

// ==================== 生成上下文 ====================

interface NormalizedVariant {
  registryId: string
  constName: string
  displayNameZh: string
  displayNameEn: string
}

interface GeneratorContext {
  project: LayoutProject
  cls: string
  entityClass: string
  rendererClass: string
  pkg: string
  pkgPath: string
  modId: string
  /** 主注册名：取第一个变体 */
  registryId: string
  constName: string
  tooltipKey: string
  blockSettings: string
  category: 'sign' | 'municipal'
  glowingText: boolean
  emitEnUs: boolean
  variants: NormalizedVariant[]
}

function createContext(project: LayoutProject): GeneratorContext {
  const options = project.options
  const cls = safeIdentifier(options.className)
  const pkg = normalizePackage(options.packageName)
  const modId = normalizeModId(options.modId)
  const variants = normalizeVariants(options, cls)
  const registryId = variants[0].registryId
  return {
    project,
    cls,
    entityClass: `${cls}Entity`,
    rendererClass: `${cls}EntityRenderer`,
    pkg,
    pkgPath: pkg.replace(/\./g, '/'),
    modId,
    registryId,
    constName: registryConstant(registryId),
    tooltipKey: normalizeTooltipKey(options.tooltipKey, modId),
    blockSettings: normalizeBlockSettings(options.blockSettings),
    category: options.category === 'municipal' ? 'municipal' : 'sign',
    glowingText: options.glowingText === true,
    emitEnUs: options.emitEnUs === true,
    variants,
  }
}

function normalizeVariants(options: LayoutOptions, cls: string): NormalizedVariant[] {
  const source = Array.isArray(options.variants) ? options.variants : []
  const normalized: NormalizedVariant[] = []
  /*
   * 注册名必须唯一：两个变体同名会生成**同一份** blockstate / 模型 / 方块类，
   * 界面上就会出现「重复的 key」，游戏里后一个注册直接覆盖前一个。
   * 用户手改注册名（或从别处粘进来）撞车时，自动补 `_2` / `_3` 后缀。
   */
  const used = new Set<string>()
  const dedupe = (registryId: string): string => {
    let next = registryId
    let suffix = 2
    while (used.has(next)) {
      next = `${registryId}_${suffix}`
      suffix += 1
    }
    used.add(next)
    return next
  }

  for (const variant of source) {
    const registryId = sanitizeRegistryId(variant.registryId)
    if (registryId === '') continue
    const unique = dedupe(registryId)
    normalized.push({
      registryId: unique,
      constName: registryConstant(unique),
      displayNameZh: pickName(variant.displayNameZh, variant.displayNameEn, registryId),
      displayNameEn: pickName(variant.displayNameEn, variant.displayNameZh, registryId),
    })
  }
  if (normalized.length > 0) return normalized
  // 无有效变体：用类名转 snake_case 作为唯一注册名
  const fallback = sanitizeRegistryId(toSnakeCase(cls)) || 'sign_custom'
  return [
    {
      registryId: fallback,
      constName: registryConstant(fallback),
      displayNameZh: pickName(options.displayNameZh, options.displayNameEn, cls),
      displayNameEn: pickName(options.displayNameEn, options.displayNameZh, cls),
    },
  ]
}

// ==================== Java 源文件 ====================

function buildJavaFiles(ctx: GeneratorContext): GeneratedFile[] {
  return [buildBlockFile(ctx), buildEntityFile(ctx), buildRendererFile(ctx)]
}

/** 方块类：只负责 newBlockEntityCompat 与工具提示键，其余逻辑全部在基类 */
function buildBlockFile(ctx: GeneratorContext): GeneratedFile {
  const { pkg, cls, entityClass, tooltipKey } = ctx
  const content = toFileContent([
    `package ${pkg}.block.custom.sign;`,
    '',
    `import ${pkg}.entity.${entityClass};`,
    'import net.minecraft.core.BlockPos;',
    'import net.minecraft.world.level.block.entity.BlockEntity;',
    'import net.minecraft.world.level.block.state.BlockBehaviour;',
    'import net.minecraft.world.level.block.state.BlockState;',
    '',
    `public class ${cls} extends AbstractEditableSignBlockWithTooltip {`,
    `    public ${cls}(BlockBehaviour.Properties properties) {`,
    `        super(properties, ${javaLiteral(tooltipKey)});`,
    '    }',
    '',
    '    @Override',
    '    protected BlockEntity newBlockEntityCompat(BlockPos pos, BlockState state) {',
    `        return new ${entityClass}(pos, state);`,
    '    }',
    '}',
  ])
  return {
    path: `${javaRoot(ctx)}/block/custom/sign/${cls}.java`,
    language: 'java',
    note: '方块类：继承 AbstractEditableSignBlockWithTooltip，newBlockEntityCompat 创建对应方块实体',
    content,
  }
}

/** 方块实体：固定字段、版面默认文本行、占位符与枚举字段选项 */
function buildEntityFile(ctx: GeneratorContext): GeneratedFile {
  const { project, pkg, entityClass, constName, category } = ctx
  const fields: LayoutField[] = Array.isArray(project.fields) ? project.fields : []
  const enumFields = fields.filter(field => field.type === 'enum')
  const elements = visibleElements(project)
  /** 变体分流用的注册表类：交通标志在 SignBlocks，市政在 MunicipalBlocks */
  const blockHolder = category === 'municipal' ? 'MunicipalBlocks' : 'SignBlocks'
  /*
   * 变体分流：只在存在覆盖时启用。
   *
   * 这里传**未过滤**的元素表：某个元素可能只在部分变体下隐藏 / 显示，
   * 逐变体的可见性由 `buildVariantLines` 按合并后的 `visible` 再筛一次。
   */
  const { rows: variantRows } = buildVariantSwitch(project.elements, project, blockHolder)
  const useVariantSwitch = variantRows.length > 0
  /**
   * 是否需要 `ensureDefaultTextLines()`。
   *
   * 只有「有可见元素」或「有变体 switch」才需要 ——
   * ⚠️ `project.baseplate` **不再生成任何东西**（见 `layout-model.ts` 里
   * `LayoutBaseplate` 的说明：它只用于画布预览）。
   */
  const hasLines = elements.length > 0 || useVariantSwitch
  const out: string[] = []

  out.push(`package ${pkg}.entity;`)
  out.push('')
  // 模组最新的实体文件把 import 分成三组：com.beigu / net.minecraft / java.*
  if (fields.length > 0) {
    out.push(`import ${pkg}.api.mapper.VersionServices;`)
    out.push(`import ${pkg}.api.nbt.NbtCompat;`)
  }
  if (useVariantSwitch) {
    // 变体分流要按注册表常量比对（`isBlockType(SignBlocks.XXX)`，见 buildVariantSwitch）
    out.push(`import ${pkg}.block.${blockHolder};`)
  }
  if (fields.length > 0 || useVariantSwitch) out.push('')
  out.push('import net.minecraft.core.BlockPos;')
  out.push('import net.minecraft.nbt.CompoundTag;')
  out.push('import net.minecraft.world.level.block.state.BlockState;')
  out.push('')
  out.push('import java.util.ArrayList;')
  if (elements.length > 0 || enumFields.length > 0) out.push('import java.util.List;')
  out.push('')
  out.push(`public class ${entityClass} extends CustomSignBlockEntity {`)

  if (fields.length > 0) {
    for (const field of fields) {
      out.push(`    private String ${javaFieldName(field.key)} = ${javaLiteral(field.defaultValue)};`)
    }
    out.push('')
  }

  out.push(`    public ${entityClass}(BlockPos pos, BlockState state) {`)
  out.push(`        super(ModBlockEntities.${constName}_ENTITY.get(), pos, state);`)
  if (hasLines) {
    out.push('        ensureDefaultTextLines();')
  }
  out.push('    }')
  out.push('')

  out.push('    @Override')
  out.push('    public void loadCompat(CompoundTag nbt) {')
  out.push('        super.loadCompat(nbt);')
  for (const field of fields) {
    out.push(`        this.${javaFieldName(field.key)} = NbtCompat.getString(nbt, ${javaLiteral(fieldNbtKey(field))});`)
  }
  if (hasLines) {
    // 与模组现有实体一致：只有在「存档里没有文本行数据 + 玩家没编辑过」时才铺默认版面
    out.push('        if (!CustomSignBlockEntity.hasTextLinesData(nbt) && !hasCustomizedTextLines()) {')
    out.push('            ensureDefaultTextLines();')
    out.push('        }')
  }
  out.push('    }')
  out.push('')
  out.push('    @Override')
  out.push('    public void saveAdditionalCompat(CompoundTag nbt) {')
  for (const field of fields) {
    out.push(`        nbt.putString(${javaLiteral(fieldNbtKey(field))}, this.${javaFieldName(field.key)});`)
  }
  out.push('        super.saveAdditionalCompat(nbt);')
  out.push('    }')
  out.push('')

  if (hasLines) {
    out.push('    private void ensureDefaultTextLines() {')
    out.push('        if (!getTextLines().isEmpty()) return;')
    out.push('        List<TextLineData> lines = new ArrayList<>();')
    if (useVariantSwitch) {
      out.push(...variantRows)
    }
    else {
      elements.forEach((element, index) => {
        out.push(...buildElementStatements(element, index))
      })
    }
    out.push('        setTextLines(lines);')
    if (ctx.glowingText) out.push('        setGlowingText(true);')
    out.push('    }')
    out.push('')
  }

  if (fields.length > 0) {
    for (const field of fields) {
      const name = javaFieldName(field.key)
      const suffix = upperFirst(name)
      // 与模组最新源码一致：getter / setter 各占一个方法块，块之间空一行
      out.push(`    public String get${suffix}() {`)
      out.push(`        return ${name};`)
      out.push('    }')
      out.push('')
      out.push(`    public void set${suffix}(String ${name}) {`)
      out.push(`        this.${name} = ${name};`)
      out.push('        markDirtyAndUpdate();')
      out.push('    }')
      out.push('')
    }
    out.push('    @Override')
    out.push('    public String getPlaceholderValue(String key) {')
    out.push('        return switch (key) {')
    for (const field of fields) {
      out.push(`            case ${javaLiteral(field.key)} -> ${javaFieldName(field.key)};`)
    }
    out.push('            default -> null;')
    out.push('        };')
    out.push('    }')
    out.push('')
  }

  if (enumFields.length > 0) {
    out.push('    @Override')
    out.push('    public List<FieldOptionGroup> getFieldOptions(String placeholderKey) {')
    out.push('        return switch (placeholderKey) {')
    for (const field of enumFields) {
      const name = javaFieldName(field.key)
      const title = pickName(field.label, field.key, field.key)
      const options = Array.isArray(field.options) ? field.options : []
      const head =
        `            case ${javaLiteral(field.key)} -> List.of(new FieldOptionGroup(` +
        `${javaLiteral(title)}, ${javaLiteral(field.key)}, `
      if (options.length === 0) {
        out.push(`${head}List.of()));`)
        continue
      }
      out.push(`${head}List.of(`)
      options.forEach((option, optionIndex) => {
        const tail = optionIndex === options.length - 1 ? ')));' : ','
        out.push(`                    opt(${javaLiteral(option.label)}, ${javaLiteral(option.value)}, ${name})${tail}`)
      })
    }
    out.push('            default -> null;')
    out.push('        };')
    out.push('    }')
    out.push('')
    out.push('    @Override')
    out.push('    public void applyFieldOption(String field, String value) {')
    out.push('        switch (field) {')
    for (const field of enumFields) {
      const setter = `set${upperFirst(javaFieldName(field.key))}`
      out.push(`            case ${javaLiteral(field.key)} -> ${setter}(value);`)
    }
    out.push('            default -> { }')
    out.push('        }')
    out.push('    }')
    out.push('')
  }

  if (fields.length > 0) {
    out.push('    private void markDirtyAndUpdate() {')
    out.push('        setChanged();')
    out.push('        if (level != null) {')
    // 模组最新源码用 `VersionServices.blocks().updateAll()` 取跨版本正确的更新标志，
    // 不再硬编码 `3`（1.20 之后 Block.UPDATE_* 的取值不一样）。
    out.push('            level.sendBlockUpdated(worldPosition, blockStateForDefaults(), blockStateForDefaults(), VersionServices.blocks().updateAll());')
    out.push('        }')
    out.push('    }')
    out.push('')
  }

  if (out.length > 0 && out[out.length - 1] === '') out.pop()
  out.push('}')

  return {
    path: `${javaRoot(ctx)}/entity/${entityClass}.java`,
    language: 'java',
    note: '方块实体：固定字段 NBT 读写、占位符解析、版面默认文本行与枚举字段选项',
    content: toFileContent(out),
  }
}

/** 渲染器：朝向变换 + 三种安装类型的文本平面 Z 偏移 */
function buildRendererFile(ctx: GeneratorContext): GeneratedFile {
  const { pkg, cls, entityClass, rendererClass } = ctx
  const zOffset = resolveZOffsets(ctx.project)
  const content = toFileContent([
    `package ${pkg}.render;`,
    '',
    `import ${pkg}.block.custom.sign.${cls};`,
    `import ${pkg}.entity.${entityClass};`,
    `import ${pkg}.api.mapper.VersionServices;`,
    'import com.mojang.blaze3d.vertex.PoseStack;',
    'import net.minecraft.client.renderer.blockentity.BlockEntityRendererProvider;',
    'import net.minecraft.core.Direction;',
    '',
    `public class ${rendererClass} extends AbstractTextDisplayEntityRenderer<${entityClass}> {`,
    '',
    `    public ${rendererClass}(BlockEntityRendererProvider.Context ctx) {`,
    '        super(ctx);',
    '    }',
    '',
    '    @Override',
    `    protected void applyTransforms(PoseStack matrices, ${entityClass} entity) {`,
    `        Direction facing = entity.getBlockState().getValue(${cls}.FACING);`,
    '        matrices.translate(0.5, 0.5, 0.5);',
    '        VersionServices.render().rotateY(matrices, -facing.toYRot());',
    '    }',
    '',
    '    @Override',
    `    protected float getZOffset(${entityClass} entity) {`,
    `        return switch (SignTypeConverter.convert(entity.getBlockState().getValue(${cls}.TYPE))) {`,
    `            case POLE_L -> ${formatFloat(zOffset.POLE_L)};`,
    `            case POLE_H -> ${formatFloat(zOffset.POLE_H)};`,
    `            case NORMAL -> ${formatFloat(zOffset.NORMAL)};`,
    '        };',
    '    }',
    '}',
  ])
  return {
    path: `${javaRoot(ctx)}/render/${rendererClass}.java`,
    language: 'java',
    note: '方块实体渲染器：FACING 朝向变换（VersionServices.render().rotateY）与三种安装类型的文本平面 Z 偏移',
    content,
  }
}

// ==================== 版面元素 → Java ====================

/** 版面元素里可见的部分，按数组顺序即 lines.add 顺序 */
function visibleElements(project: LayoutProject): LayoutElement[] {
  const source = Array.isArray(project.elements) ? project.elements : []
  return source.filter(element => element.visible !== false)
}

/**
 * 道路等级底色**不参与代码生成**。
 *
 * 以前会铺一条 `-rect <宽> <高>` 当牌面底色，现在去掉：牌面的底色由方块模型
 * （Blockbench 里的牌面贴图）决定，多铺一层纯色只会盖住模型、还多一次绘制。
 * `project.baseplate` 仅剩画布预览用途（判断白字压不压得住底），
 * 要底色请在版面里自己放一个 **色块元素**（`rect`）—— 那条照旧会生成。
 */

/** 单个版面元素 -> 若干行 Java 语句 */
function buildElementStatements(element: LayoutElement, index: number): string[] {
  switch (element.kind) {
    case 'logo':
      return buildLogoStatements(element)
    case 'rect':
      return buildRectStatements(element)
    default:
      return buildTextStatements(element, index)
  }
}

/**
 * 把一个元素列表编译成 `lines.add(...)` 语句（按给定缩进）。
 *
 * `variantId` 非空时先并入该变体的覆盖再过滤可见性 —— 这样生成的
 * 就是「游戏里真正会画出来的那一套」。
 */
function buildVariantLines(
  elements: readonly LayoutElement[],
  variantId: string | null,
  pad = '        ',
): string[] {
  const out: string[] = []
  const merged = applyVariantOverrides(elements, variantId)
  merged.forEach((element, index) => {
    if (element.visible === false) return
    for (const row of buildElementStatements(element, index)) {
      out.push(row === '' ? row : pad + row)
    }
  })
  return out
}

/**
 * 按方块变体分流的默认文本行。
 *
 * 只有**真的有覆盖**时才生成分流语句，否则维持一份直白的顺序语句 ——
 * 单变体工程（绝大多数）的生成结果与以前逐字节一致。
 *
 * ⚠️ 分流方式必须是 `isBlockType(SignBlocks.XXX)`：
 * - 这是 `CustomSignBlockEntity` 提供的跨版本判定（内部比较 `namespace + 注册名`），
 *   1.16.5 上直接比较方块实例或走 `BuiltInRegistries.BLOCK` 都取不到/不相等
 *   （`BuiltInRegistries` 在旧版本根本不存在，编译就报"无法解析符号"）；
 * - 模组里所有手写实体（`SignExpresswayDirection5Entity`、`ZonesBoardOverWeightEntity`…）
 *   都是这么写的，生成的代码要跟它们同形。
 */
function buildVariantSwitch(
  elements: readonly LayoutElement[],
  project: LayoutProject,
  holder: string,
): { rows: string[], variantsUsed: string[] } {
  const variants = Array.isArray(project.options?.variants) ? project.options.variants : []
  const used = variants
    .filter(variant => elements.some(element => hasVariantOverride(element, variant.id)))
    .map(variant => variant.id)
  if (variants.length < 2 || used.length === 0) {
    return { rows: [], variantsUsed: [] }
  }

  const constOf = new Map(variants.map(variant => [variant.id, registryConstant(variant.registryId)]))
  const rows: string[] = []
  used.forEach((variantId, index) => {
    // 语句本身自带 8 空格缩进，if 体要落在 12 空格 → 这里只补 4
    const body = buildVariantLines(elements, variantId, '    ')
    const condition = `isBlockType(${holder}.${constOf.get(variantId) ?? registryConstant(variantId)})`
    rows.push(index === 0 ? `        if (${condition}) {` : `        } else if (${condition}) {`)
    rows.push(...body)
  })
  rows.push('        } else {')
  rows.push(...buildVariantLines(elements, null, '    '))
  rows.push('        }')
  return { rows, variantsUsed: used }
}

/**
 * 贴图行 → `SignTextLinesHelper.logo(...)`。
 *
 * `rotZ` 为 0 时用 4 参数重载；非 0 时用模组新增的 5 参数重载
 * `logo(path, x, y, size, rotZ)`（rotZ 单位是度，直接写进行的 rotZ 字段）。
 */
function buildLogoStatements(element: LayoutLogoElement): string[] {
  const pad = '        '
  const rotZ = normalizeNumber(element.rotZ, 0)
  const args = [
    javaLiteral(element.path),
    formatFloat(element.x),
    formatFloat(element.y),
    formatFloat(element.size),
  ]
  if (Math.abs(rotZ) > 1e-6) args.push(formatFloat(rotZ))
  return [`${pad}lines.add(SignTextLinesHelper.logo(${args.join(', ')}));`]
}

/** 色块行：`-rect w h` 指令 + 位置/颜色/对齐的显式 setter */
function buildRectStatements(element: LayoutRectElement): string[] {
  const pad = '        '
  const name = `rectLine`
  const width = normalizeNumber(element.width, FALLBACK_RECT_SIZE[0])
  const height = normalizeNumber(element.height, FALLBACK_RECT_SIZE[1])
  return [
    `${pad}TextLineData ${name} = new TextLineData("-rect ${formatPlainNumber(width)} ${formatPlainNumber(height)}");`,
    `${pad}${name}.setXOffset(${formatFloat(element.x)});`,
    `${pad}${name}.setYOffset(${formatFloat(element.y)});`,
    `${pad}${name}.setColor(${colorLiteral(element.color)});`,
    `${pad}${name}.setAlignment(TextAlignment.CENTER_CENTER);`,
    `${pad}${name}.setBuiltin(true);`,
    `${pad}lines.add(${name});`,
  ]
}

/**
 * 文本行。
 *
 * - 能完整用 helper 表达（`*_CENTER` 对齐、无旋转/缩放、无斜体下划线阴影描边）时，
 *   按 `zDelta` 是否为 0 选 `centered(...)` 或 `centeredWithZ(...)`；
 *   左/右对齐且垂直居中时用 `left(...)` / `right(...)`。
 * - 否则展开为 `new TextLineData(...)` + 全字段显式 setter，语义完全可控。
 */
function buildTextStatements(element: LayoutTextElement, index: number): string[] {
  const pad = '        '
  if (canUseHelper(element)) {
    const font = normalizeFont(element.abcFont)
    const args =
      `${javaLiteral(element.text)}, ${formatFloat(element.x)}, ${formatFloat(element.y)}, ` +
      `${formatFloat(element.scale)}, ${colorLiteral(element.color)}, ${javaLiteral(font)}`
    if (Math.abs(normalizeNumber(element.zDelta, 0)) > 1e-6) {
      return [
        `${pad}lines.add(SignTextLinesHelper.centeredWithZ(${args}, ` +
        `${formatFloat(element.zDelta)}, ${javaLiteral(font)}));`,
      ]
    }
    const factory = helperFactory(element.alignment)
    return [`${pad}lines.add(SignTextLinesHelper.${factory}(${args}));`]
  }
  return buildRawTextStatements(element, index)
}

/**
 * helper 是否足以表达该行。
 *
 * 成立条件：`*_CENTER` 垂直居中、无 Z 偏移、无旋转、无额外缩放，
 * 且不含斜体 / 下划线 / 阴影 / 描边。
 * 注意 bold 不参与判断——helper 内部按 GlobalFontSettings.isAbcMode() 决定加粗，
 * 无法逐行指定（`base()` 里 `line.setBold(!isAbcMode())`）。
 */
function canUseHelper(line: LayoutTextElement): boolean {
  const alignment = normalizeAlignment(line.alignment)
  if (!alignment.endsWith('_CENTER')) return false
  if (Math.abs(normalizeNumber(line.zDelta, 0)) > 1e-6) return false
  if (Math.abs(normalizeNumber(line.rotX, 0)) > 1e-6) return false
  if (Math.abs(normalizeNumber(line.rotY, 0)) > 1e-6) return false
  if (Math.abs(normalizeNumber(line.rotZ, 0)) > 1e-6) return false
  if (normalizeNumber(line.scaleX, 1) !== 1) return false
  if (normalizeNumber(line.scaleY, 1) !== 1) return false
  if (normalizeNumber(line.scaleZ, 1) !== 1) return false
  if (line.italic === true || line.underline === true) return false
  if (line.shadow === true || line.outline === true) return false
  return true
}

function helperFactory(alignment: LayoutAlignment): 'centered' | 'left' | 'right' {
  const value = normalizeAlignment(alignment)
  if (value.startsWith('LEFT')) return 'left'
  if (value.startsWith('RIGHT')) return 'right'
  return 'centered'
}

/** helper 未覆盖的行：new TextLineData(...) + 全部字段显式 setter */
function buildRawTextStatements(line: LayoutTextElement, index: number): string[] {
  const pad = '        '
  const name = `line${index}`
  const alignment = normalizeAlignment(line.alignment)
  const rows: string[] = []
  rows.push(`${pad}TextLineData ${name} = new TextLineData(${javaLiteral(line.text)});`)
  rows.push(`${pad}${name}.setXOffset(${formatFloat(line.x)});`)
  rows.push(`${pad}${name}.setYOffset(${formatFloat(line.y)});`)
  // helper 的 zOffsetDelta 单位是方块，TextLineData.zOffset 单位是 bit
  rows.push(`${pad}${name}.setZOffset(${formatFloat(normalizeNumber(line.zDelta, 0) * 16)});`)
  rows.push(`${pad}${name}.setRotX(${formatFloat(line.rotX)});`)
  rows.push(`${pad}${name}.setRotY(${formatFloat(line.rotY)});`)
  rows.push(`${pad}${name}.setRotZ(${formatFloat(line.rotZ)});`)
  rows.push(`${pad}${name}.setColor(${colorLiteral(line.color)});`)
  rows.push(`${pad}${name}.setAlignment(TextAlignment.${alignment});`)
  rows.push(`${pad}${name}.setBold(${line.bold === true});`)
  rows.push(`${pad}${name}.setItalic(${line.italic === true});`)
  rows.push(`${pad}${name}.setUnderline(${line.underline === true});`)
  rows.push(`${pad}${name}.setShadow(${line.shadow === true});`)
  rows.push(`${pad}${name}.setOutline(${line.outline === true});`)
  if (line.outline === true) {
    rows.push(`${pad}${name}.setOutlineColor(${colorLiteral(line.outlineColor)});`)
  }
  rows.push(`${pad}${name}.setGlowing(${line.glowing === true});`)
  // 版面里 scale 就是 helper 的 scale，换算 fontSize = scale * 20f
  rows.push(`${pad}${name}.setFontSize(${formatScaleFloat(normalizeNumber(line.scale, 0.05) * 20)});`)
  const font = normalizeFont(line.abcFont)
  if (font !== '') rows.push(`${pad}${name}.setAbcFont(${javaLiteral(font)});`)
  rows.push(`${pad}${name}.setScaleX(${formatFloat(line.scaleX)});`)
  rows.push(`${pad}${name}.setScaleY(${formatFloat(line.scaleY)});`)
  rows.push(`${pad}${name}.setScaleZ(${formatFloat(line.scaleZ)});`)
  rows.push(`${pad}${name}.setBuiltin(true);`)
  rows.push(`${pad}lines.add(${name});`)
  return rows
}

// ==================== 资源文件 ====================

function buildResourceFiles(ctx: GeneratorContext): GeneratedFile[] {
  const { modId } = ctx
  const assets = `src/main/resources/assets/${modId}`
  const files: GeneratedFile[] = []

  // 每个变体：blockstate + 物品模型 + 26.x 物品定义 + 单数/复数配方与掉落表。
  // ⚠️ `models/block/sign/<type>/<注册名>.json` **不由生成器产出** ——
  // 那是用 Blockbench 手搓的牌面几何，生成器只负责在 blockstate 里指向它。
  // JSON 资源按模组现有文件的样子写：不带结尾换行（lang 才有）。
  for (const variant of ctx.variants) {
    files.push({
      path: `${assets}/blockstates/${variant.registryId}.json`,
      language: 'json',
      note: '方块状态：4 种水平朝向 × 3 种安装类型，指向 models/block/sign/<normal|pole_l|pole_h>/<注册名>.json',
      content: buildBlockstateJson(ctx, variant.registryId),
    })
    files.push({
      path: `${assets}/models/item/${variant.registryId}.json`,
      language: 'json',
      note: '物品模型：继承 models/block/sign/normal/<注册名>.json',
      content: JSON.stringify({ parent: `${modId}:block/sign/normal/${variant.registryId}` }, null, 2),
    })
    // 26.x 起物品模型改由 `assets/<ns>/items/` 下的 item model definition 声明；
    // 这些文件只在各版本子目录（versions/<版本>/common）里存在，不能落到 versions/common。
    files.push({
      path: `${assets}/items/${variant.registryId}.json`,
      language: 'json',
      note: '26.x 物品模型定义：指向 models/item/<注册名>.json（写入各版本子目录）',
      scope: 'version',
      content: buildItemDefinitionJson(ctx, variant.registryId),
    })
    files.push({
      path: `src/main/resources/data/${modId}/recipe/${variant.registryId}.json`,
      language: 'json',
      note: '石切配方：白色混凝土 → 9 个方块（26.x 单数目录，写入各版本子目录）',
      scope: 'version',
      content: buildRecipeJson(ctx, variant.registryId),
    })
    files.push({
      path: `src/main/resources/data/${modId}/loot_table/blocks/${variant.registryId}.json`,
      language: 'json',
      note: '方块掉落表（26.x 单数目录，写入各版本子目录）',
      scope: 'version',
      content: buildLootTableJson(ctx, variant.registryId),
    })
    files.push({
      path: `src/main/resources/data/${modId}/recipes/${variant.registryId}.json`,
      language: 'json',
      note: '石切配方：白色混凝土 → 9 个方块（旧版本复数目录，写入 common）',
      content: buildLegacyRecipeJson(ctx, variant.registryId),
    })
    files.push({
      path: `src/main/resources/data/${modId}/loot_tables/blocks/${variant.registryId}.json`,
      language: 'json',
      note: '方块掉落表（旧版本复数目录，写入 common）',
      content: buildLootTableJson(ctx, variant.registryId),
    })
  }

  files.push(buildLangFile(ctx, 'zh_cn'))
  if (ctx.emitEnUs) files.push(buildLangFile(ctx, 'en_us'))
  return files
}

/**
 * 26.x 物品模型定义。
 *
 * 26.x 不再只靠 `models/item/<注册名>.json` 决定物品外观，还要在
 * `assets/<ns>/items/<注册名>.json` 里声明 `minecraft:model` 指向哪个模型；
 * 这里指向生成器已经产出的 `models/item/<注册名>.json`。
 */
function buildItemDefinitionJson(ctx: GeneratorContext, registryId: string): string {
  return JSON.stringify({
    model: {
      type: 'minecraft:model',
      model: `${ctx.modId}:item/${registryId}`,
    },
  }, null, 2)
}

/** 石切配方：与模组里 sign_* 的写法一致（白色混凝土 → 9 个方块）。 */
function buildRecipeJson(ctx: GeneratorContext, registryId: string): string {
  return JSON.stringify({
    type: 'minecraft:stonecutting',
    ingredient: 'minecraft:white_concrete',
    result: {
      id: `${ctx.modId}:${registryId}`,
      count: 9,
    },
  }, null, 2)
}

/** 旧版本（1.20.4 及以下）的石切配方，采用复数 `recipes/` 目录与旧版结果格式。 */
function buildLegacyRecipeJson(ctx: GeneratorContext, registryId: string): string {
  return JSON.stringify({
    type: 'minecraft:stonecutting',
    ingredient: {
      item: 'minecraft:white_concrete',
    },
    result: `${ctx.modId}:${registryId}`,
    count: 9,
  }, null, 4)
}

/** 方块掉落表：掉落自身，并保留 `survives_explosion` 条件。 */
function buildLootTableJson(ctx: GeneratorContext, registryId: string): string {
  return JSON.stringify({
    type: 'minecraft:block',
    pools: [
      {
        rolls: 1,
        entries: [
          {
            type: 'minecraft:item',
            name: `${ctx.modId}:${registryId}`,
          },
        ],
        conditions: [
          {
            condition: 'minecraft:survives_explosion',
          },
        ],
      },
    ],
  }, null, 2)
}

/**
 * 方块状态。
 *
 * 与仓库里已有的牌（`blockstates/sign_custom_expressway_exit_1.json`）同构：
 * type 在外层（normal → pole_l → pole_h）、facing 在内层（north → east → south → west），
 * 模型指向 `yunbeiuc:block/sign/<type>/<注册名>`，`y === 0` 时省略 `y` 字段。
 */
function buildBlockstateJson(ctx: GeneratorContext, registryId: string): string {
  const variants: Record<string, { model: string, y?: number }> = {}
  for (const type of SIGN_TYPES) {
    for (const entry of BLOCKSTATE_FACINGS) {
      const state: { model: string, y?: number } = {
        model: `${ctx.modId}:block/sign/${TYPE_MODEL_DIR[type]}/${registryId}`,
      }
      if (entry.y !== 0) state.y = entry.y
      variants[`facing=${entry.facing},type=${TYPE_STATE_NAME[type]}`] = state
    }
  }
  return JSON.stringify({ variants }, null, 2)
}

function buildLangFile(ctx: GeneratorContext, locale: 'zh_cn' | 'en_us'): GeneratedFile {
  const { modId, tooltipKey } = ctx
  const entries: Record<string, string> = {}
  for (const variant of ctx.variants) {
    entries[`block.${modId}.${variant.registryId}`] = locale === 'zh_cn'
      ? variant.displayNameZh
      : variant.displayNameEn
  }
  entries[tooltipKey] = locale === 'zh_cn'
    ? '可用文本编辑棒（Wand）右键编辑文本'
    : 'Right-click with the text wand to edit the text'
  return {
    path: `src/main/resources/assets/${modId}/lang/${locale}.json`,
    language: 'json',
    note: locale === 'zh_cn'
      ? '简体中文语言条目：方块名与工具提示（写入时会并入已有文件，不覆盖其它条目）'
      : '英文语言条目：方块名与工具提示（写入时会并入已有文件，不覆盖其它条目）',
    content: toFileContent([JSON.stringify(entries, null, 2)]),
  }
}

// ==================== 注册片段 ====================

function buildSnippets(
  ctx: GeneratorContext,
): { title: string; target: string; code: string }[] {
  const { pkg, pkgPath, category } = ctx
  const blockHolder = category === 'municipal' ? 'MunicipalBlocks' : 'SignBlocks'
  const itemSection = category === 'municipal' ? 'Municipal BlockItems' : 'Sign BlockItems'
  const itemHelper = category === 'municipal' ? 'municipal(...)' : 'sign(...)'
  return [
    {
      title: `方块注册（${blockHolder}）`,
      target: `粘贴到 ${pkg}.block.${blockHolder}（\`src/main/java/${pkgPath}/block/${blockHolder}.java\`）`
        + ` 的 ${category} 分类区域，紧跟同组的常量行`,
      code: buildSignBlocksSnippet(ctx),
    },
    {
      title: '方块实体注册（ModBlockEntities）',
      target: `粘贴到 ${pkg}.entity.ModBlockEntities（\`src/main/java/${pkgPath}/entity/ModBlockEntities.java\`）`
        + ' 的现有常量区（BES 由 init() 统一注册）',
      code: buildBlockEntitiesSnippet(ctx),
    },
    {
      title: '物品注册（ModItems）',
      target: `粘贴到 ${pkg}.item.ModItems（\`src/main/java/${pkgPath}/item/ModItems.java\`）`
        + ` 的「${itemSection}」区，写法是 ${itemHelper}`,
      code: buildItemSnippet(ctx),
    },
    {
      title: '渲染器注册（各版本客户端）',
      target: '写入时自动插入每个 MC 版本目录下的 '
        + '`fabric/.../client/*Client.java` 与 `neoforge（旧版为 forge）/.../client/*Client.java`；'
        + '插入位置可在生成面板的「渲染器插入位置」里调整（默认插在 `ZONES_BOARD_1_ENTITY` 那一行之前）；'
        + '若未自动插入，再手动粘到 `BlockEntityRendererRegistry.register(...)` 那一组的最前面',
      code: buildRendererSnippet(ctx),
    },
  ]
}

/**
 * 物品（BlockItem）注册片段。
 *
 * 光注册方块是拿不到物品的 —— 还得在 `item/ModItems.java` 里给每个方块注册一个
 * `BlockItem`，否则创造模式物品栏里没有、也没法 `/give`。
 *
 * 模组最新写法是复用 `ModItems` 里的**分类包装方法**：
 * - 标志牌：`sign(SignBlocks.SIGN_CUSTOM_01)`（塞进 `ALL_SIGN_ITEMS` + `SIGN_TAB`）
 * - 市政：`municipal(MunicipalBlocks.X)`（塞进 `ALL_MUNICIPAL_ITEMS` + `MUNICIPAL_TAB`）
 *
 * 早期版本用的是三参数的 `registerBlockItem(block, list, tab)`，现在这两个包装方法
 * 已经把 list 和 tab 固定下来了，生成的代码不该再自己传。
 *
 * ⚠️ 生成的文件**不带任何注释**，落点由片段自身的 `target` 字段说明。
 */
function buildItemSnippet(ctx: GeneratorContext): string {
  const { category } = ctx
  const helper = category === 'municipal' ? 'municipal' : 'sign'
  const holder = category === 'municipal' ? 'MunicipalBlocks' : 'SignBlocks'
  const lines: string[] = []
  for (const variant of ctx.variants) {
    lines.push(
      `public static final RegistrySupplier<Item> ${variant.constName} = ` +
      `${helper}(${holder}.${variant.constName});`,
    )
  }
  return toFileContent(lines)
}

/**
 * 方块注册片段。
 *
 * 两个注册表用的**不是同一个入口**，这是最容易踩的坑：
 *
 * - `SignBlocks` 里包了一层私有辅助方法 `register(id, factory)`（顺带登记进
 *   `BLOCK_ENTRIES`，`entries()` 才拿得到），直接写 `BLOCKS.register(...)` 会绕过去；
 * - `MunicipalBlocks` 没有这层包装，它的每一行都是
 *   `BlockRegistration.register(BLOCKS, "id", () -> new X(...))` —— 26.x 要求
 *   方块 id 构造前就盖章，只有 `BlockRegistration.register` 会调
 *   `VersionServices.blocks().beginRegistration(name)`，少写这一层新版本会崩。
 */
function buildSignBlocksSnippet(ctx: GeneratorContext): string {
  const { cls, category, blockSettings } = ctx
  const lines: string[] = []
  for (const variant of ctx.variants) {
    const call = category === 'municipal'
      ? `BlockRegistration.register(BLOCKS, ${javaLiteral(variant.registryId)}, `
        + `() -> new ${cls}(${blockSettings}))`
      : `register(${javaLiteral(variant.registryId)}, () -> new ${cls}(${blockSettings}))`
    lines.push(
      `public static final RegistrySupplier<Block> ${variant.constName} = ${call};`,
    )
  }
  return toFileContent(lines)
}

function buildBlockEntitiesSnippet(ctx: GeneratorContext): string {
  const { entityClass, constName, category } = ctx
  const holder = category === 'municipal' ? 'MunicipalBlocks' : 'SignBlocks'
  const refs = ctx.variants.map(variant => `${holder}.${variant.constName}.get()`)
  const args = refs.length > 0 ? refs : [`${holder}.${constName}.get()`]
  const lines: string[] = [
    `public static final RegistrySupplier<BlockEntityType<${entityClass}>> ${constName}_ENTITY =`,
    `        BES.register(${javaLiteral(`${ctx.registryId}_entity`)},`,
    `                () -> VersionServices.blockEntities().create(${entityClass}::new,`,
  ]
  args.forEach((ref, index) => {
    const tail = index === args.length - 1 ? '));' : ','
    lines.push(`                        ${ref}${tail}`)
  })
  return toFileContent(lines)
}

/**
 * 渲染器注册片段。
 *
 * 模组走的是 Architectury 的 `BlockEntityRendererRegistry.register(...)`
 * （`dev.architectury.registry.client.rendering.BlockEntityRendererRegistry`），
 * 不是 Fabric 的 `BlockEntityRendererFactories` —— 这个 API 在 Fabric / NeoForge
 * 两个加载器下都能用，所以注册代码是同一行。
 *
 * 这一行由写入接口自动插到各 MC 版本目录的客户端初始化类里
 * （`versions/<ver>/{fabric,neoforge,forge}/.../client/*Client.java`）。
 */
function buildRendererSnippet(ctx: GeneratorContext): string {
  const { constName, rendererClass } = ctx
  return toFileContent([
    `BlockEntityRendererRegistry.register(ModBlockEntities.${constName}_ENTITY.get(), ${rendererClass}::new);`,
  ])
}

function buildSnippetFiles(
  ctx: GeneratorContext,
  snippets: { title: string; target: string; code: string }[],
): GeneratedFile[] {
  const names = ['SignBlocks', 'ModBlockEntities', 'ModItems', 'RendererRegistry']
  return snippets.map((snippet, index): GeneratedFile => ({
    path: `snippets/${names[index]}_${ctx.registryId}.java.txt`,
    language: 'text',
    note: `${snippet.title}——${snippet.target}`,
    content: snippet.code,
  }))
}

// ==================== 通用工具 ====================

function javaRoot(ctx: GeneratorContext): string {
  return `src/main/java/${ctx.pkgPath}`
}

function toFileContent(lines: readonly string[]): string {
  return `${lines.join('\n')}\n`
}

function normalizePackage(value: string): string {
  const source = typeof value === 'string' ? value.trim() : ''
  return source === '' ? DEFAULT_PACKAGE : source
}

function normalizeModId(value: string): string {
  const source = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (source === '') return DEFAULT_MOD_ID
  return source.replace(/[^a-z0-9_]+/g, '_')
}

function normalizeTooltipKey(value: string, modId: string): string {
  const source = typeof value === 'string' ? value.trim() : ''
  return source === '' ? `block.${modId}.sign_text.tooltip` : source
}

/**
 * 方块 Properties 表达式归一化。
 *
 * 老工程的存档里还是 `copyProperties(Blocks.CYAN_TERRACOTTA)` 那一版写法 ——
 * 26.x 起原版方块改从 `VanillaBlocks` 取，直接照抄旧值会编译失败。
 * 这里只在**完全没有** `VanillaBlocks.` 时做一次定向迁移，用户自定义的表达式不动。
 */
function normalizeBlockSettings(value: string): string {
  const source = typeof value === 'string' ? value.trim() : ''
  if (source === '') return DEFAULT_BLOCK_SETTINGS
  if (source.includes('VanillaBlocks.')) return source
  return source.replace(/\bcopyProperties\(\s*Blocks\./g, 'copyProperties(VanillaBlocks.')
}

function normalizeAlignment(value: LayoutAlignment): LayoutAlignment {
  return VALID_ALIGNMENTS.includes(value) ? value : FALLBACK_ALIGNMENT
}

/** 字体标识归一化：非 a/b/c 一律回退 A 型（模组只认这三种） */
function normalizeFont(value: AbcFont): string {
  const source = typeof value === 'string' ? value : ''
  return VALID_FONTS.includes(source) ? source : DEFAULT_ABC_FONT
}

function resolveZOffsets(project: LayoutProject): Record<SignTypeName, number> {
  const source = project.options.zOffset ?? DEFAULT_Z_OFFSET
  return {
    POLE_L: zOffsetValue(source, 'POLE_L'),
    POLE_H: zOffsetValue(source, 'POLE_H'),
    NORMAL: zOffsetValue(source, 'NORMAL'),
  }
}

function zOffsetValue(
  source: Partial<Record<SignTypeName, number>>,
  key: SignTypeName,
): number {
  const value = source[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return DEFAULT_Z_OFFSET[key]
}

/** 注册名清洗：仅保留小写字母、数字与下划线 */
function sanitizeRegistryId(value: string): string {
  const source = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return source
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '')
}

/** 类名 → snake_case：`SignCustom01` → `sign_custom_01` */
function toSnakeCase(value: string): string {
  return (typeof value === 'string' ? value : '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([A-Za-z])([0-9])/g, '$1_$2')
    .toLowerCase()
}

/** 字段 key → Java 字段名（非法字符替换为下划线，数字开头补下划线） */
function javaFieldName(key: string): string {
  const source = typeof key === 'string' ? key.trim() : ''
  const cleaned = source.replace(/[^A-Za-z0-9_$]+/g, '_')
  if (cleaned === '') return 'field'
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned
}

function upperFirst(value: string): string {
  if (value.length === 0) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** 取第一个非空字符串，全都为空时用兜底值 */
function pickName(primary: string, secondary: string, fallback: string): string {
  if (typeof primary === 'string' && primary.trim() !== '') return primary
  if (typeof secondary === 'string' && secondary.trim() !== '') return secondary
  return fallback
}

function normalizeNumber(value: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** Java 字符串内容转义：反斜杠、双引号、换行、回车、制表符；中文原样保留 */
function javaString(value: string): string {
  const source = typeof value === 'string' ? value : ''
  let out = ''
  for (const char of source) {
    if (char === '\\') out += '\\\\'
    else if (char === '"') out += '\\"'
    else if (char === '\n') out += '\\n'
    else if (char === '\r') out += '\\r'
    else if (char === '\t') out += '\\t'
    else out += char
  }
  return out
}

function javaLiteral(value: string): string {
  return `"${javaString(value)}"`
}

/** 浮点字面量：整数写作 `3f`，小数去掉多余零但至少保留一位（`-0.74f` / `-0.5f` / `0f`） */
function formatFloat(value: number): string {
  const safe = normalizeNumber(value, 0)
  if (Number.isInteger(safe)) return `${safe}f`
  const text = safe.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  return `${text}f`
}

/** 比例字面量：强制至少一位小数（`1.0f` / `0.8f`） */
function formatScaleFloat(value: number): string {
  const safe = normalizeNumber(value, 1)
  const text = safe.toFixed(4).replace(/0+$/, '')
  return text.endsWith('.') ? `${text}0f` : `${text}f`
}

/** 普通十进制字面量（用于 -rect 指令，整数不带小数点） */
function formatPlainNumber(value: number): string {
  const safe = normalizeNumber(value, 0)
  if (Number.isInteger(safe)) return `${safe}`
  return safe.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
}

/** 颜色 → `0xFFFFFF`（大写十六进制，补齐 6 位，越界裁剪） */
function colorLiteral(value: number): string {
  const safe = normalizeNumber(value, 0)
  const truncated = Math.trunc(safe)
  const clamped = truncated < 0 ? 0 : truncated > 0xFFFFFF ? 0xFFFFFF : truncated
  return `0x${clamped.toString(16).toUpperCase().padStart(6, '0')}`
}
