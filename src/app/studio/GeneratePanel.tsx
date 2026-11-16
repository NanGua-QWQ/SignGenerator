'use client'

import {
  useEffect, useMemo, useState,
} from 'react'

import {
  useAtomValue, useSetAtom,
} from 'jotai'

import {
  copyText, downloadBlob, downloadText,
} from '@/lib/studio/io'
import {
  generateProject,
} from '@/lib/studio/java'
import type {
  GeneratedFile,
} from '@/lib/studio/java'
import {
  canPickOutputDirectory, describeTarget, needsResourcesDirectory, pickOutputDirectory,
  pickResourcesDirectory, writeGeneratedFiles,
} from '@/lib/studio/output'
import type {
  OutputTarget, WriteResult,
} from '@/lib/studio/output'
import {
  isValidClassName, isValidPackageName, isValidRegistryId, projectExportFileName,
  serializeProject, toSnakeCase,
} from '@/lib/studio/project'
import {
  BLOCK_ANCHOR_STORAGE_KEY, DEFAULT_BLOCK_ANCHOR, DEFAULT_ENTITY_ANCHOR,
  DEFAULT_ITEM_ANCHOR, DEFAULT_LANG_ANCHOR, DEFAULT_MOD_SOURCE_ROOT,
  DEFAULT_RENDERER_ANCHOR,
  ENTITY_ANCHOR_STORAGE_KEY, ITEM_ANCHOR_STORAGE_KEY, LANG_ANCHOR_STORAGE_KEY,
  MOD_SOURCE_ROOT_STORAGE_KEY, RENDERER_ANCHOR_STORAGE_KEY,
  probeModSourceRoot, writeFilesViaServer,
} from '@/lib/studio/server-write'
import type {
  ServerProbeResult, ServerWriteResult,
} from '@/lib/studio/server-write'
import {
  createZip,
} from '@/lib/studio/zip'
import {
  base64ToBytes,
} from '@/lib/studio/assets'

import {
  layoutProjectAtom, patchBaseplateAtom, patchOptionsAtom, resetLayoutProjectAtom,
} from '@/state/studio-store'

import {
  BaseplatePicker,
} from './BaseplatePicker'

import {
  ActionButton, Chip, CodeBlock, EmptyHint, Field, NumberInput, Panel, SelectInput,
  TextInput, Toggle,
} from './controls'

import {
  cn,
} from '@/lib/utils'

/**
 * 生成面板：命名与注册选项 -> 生成 Java / 资源文件
 * -> 直接写入模组目录（或复制 / 打包下载）。
 */
export default function GeneratePanel({
  section = 'all',
}: {
  /** `project` = 命名 / 变体 / 渲染选项；`export` = 写入、ZIP 与工程导入导出 */
  section?: 'all' | 'project' | 'export'
}) {
  const project = useAtomValue(layoutProjectAtom)
  const updateOptions = useSetAtom(patchOptionsAtom)
  const resetProject = useSetAtom(resetLayoutProjectAtom)
  const patchBaseplate = useSetAtom(patchBaseplateAtom)

  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [outputTarget, setOutputTarget] = useState<OutputTarget | null>(null)
  const [writeResult, setWriteResult] = useState<WriteResult | null>(null)
  const [writeError, setWriteError] = useState<string | null>(null)
  const [writing, setWriting] = useState(false)
  const [mergeSnippets, setMergeSnippets] = useState(true)

  // ---- 本地服务端直写（主路径，任何浏览器都能用）----
  const [modRoot, setModRoot] = useState(DEFAULT_MOD_SOURCE_ROOT)
  const [probe, setProbe] = useState<ServerProbeResult | null>(null)
  const [probing, setProbing] = useState(false)
  const [serverResult, setServerResult] = useState<ServerWriteResult | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverWriting, setServerWriting] = useState(false)
  const [blockAnchor, setBlockAnchor] = useState(DEFAULT_BLOCK_ANCHOR)
  const [entityAnchor, setEntityAnchor] = useState(DEFAULT_ENTITY_ANCHOR)
  const [itemAnchor, setItemAnchor] = useState(DEFAULT_ITEM_ANCHOR)
  const [langAnchor, setLangAnchor] = useState(DEFAULT_LANG_ANCHOR)
  const [rendererAnchor, setRendererAnchor] = useState(DEFAULT_RENDERER_ANCHOR)

  const supportsDirectory = useMemo(() => canPickOutputDirectory(), [])

  // 记住上次填的模组根目录与注册行插入锚点
  useEffect(() => {
    const stored = window.localStorage.getItem(MOD_SOURCE_ROOT_STORAGE_KEY)
    if (stored) setModRoot(stored)
    const storedBlock = window.localStorage.getItem(BLOCK_ANCHOR_STORAGE_KEY)
    if (storedBlock !== null) setBlockAnchor(storedBlock)
    const storedEntity = window.localStorage.getItem(ENTITY_ANCHOR_STORAGE_KEY)
    if (storedEntity !== null) setEntityAnchor(storedEntity)
    const storedItem = window.localStorage.getItem(ITEM_ANCHOR_STORAGE_KEY)
    if (storedItem !== null) setItemAnchor(storedItem)
    const storedLang = window.localStorage.getItem(LANG_ANCHOR_STORAGE_KEY)
    if (storedLang !== null) setLangAnchor(storedLang)
    const storedRenderer = window.localStorage.getItem(RENDERER_ANCHOR_STORAGE_KEY)
    if (storedRenderer !== null) setRendererAnchor(storedRenderer)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(MOD_SOURCE_ROOT_STORAGE_KEY, modRoot)
  }, [modRoot])

  useEffect(() => {
    window.localStorage.setItem(BLOCK_ANCHOR_STORAGE_KEY, blockAnchor)
  }, [blockAnchor])

  useEffect(() => {
    window.localStorage.setItem(ENTITY_ANCHOR_STORAGE_KEY, entityAnchor)
  }, [entityAnchor])

  useEffect(() => {
    window.localStorage.setItem(ITEM_ANCHOR_STORAGE_KEY, itemAnchor)
  }, [itemAnchor])

  useEffect(() => {
    window.localStorage.setItem(LANG_ANCHOR_STORAGE_KEY, langAnchor)
  }, [langAnchor])

  useEffect(() => {
    window.localStorage.setItem(RENDERER_ANCHOR_STORAGE_KEY, rendererAnchor)
  }, [rendererAnchor])
  const packageSegments = useMemo(
    () => project.options.packageName.split('.').filter(Boolean),
    [project.options.packageName],
  )
  const targetDescription = useMemo(
    () => outputTarget ? describeTarget(outputTarget, packageSegments) : null,
    [outputTarget, packageSegments],
  )

  // 生成过程完全同步且纯函数，异常在 useMemo 内捕获，避免渲染期 setState
  const generation = useMemo(() => {
    try {
      return {
        result: generateProject(project),
        error: null as string | null,
      }
    } catch (cause) {
      return {
        result: null,
        error: (cause as Error).message,
      }
    }
  }, [project])

  const result = generation.result
  const error = generation.error
  const files = result?.files ?? []
  const current: GeneratedFile | undefined
    = files.find(file => file.path === selectedPath) ?? files[0]

  const classNameOk = isValidClassName(project.options.className)
  const packageOk = isValidPackageName(project.options.packageName)
  const registryOk = project.options.variants.every(variant => isValidRegistryId(variant.registryId))
  const canGenerate = classNameOk && packageOk && registryOk && files.length > 0

  function downloadZip() {
    if (files.length === 0) return
    const zip = createZip(files.map(file => ({
      path: file.path,
      content: file.encoding === 'base64' ? base64ToBytes(file.content) : file.content,
    })))
    downloadBlob(zip, `${project.options.className || 'sign-layout'}.zip`)
  }

  /** 选择输出目录（自动识别是模组根 / src/main / 包目录） */
  async function chooseOutput() {
    setWriteError(null)
    setWriteResult(null)
    try {
      const target = await pickOutputDirectory(packageSegments)
      if (target) setOutputTarget(target)
    } catch {
      // 用户取消选择
    }
  }

  /** package / java 模式下补选资源目录 */
  async function chooseResources() {
    if (!outputTarget) return
    try {
      const next = await pickResourcesDirectory(outputTarget)
      if (next) setOutputTarget(next)
    } catch {
      // 用户取消选择
    }
  }

  /** 直接写入模组目录 */
  async function writeToMod() {
    if (!outputTarget || files.length === 0) return
    setWriting(true)
    setWriteError(null)
    setWriteResult(null)
    try {
      const written = await writeGeneratedFiles(outputTarget, files, {
        packageSegments,
        snippets: generation.result?.snippets,
        mergeSnippets,
        blockAnchor,
        entityAnchor,
      })
      setWriteResult(written)
    } catch (cause) {
      setWriteError((cause as Error).message)
    } finally {
      setWriting(false)
    }
  }

  /** 检测填的根目录像不像模组源码根 */
  async function probeRoot() {
    setProbing(true)
    setServerError(null)
    try {
      setProbe(await probeModSourceRoot(modRoot, packageSegments))
    } catch (cause) {
      setProbe(null)
      setServerError((cause as Error).message)
    } finally {
      setProbing(false)
    }
  }

  /** 直接写进本机模组目录（服务端 fs 写盘，无需浏览器目录选择器） */
  async function writeToDisk() {
    if (files.length === 0) return
    setServerWriting(true)
    setServerError(null)
    setServerResult(null)
    try {
      setServerResult(await writeFilesViaServer({
        rootPath: modRoot,
        files: files.map(file => ({
          path: file.path,
          content: file.content,
          encoding: file.encoding,
          scope: file.scope,
        })),
        snippets: generation.result?.snippets,
        mergeSnippets,
        packageSegments,
        category: project.options.category,
        blockAnchor,
        entityAnchor,
        itemAnchor,
        langAnchor,
        rendererAnchor,
      }))
    } catch (cause) {
      setServerError((cause as Error).message)
    } finally {
      setServerWriting(false)
    }
  }

  const cls = project.options.className || '<类名>'
  const modId = project.options.modId || '<命名空间>'
  const pkgPath = packageSegments.length > 0 ? packageSegments.join('\\') : '<包名>'

  return (
    <div className="space-y-3">
      {section !== 'export' && (
      <>
      <Panel
        title="命名与注册"
        hint={`${project.options.packageName}.block.custom.sign.${project.options.className}`}
      >
        <div className="grid grid-cols-2 gap-2">
          <Field label="类名" hint={classNameOk ? '' : '需以大写字母开头'}>
            <TextInput
              value={project.options.className}
              mono
              onChange={className => updateOptions({ className })}
            />
          </Field>
          <Field label="模组 ID（命名空间）">
            <TextInput
              value={project.options.modId}
              mono
              onChange={modId => updateOptions({
                modId: modId.replace(/[^a-z0-9_]/g, ''),
              })}
            />
          </Field>
        </div>
        <Field label="包名" hint={packageOk ? '' : '形如 com.beigu.yunbeiuc'}>
          <TextInput
            value={project.options.packageName}
            mono
            onChange={packageName => updateOptions({ packageName })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="中文名">
            <TextInput
              value={project.options.displayNameZh}
              onChange={displayNameZh => updateOptions({
                displayNameZh,
                variants: project.options.variants.map(variant => ({
                  ...variant,
                  displayNameZh,
                })),
              })}
            />
          </Field>
          <Field label="英文名">
            <TextInput
              value={project.options.displayNameEn}
              onChange={displayNameEn => updateOptions({
                displayNameEn,
                variants: project.options.variants.map(variant => ({
                  ...variant,
                  displayNameEn,
                })),
              })}
            />
          </Field>
        </div>
        <Field label="物品提示本地化键">
          <TextInput
            value={project.options.tooltipKey}
            mono
            onChange={tooltipKey => updateOptions({ tooltipKey })}
          />
        </Field>
        <Field label="注册表">
          <SelectInput
            value={project.options.category}
            options={[
              { value: 'sign', label: 'SignBlocks（交通标志）' },
              { value: 'municipal', label: 'MunicipalBlocks（市政设施）' },
            ]}
            onChange={category => updateOptions({ category })}
          />
        </Field>
        <Field label="方块 Settings 表达式" hint="写入注册片段">
          <TextInput
            value={project.options.blockSettings}
            mono
            onChange={blockSettings => updateOptions({ blockSettings })}
          />
        </Field>
      </Panel>

      <Panel title="道路等级底色" hint="基础版式的底板与道路等级配色">
        <BaseplatePicker value={project.baseplate} onChange={patchBaseplate} />
      </Panel>

      <Panel
        title="方块变体"
        hint="同一实体类可注册多个方块（如 DIRECTION_1 / DIRECTION_2）"
        actions={(
          <ActionButton
            variant="tonal"
            onClick={() => updateOptions({
              variants: [...project.options.variants, {
                id: `${Date.now().toString(36)}`,
                registryId: toSnakeCase(`${project.options.className}_${project.options.variants.length + 1}`),
                displayNameZh: `${project.options.displayNameZh} ${project.options.variants.length + 1}`,
                displayNameEn: `${project.options.displayNameEn} ${project.options.variants.length + 1}`,
              }],
            })}
          >
            + 变体
          </ActionButton>
        )}
      >
        <div className="space-y-2">
          {project.options.variants.map((variant, index) => (
            <div
              key={variant.id}
              className="space-y-2 rounded-[var(--md-sys-shape-corner-small)] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-lowest)] p-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">变体 {index + 1}</span>
                {project.options.variants.length > 1 && (
                  <ActionButton
                    variant="danger"
                    title="删除变体"
                    onClick={() => updateOptions({
                      variants: project.options.variants.filter(item => item.id !== variant.id),
                    })}
                  >
                    删除
                  </ActionButton>
                )}
              </div>
              <Field
                label="注册名"
                hint={isValidRegistryId(variant.registryId) ? '' : '只能小写字母数字下划线'}
              >
                <TextInput
                  value={variant.registryId}
                  mono
                  onChange={registryId => updateOptions({
                    variants: project.options.variants.map(item => item.id === variant.id
                      ? { ...item, registryId: registryId.toLowerCase().replace(/[^a-z0-9_]/g, '_') }
                      : item),
                  })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <TextInput
                  value={variant.displayNameZh}
                  onChange={displayNameZh => updateOptions({
                    variants: project.options.variants.map(item => item.id === variant.id
                      ? { ...item, displayNameZh }
                      : item),
                  })}
                />
                <TextInput
                  value={variant.displayNameEn}
                  onChange={displayNameEn => updateOptions({
                    variants: project.options.variants.map(item => item.id === variant.id
                      ? { ...item, displayNameEn }
                      : item),
                  })}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="渲染与实体选项">
        <div className="grid grid-cols-3 gap-2">
          {(['NORMAL', 'POLE_H', 'POLE_L'] as const).map(type => (
            <Field key={type} label={`${type} z`} hint="方块">
              <NumberInput
                value={project.options.zOffset[type]}
                step={0.01}
                onChange={value => updateOptions({
                  zOffset: {
                    ...project.options.zOffset,
                    [type]: value,
                  },
                })}
              />
            </Field>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Toggle
            label="发光文本"
            checked={project.options.glowingText}
            onChange={glowingText => updateOptions({ glowingText })}
          />
          <Toggle
            label="同时生成 en_us"
            checked={project.options.emitEnUs}
            onChange={emitEnUs => updateOptions({ emitEnUs })}
          />
        </div>
        <p className="text-[11px] leading-4 text-muted-foreground">
          z 偏移写入渲染器 getZOffset：文本平面 = 方块中心 + z 偏移，
          默认值与模组参考渲染器（POLE_L -0.74 / POLE_H -0.81 / NORMAL -0.45）一致。
        </p>
      </Panel>
      </>
      )}

      {section !== 'project' && (
      <>
      <Panel
        title="写入本地模组目录"
        hint="生成的文件按路径直接写进本机模组工程，并自动插入注册行（推荐）"
        actions={(
          <>
            <ActionButton
              variant="outlined"
              onClick={() => {
                void probeRoot()
              }}
              disabled={probing || modRoot.trim().length === 0}
              title="检查这个目录里有没有 src/main/java 与 src/main/resources"
            >
              {probing ? '检测中…' : '检测目录'}
            </ActionButton>
            <ActionButton
              variant="tonal"
              onClick={() => {
                void writeToDisk()
              }}
              disabled={!canGenerate || serverWriting}
              title="把全部生成文件写进上面这个目录"
            >
              {serverWriting ? '写入中…' : '写入文件'}
            </ActionButton>
          </>
        )}
      >
        <Field
          label="模组源码根目录（绝对路径）"
          hint="含 src/main/java 与 src/main/resources 的那一层"
        >
          <TextInput value={modRoot} mono onChange={setModRoot} />
        </Field>

        <div className="space-y-1 rounded-[var(--md-sys-shape-corner-small)] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-lowest)] px-2 py-1.5 text-[11px]">
          <p className="truncate text-muted-foreground md-code">
            Java → {modRoot}\src\main\java\{pkgPath}\block\custom\sign\{cls}.java
          </p>
          <p className="truncate text-muted-foreground md-code">
            资源 → {modRoot}\src\main\resources\assets\{modId}\…
          </p>
        </div>

        <Toggle
          label="同时把注册行插入 SignBlocks / ModBlockEntities（已注册则跳过）"
          checked={mergeSnippets}
          onChange={setMergeSnippets}
        />

        {mergeSnippets && (
          <div className="space-y-2">
            <Field
              label="注册行插入位置（SignBlocks / MunicipalBlocks）"
              hint="插到含这串文字的那一行之前"
            >
              <TextInput
                value={blockAnchor}
                mono
                placeholder={DEFAULT_BLOCK_ANCHOR}
                onChange={setBlockAnchor}
              />
            </Field>
            <Field
              label="注册行插入位置（ModBlockEntities）"
              hint="插到含这串文字的那一行之前"
            >
              <TextInput
                value={entityAnchor}
                mono
                placeholder={DEFAULT_ENTITY_ANCHOR}
                onChange={setEntityAnchor}
              />
            </Field>
            <Field
              label="注册行插入位置（ModItems）"
              hint="插到含这串文字的那一行之前"
            >
              <TextInput
                value={itemAnchor}
                mono
                placeholder={DEFAULT_ITEM_ANCHOR}
                onChange={setItemAnchor}
              />
            </Field>
            <Field
              label="语言条目插入位置（lang/*.json）"
              hint="插到键名含这串文字的条目之前"
            >
              <TextInput
                value={langAnchor}
                mono
                placeholder={DEFAULT_LANG_ANCHOR}
                onChange={setLangAnchor}
              />
            </Field>
            <Field
              label="渲染器插入位置（各版本 *Client.java）"
              hint="插到含这串文字的那一行之前；留空则插到第一个 BlockEntityRendererRegistry.register(...) 之前"
            >
              <TextInput
                value={rendererAnchor}
                mono
                placeholder={DEFAULT_RENDERER_ANCHOR}
                onChange={setRendererAnchor}
              />
            </Field>
            <p className="text-[11px] leading-4 text-muted-foreground">
              新注册行会插在锚点那一行
              <strong className="font-medium text-foreground">前面</strong>
              ；语言新条目会插在键名含锚点的那一条
              <strong className="font-medium text-foreground">前面</strong>
              。锚点留空或在文件里找不到时，先退回
              <span className="md-code"> public static void init() </span>
              那一行之前（常量区末尾，永远不会插进方法体），连
              <span className="md-code"> init() </span>
              都没有才落到「最后一个
              <span className="md-code">{'}'}</span>
              之前」。渲染器锚点找不到时，退回第一个
              <span className="md-code"> BlockEntityRendererRegistry.register(...) </span>
              之前。
            </p>
          </div>
        )}

        <p className="text-[11px] leading-4 text-muted-foreground">
          只写 <span className="md-code">src/main/**</span> 下的工程文件；
          <span className="md-code">snippets/</span> 这类说明文件不会落进模组目录。
          同名 Java / 资源文件会被覆盖，但 <span className="md-code">assets/&lt;ns&gt;/lang/*.json</span>
          是<span className="font-medium text-foreground">并入</span>已有文件（只新增/更新本次的条目，不会清空其它语言条目）；越界路径会被拒绝。
        </p>
        <p className="text-[11px] leading-4 text-muted-foreground">
          资源产出 <span className="md-code">blockstates/</span>、<span className="md-code">models/item/</span>，
          以及 26.x 的 <span className="md-code">items/</span>、
          <span className="md-code">data/&lt;ns&gt;/recipe/</span>、<span className="md-code">data/&lt;ns&gt;/loot_table/blocks/</span>；
          <span className="md-code">items/</span> 与单数 <span className="md-code">data/</span> 只写进各版本子目录
          <span className="md-code">versions/&lt;版本&gt;/common/</span>（不会落到 <span className="md-code">versions/common</span>）；
          旧版本用的复数 <span className="md-code">recipes/</span>、<span className="md-code">loot_tables/blocks/</span> 写进 common。
          渲染器注册也会自动插进各版本客户端类。
          牌面模型 <span className="md-code">models/block/sign/&lt;normal|pole_l|pole_h&gt;/&lt;注册名&gt;.json</span>
          需要你在 Blockbench 里自己做，blockstate 已经指向它们。
        </p>

        {probe && (
          <p
            className={cn(
              'text-[11px] leading-4',
              probe.ok ? 'text-[var(--md-sys-color-primary)]' : 'text-[var(--md-sys-color-error)]',
            )}
          >
            {probe.message}
            {probe.ok && (
              <span className="text-muted-foreground">
                {' '}· SignBlocks {probe.hasSignBlocks ? '✓' : '×'}
                {' '}· MunicipalBlocks {probe.hasMunicipalBlocks ? '✓' : '×'}
                {' '}· ModBlockEntities {probe.hasBlockEntities ? '✓' : '×'}
              </span>
            )}
          </p>
        )}

        {serverError && <p className="text-[11px] text-destructive">写入失败：{serverError}</p>}

        {serverResult && (
          <div className="space-y-1 rounded-[var(--md-sys-shape-corner-small)] border border-[var(--md-sys-color-outline-variant)] p-2">
            <p className="text-[11px] font-medium text-foreground">
              已写入 {serverResult.written.length} 个文件
              {serverResult.skipped.length > 0 ? ` · 跳过 ${serverResult.skipped.length} 个` : ''}
              {serverResult.merged.length > 0 ? ` · 插入注册行 ${serverResult.merged.length} 处` : ''}
            </p>
            <p className="truncate text-[11px] text-muted-foreground md-code">
              {serverResult.rootPath}
            </p>
            <ul className="max-h-40 space-y-0.5 overflow-auto">
              {serverResult.written.map(path => (
                <li key={path} className="truncate text-[11px] text-muted-foreground md-code">
                  {path}
                </li>
              ))}
            </ul>
            {serverResult.merged.map(item => (
              <p key={item} className="text-[11px] text-primary">{item}</p>
            ))}
            {serverResult.skipped.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                跳过（不落进模组目录）：{serverResult.skipped.join('、')}
              </p>
            )}
            {serverResult.errors.length > 0 && (
              <ul className="space-y-0.5">
                {serverResult.errors.map(item => (
                  <li key={item} className="text-[11px] text-[var(--md-sys-color-error)]">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Panel>

      {supportsDirectory && (
      <Panel
        title="浏览器选目录写入（备用）"
        hint={targetDescription ? targetDescription.summary : '用 File System Access API 手选一次目录（仅 Chrome / Edge 顶层页面可用）'}
        actions={(
          <>
            <ActionButton
              onClick={() => {
                void chooseOutput()
              }}
              disabled={!supportsDirectory}
              title="选择模组目录（推荐选模组根目录、src/main，或 com/beigu/yunbeiuc 包目录）"
            >
              {outputTarget ? '重选目录' : '选择目录'}
            </ActionButton>
            {outputTarget && (
              <ActionButton
                variant="tonal"
                onClick={() => {
                  void writeToMod()
                }}
                disabled={!canGenerate || writing || needsResourcesDirectory(outputTarget)}
                title="把全部生成文件写入所选目录"
              >
                {writing ? '写入中…' : '写入'}
              </ActionButton>
            )}
          </>
        )}
      >
        {!supportsDirectory
          ? (
              <EmptyHint>
                需要 Chrome / Edge 等支持 File System Access API 的浏览器；
                现在可以点上方「ZIP」导出后手动解压。
              </EmptyHint>
            )
          : (
              <div className="space-y-2">
                {outputTarget && targetDescription
                  ? (
                      <div className="space-y-2">
                        <div className="space-y-1 rounded-[var(--md-sys-shape-corner-small)] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-lowest)] px-2 py-1.5 text-[11px]">
                          <p className="text-foreground">{targetDescription.summary}</p>
                          {targetDescription.javaExample && (
                            <p className="truncate text-muted-foreground md-code">
                              Java → {targetDescription.javaExample}
                            </p>
                          )}
                          {targetDescription.resourceExample && (
                            <p className="truncate text-muted-foreground md-code">
                              资源 → {targetDescription.resourceExample}
                            </p>
                          )}
                        </div>
                        {needsResourcesDirectory(outputTarget) && (
                          <div className="space-y-1">
                            <p className="text-[11px] text-[var(--md-sys-color-error)]">
                              这种选法只能向下访问：Java 能写进去，但资源（assets）在另一棵树里，
                              请再选一次 <span className="md-code">src/main/resources</span>。
                            </p>
                            <ActionButton
                              variant="outlined"
                              onClick={() => {
                                void chooseResources()
                              }}
                            >
                              选择资源目录
                            </ActionButton>
                          </div>
                        )}
                        {outputTarget.resourcesHandle && (
                          <p className="text-[11px] text-muted-foreground">
                            资源目录：{outputTarget.resourcesName ?? outputTarget.resourcesHandle.name}
                          </p>
                        )}
                        <Toggle
                          label="同时把注册行插入 SignBlocks / ModBlockEntities（已注册则跳过）"
                          checked={mergeSnippets}
                          onChange={setMergeSnippets}
                        />
                        <p className="text-[11px] leading-4 text-muted-foreground">
                          同名 Java / 资源文件会被本次生成的内容覆盖；找不到的注册文件会跳过并提示。
                        </p>
                      </div>
                    )
                  : (
                      <p className="text-[11px] leading-4 text-muted-foreground">
                        点「选择目录」后工坊会自动识别是哪一层：模组根目录（含 src）、
                        <span className="md-code">src/main</span>、
                        <span className="md-code">src/main/java</span>、
                        <span className="md-code">src/main/resources</span>
                        或包目录 <span className="md-code">com/beigu/yunbeiuc</span>。
                      </p>
                    )}
                {writeError && <p className="text-[11px] text-destructive">写入失败：{writeError}</p>}
                {writeResult && (
                  <div className="space-y-1 rounded-[var(--md-sys-shape-corner-small)] border border-[var(--md-sys-color-outline-variant)] p-2">
                    <p className="text-[11px] font-medium text-foreground">
                      已写入 {writeResult.written.length} 个文件
                      {writeResult.skipped.length > 0 ? ` · 跳过 ${writeResult.skipped.length} 个` : ''}
                      {writeResult.merged.length > 0 ? ` · 插入注册行 ${writeResult.merged.length} 处` : ''}
                    </p>
                    <ul className="max-h-40 space-y-0.5 overflow-auto">
                      {writeResult.written.map(path => (
                        <li key={path} className="truncate text-[11px] text-muted-foreground md-code">
                          {path}
                        </li>
                      ))}
                    </ul>
                    {writeResult.merged.map(item => (
                      <p key={item} className="text-[11px] text-primary">{item}</p>
                    ))}
                    {writeResult.skipped.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        跳过（该选法下不落盘）：{writeResult.skipped.join('、')}
                      </p>
                    )}
                    {writeResult.errors.length > 0 && (
                      <ul className="space-y-0.5">
                        {writeResult.errors.map(item => (
                          <li key={item} className="text-[11px] text-[var(--md-sys-color-error)]">
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
      </Panel>
      )}

      <Panel
        title="生成结果"
        hint={error ? '生成失败' : `${files.length} 个文件 · ${result?.snippets.length ?? 0} 段注册片段`}
        actions={(
          <>
            <ActionButton variant="ghost" title="刷新" onClick={() => setSelectedPath(null)}>
              刷新
            </ActionButton>
            <ActionButton onClick={downloadZip} disabled={!canGenerate} title="打包下载全部文件">
              ZIP
            </ActionButton>
          </>
        )}
      >
        {error && <p className="text-[11px] text-destructive">{error}</p>}
        {(result?.warnings.length ?? 0) > 0 && (
          <ul className="space-y-0.5 rounded-[var(--md-sys-shape-corner-extra-small)] bg-[var(--md-sys-color-surface-container-high)] px-2 py-1.5">
            {result?.warnings.map((warning, index) => (
              <li key={index} className="text-[10px] leading-4 text-muted-foreground">
                {warning}
              </li>
            ))}
          </ul>
        )}
        {!canGenerate && !error && (
          <p className="text-[11px] text-destructive">请先补全类名 / 包名 / 注册名。</p>
        )}
        {files.length === 0
          ? <EmptyHint>点「ZIP」前先确认命名无误；生成结果会在这里列出。</EmptyHint>
          : (
              <div className="space-y-2">
                <ul className="max-h-56 space-y-1 overflow-auto">
                  {files.map(file => (
                    <li key={file.path}>
                      <button
                        type="button"
                        onClick={() => setSelectedPath(file.path)}
                        className={cn(
                          'flex w-full items-center gap-1.5 rounded-[var(--md-sys-shape-corner-extra-small)] border px-2 py-1 text-left',
                          current?.path === file.path
                            ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-secondary-container)]'
                            : 'border-[var(--md-sys-color-outline-variant)] hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_var(--md-sys-state-hover-opacity),transparent)]',
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] text-foreground md-code">
                            {file.path}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {file.note}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                {current && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] text-muted-foreground md-code">
                        {current.path}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <ActionButton
                          variant="ghost"
                          onClick={() => {
                            void copyText(current.content).then(ok => setCopied(ok ? current.path : null))
                          }}
                        >
                          {copied === current.path ? '已复制' : '复制'}
                        </ActionButton>
                        <ActionButton
                          variant="ghost"
                          onClick={() => downloadText(
                            current.content,
                            current.path.split('/').pop() ?? 'file.txt',
                          )}
                        >
                          下载
                        </ActionButton>
                      </span>
                    </div>
                    <CodeBlock code={current.content} className="max-h-96" />
                  </div>
                )}
              </div>
            )}
      </Panel>

      {result && result.snippets.length > 0 && (
        <Panel title="注册片段" hint="写入本地模组目录时自动插入；失败可手动复制">
          <div className="space-y-2">
            {result.snippets.map(snippet => (
              <details
                key={snippet.title}
                className="rounded-[var(--md-sys-shape-corner-small)] border border-[var(--md-sys-color-outline-variant)] p-2"
              >
                <summary className="cursor-pointer text-[11px] font-medium text-foreground">
                  {snippet.title}
                  <span className="ml-1 font-normal text-muted-foreground">→ {snippet.target}</span>
                </summary>
                <div className="mt-2">
                  <CodeBlock code={snippet.code} className="max-h-48" />
                </div>
              </details>
            ))}
          </div>
        </Panel>
      )}

      <Panel
        title="工坊存档"
        hint="项目 JSON 可换机器继续编辑"
        actions={(
          <>
            <ActionButton
              variant="ghost"
              onClick={() => downloadText(
                serializeProject(project),
                projectExportFileName(project),
                'application/json',
              )}
            >
              导出项目
            </ActionButton>
          </>
        )}
      >
        <div className="flex items-center gap-2">
          <Chip onClick={resetProject}>重置为空白工程</Chip>
          <span className="text-[11px] text-muted-foreground">
            当前 {project.width}×{project.height} bit / {project.elements.length} 元素 /{' '}
            {project.fields.length} 字段
          </span>
        </div>
      </Panel>
      </>
      )}
    </div>
  )
}
