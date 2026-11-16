'use client'

import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react'

import {
  useAtom, useAtomValue, useSetAtom,
} from 'jotai'

import {
  specToProject, specItemSummary,
} from '@/lib/ai/apply'
import {
  requestAiPlan, probeAiKey,
} from '@/lib/ai/client'
import {
  AI_IMAGE_MAX_EDGE, DEFAULT_AI_MODEL,
} from '@/lib/ai/config'
import {
  clipboardHasText, imageFromClipboard, prepareAiImage,
} from '@/lib/ai/image'
import {
  BASEPLATE_PRESETS,
} from '@/lib/studio/layout-model'
import {
  cn,
} from '@/lib/utils'

import {
  aiApiKeyAtom, aiHintAtom, aiImageAtom, aiModelAtom, aiNoticeAtom, aiProbeAtom,
  aiRememberKeyAtom, aiRunAtom, aiUseAsReferenceAtom, aiWindowOpenAtom, applyAiSpecAtom,
  loadStoredAiKey, loadStoredAiModel, resetAiRunAtom, storeAiKey, storeAiModel,
} from '@/state/ai-store'
import {
  layoutProjectAtom,
} from '@/state/studio-store'

import {
  ActionButton, Chip, CodeBlock, EmptyHint, Field, Panel, Toggle,
} from './controls'

import type {
  AiImagePayload,
} from '@/lib/ai/image'

/**
 * AI 专属配置窗口。
 *
 * 刻意做成**独立窗口**而不是右侧面板里的第四个 tab：
 * 这个流程是「离开画布 → 发图 → 审阅 → 回画布」的一次性动作，
 * 需要同时放下图片预览、Key、结果清单三块内容，380px 的侧栏塞不下。
 *
 * ⚠️ 这个窗口**只写工程数据**。它不会调用 `generateProject`，也不会写盘 ——
 * 生成代码始终由用户在「生成代码」tab 里手动点。
 */

const INPUT_CLASS = [
  'h-8 w-full rounded-[var(--md-sys-shape-corner-extra-small)]',
  'border border-[var(--md-sys-color-outline)] bg-transparent px-2 text-xs text-foreground',
  'transition-colors duration-[var(--md-sys-motion-duration-short)]',
  'placeholder:text-muted-foreground',
  'hover:border-[var(--md-sys-color-on-surface)]',
  'focus:border-[var(--md-sys-color-primary)] focus:ring-1 focus:ring-[var(--md-sys-color-primary)]',
  'focus:outline-none disabled:cursor-not-allowed disabled:opacity-[0.38]',
].join(' ')

const TEXTAREA_CLASS = [
  'min-h-20 w-full resize-y rounded-[var(--md-sys-shape-corner-extra-small)]',
  'border border-[var(--md-sys-color-outline)] bg-transparent px-2 py-1.5 text-xs leading-5',
  'text-foreground transition-colors duration-[var(--md-sys-motion-duration-short)]',
  'placeholder:text-muted-foreground',
  'hover:border-[var(--md-sys-color-on-surface)]',
  'focus:border-[var(--md-sys-color-primary)] focus:ring-1 focus:ring-[var(--md-sys-color-primary)]',
  'focus:outline-none',
].join(' ')

function humanBytes(bytes: number): string {
  if (bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function baseplateLabel(id: string | undefined): string {
  if (!id) return '不铺底'
  if (id === 'none') return '不铺底'
  const preset = BASEPLATE_PRESETS.find(item => item.id === id)
  return preset ? `${preset.label}（${preset.hint}）` : id
}

export function AiWindow() {
  const [open, setOpen] = useAtom(aiWindowOpenAtom)
  const [apiKey, setApiKey] = useAtom(aiApiKeyAtom)
  const [remember, setRemember] = useAtom(aiRememberKeyAtom)
  const [model, setModel] = useAtom(aiModelAtom)
  const [hint, setHint] = useAtom(aiHintAtom)
  const [image, setImage] = useAtom(aiImageAtom)
  const [useAsReference, setUseAsReference] = useAtom(aiUseAsReferenceAtom)
  const [run, setRun] = useAtom(aiRunAtom)
  const [probe, setProbe] = useAtom(aiProbeAtom)
  const resetRun = useSetAtom(resetAiRunAtom)
  const applySpec = useSetAtom(applyAiSpecAtom)
  const notice = useAtomValue(aiNoticeAtom)
  const setNotice = useSetAtom(aiNoticeAtom)
  const project = useAtomValue(layoutProjectAtom)

  const fileRef = useRef<HTMLInputElement>(null)
  const [showKey, setShowKey] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [now, setNow] = useState(0)

  // ---- 首次挂载恢复 Key / 模型 ----
  useEffect(() => {
    setApiKey(loadStoredAiKey())
    setModel(loadStoredAiModel())
  }, [setApiKey, setModel])

  // ---- Key / 模型落盘（记住才写 localStorage） ----
  useEffect(() => {
    storeAiKey(apiKey, remember)
  }, [apiKey, remember])

  useEffect(() => {
    storeAiModel(model)
  }, [model])

  // ---- 打开时清掉上一次的提示 ----
  useEffect(() => {
    if (!open) return
    setNotice(null)
  }, [open, setNotice])

  // ---- 打开期间锁滚动 ----
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  // ---- 运行中的计时 ----
  const running = run.status === 'running'
  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [running])

  const close = useCallback(() => {
    if (running) return
    setOpen(false)
    setDragging(false)
  }, [running, setOpen])

  // ---- 载入图片（选择 / 拖拽 / 粘贴共用） ----
  const loadFile = useCallback(async (file: File) => {
    setImageError(null)
    setReading(true)
    try {
      const payload = await prepareAiImage(file)
      setImage(payload)
      resetRun()
    }
    catch (cause) {
      setImageError(cause instanceof Error ? cause.message : '读取图片失败')
    }
    finally {
      setReading(false)
    }
  }, [resetRun, setImage])

  // ---- 窗口内 Ctrl+V 粘贴图片 ----
  useEffect(() => {
    if (!open) return
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target
      const inField = target instanceof HTMLElement
        && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

      let file: File | null = null
      try {
        file = imageFromClipboard(event)
      }
      catch {
        file = null
      }

      if (!file) {
        // 焦点在输入框里（粘的是文字）就交给浏览器默认行为，别弹提示
        if (!inField && !clipboardHasText(event)) {
          setImageError('剪贴板里没有图片：先截图（Win+Shift+S）或复制一个图片文件再按 Ctrl+V')
        }
        return
      }

      event.preventDefault()
      setImageError(null)
      void loadFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [open, loadFile])

  // ---- Esc 关闭 ----
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  /** 结果预览：用与「应用」完全相同的映射函数算一遍，所见即所得 */
  const preview = useMemo(() => {
    if (!run.result) return null
    try {
      return specToProject(run.result.spec, project)
    }
    catch (cause) {
      return {
        project,
        warnings: [`预览失败：${(cause as Error).message}`],
        stats: {
          width: project.width,
          height: project.height,
          elements: 0,
          fields: 0,
          variants: 0,
        },
      }
    }
  }, [run.result, project])

  const elapsed = run.startedAt
    ? Math.max(0, Math.round(((run.finishedAt ?? now ?? run.startedAt) - run.startedAt) / 1000))
    : 0
  const canRun = Boolean(image) && !running && !reading
  const spec = run.result?.spec ?? null

  async function runAnalysis() {
    if (!image || running) return
    const startedAt = Date.now()
    setRun({
      status: 'running',
      result: null,
      error: null,
      detail: null,
      startedAt,
      finishedAt: null,
    })
    const response = await requestAiPlan({
      apiKey: apiKey.trim(),
      model: model.trim() || DEFAULT_AI_MODEL,
      image: image.dataUrl,
      hint,
      width: project.width,
      height: project.height,
    })
    if (response.ok) {
      setRun({
        status: 'done',
        result: response,
        error: null,
        detail: null,
        startedAt,
        finishedAt: Date.now(),
      })
    }
    else {
      setRun({
        status: 'error',
        result: null,
        error: response.error,
        detail: response.detail ?? null,
        startedAt,
        finishedAt: Date.now(),
      })
    }
  }

  async function testKey() {
    setProbe({
      status: 'running',
      message: '正在连接…',
    })
    const result = await probeAiKey(apiKey.trim(), model.trim() || DEFAULT_AI_MODEL)
    setProbe({
      status: result.ok ? 'ok' : 'fail',
      message: result.message,
    })
  }

  function apply() {
    if (!spec) return
    // 不关窗：让用户马上看到「已应用」提示，也方便立刻重新分析或调整底图开关
    applySpec({
      spec,
      reference: useAsReference ? image : null,
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--md-sys-color-scrim)_48%,transparent)]"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI 配置版面"
        className={cn(
          'relative flex max-h-[94vh] w-full max-w-[1120px] flex-col overflow-hidden',
          'rounded-[var(--md-sys-shape-corner-extra-large)]',
          'border border-[var(--md-sys-color-outline-variant)]',
          'bg-[var(--md-sys-color-surface-container-high)]',
          'shadow-[var(--md-sys-elevation-level-3)]',
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--md-sys-color-outline-variant)] px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
              AI 配置版面
              <span className="rounded-full bg-[var(--md-sys-color-secondary-container)] px-2 py-0.5 text-[10px] font-normal text-[var(--md-sys-color-on-secondary-container)]">
                DeepSeek 视觉
              </span>
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              发一张标志牌照片 → AI 读出内容并摆好版面 → 你确认后回画布手动点「生成代码」
            </p>
          </div>
          <button
            type="button"
            title="关闭（Esc）"
            onClick={close}
            disabled={running}
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,transparent)] disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="size-4 fill-current">
              <path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4z" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-gutter:stable]">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            {/* ---------------- 左列：Key / 图片 / 说明 ---------------- */}
            <div className="space-y-3">
              <Panel
                title="1 · DeepSeek API Key"
                hint="只存在这台机器的浏览器里，不会进工程文件"
                actions={(
                  <ActionButton
                    variant="outlined"
                    onClick={() => {
                      void testKey()
                    }}
                    disabled={probe.status === 'running'}
                    title="用一次极小请求验证 Key / 余额 / 模型是否可用"
                  >
                    {probe.status === 'running' ? '检测中…' : '测试连接'}
                  </ActionButton>
                )}
              >
                <div className="flex items-center gap-1.5">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    placeholder="sk-…（留空则用服务端环境变量 DEEPSEEK_API_KEY）"
                    spellCheck={false}
                    autoComplete="off"
                    onChange={event => setApiKey(event.target.value)}
                    className={cn(INPUT_CLASS, 'md-code')}
                  />
                  <ActionButton
                    variant="ghost"
                    onClick={() => setShowKey(value => !value)}
                    title={showKey ? '隐藏' : '显示'}
                  >
                    {showKey ? '隐藏' : '显示'}
                  </ActionButton>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Toggle
                    label="记住 Key（localStorage）"
                    checked={remember}
                    onChange={setRemember}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    从
                    {' '}
                    <a
                      href="https://platform.deepseek.com/api_keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      开放平台
                    </a>
                    {' '}
                    获取
                  </span>
                </div>

                <Field label="模型" hint="图片输入用 deepseek-flash">
                  <input
                    value={model}
                    spellCheck={false}
                    onChange={event => setModel(event.target.value)}
                    className={cn(INPUT_CLASS, 'md-code')}
                  />
                </Field>

                {probe.message !== '' && (
                  <p
                    className={cn(
                      'text-[11px] leading-4',
                      probe.status === 'ok'
                        ? 'text-[var(--md-sys-color-primary)]'
                        : probe.status === 'fail' ? 'text-[var(--md-sys-color-error)]' : 'text-muted-foreground',
                    )}
                  >
                    {probe.message}
                  </p>
                )}
              </Panel>

              <Panel
                title="2 · 标志牌图片"
                hint={`长边自动压到 ${AI_IMAGE_MAX_EDGE}px，发送与存档都不占地方`}
                actions={(
                  <ActionButton
                    variant="tonal"
                    onClick={() => fileRef.current?.click()}
                    disabled={reading || running}
                  >
                    {reading ? '读取中…' : image ? '换一张' : '选择图片'}
                  </ActionButton>
                )}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    if (file) void loadFile(file)
                  }}
                />

                <div
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault()
                    setDragging(false)
                    const file = event.dataTransfer.files?.[0]
                    if (file) void loadFile(file)
                  }}
                  className={cn(
                    'flex min-h-40 flex-col items-center justify-center gap-2',
                    'rounded-[var(--md-sys-shape-corner-small)] border border-dashed px-3 py-4',
                    dragging
                      ? 'border-[var(--md-sys-color-primary)] bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)]'
                      : 'border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-lowest)]',
                  )}
                >
                  {image
                    ? (
                        <div className="space-y-1.5 text-center">
                          <img
                            src={image.dataUrl}
                            alt={image.name}
                            className="mx-auto max-h-48 max-w-full rounded-[var(--md-sys-shape-corner-extra-small)] object-contain"
                          />
                          <p className="truncate text-[11px] text-muted-foreground md-code">
                            {image.name} · {image.width}×{image.height}px · {humanBytes(image.bytes)}
                          </p>
                        </div>
                      )
                    : (
                        <div className="space-y-1 text-center">
                          <p className="text-xs text-muted-foreground">
                            把标志牌照片拖到这里，或按
                            {' '}
                            <kbd className="rounded border border-[var(--md-sys-color-outline-variant)] px-1 text-[10px]">
                              Ctrl
                            </kbd>
                            {' '}
                            +
                            {' '}
                            <kbd className="rounded border border-[var(--md-sys-color-outline-variant)] px-1 text-[10px]">
                              V
                            </kbd>
                            {' '}
                            粘贴
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            支持 PNG / JPEG / WebP / GIF
                          </p>
                        </div>
                      )}
                </div>

                {imageError && (
                  <p className="text-[11px] text-[var(--md-sys-color-error)]">{imageError}</p>
                )}

                {image && (
                  <ActionButton
                    variant="ghost"
                    onClick={() => {
                      setImage(null)
                      resetRun()
                    }}
                    disabled={running}
                  >
                    移除图片
                  </ActionButton>
                )}
              </Panel>

              <Panel title="3 · 补充要求（可选）" hint="AI 会连同图片一起读">
                <textarea
                  value={hint}
                  placeholder="例如：底色改成蓝色；出口编号放在右下角；文字尽量大一点"
                  onChange={(event) => {
                    setHint(event.target.value)
                    if (run.status !== 'running') resetRun()
                  }}
                  className={TEXTAREA_CLASS}
                />
              </Panel>
            </div>

            {/* ---------------- 右列：结果 ---------------- */}
            <div className="space-y-3">
              <Panel
                title="4 · 分析结果"
                hint={running ? '正在读图并排版…' : spec ? '确认无误后点下方「应用到画布」' : '还没有结果'}
              >
                {running && (
                  <EmptyHint>
                    已等待
                    {' '}
                    {elapsed}
                    {' '}
                    秒。视觉调用通常 10~30 秒，请勿关闭窗口。
                  </EmptyHint>
                )}

                {!running && run.status === 'error' && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-[var(--md-sys-color-error)]">
                      {run.error}
                    </p>
                    {run.detail && (
                      <p className="max-h-32 overflow-auto text-[10px] leading-4 text-muted-foreground md-code">
                        {run.detail}
                      </p>
                    )}
                  </div>
                )}

                {!running && !spec && run.status !== 'error' && (
                  <EmptyHint>
                    AI 会读出路牌上的文字、出口编号、底色与图标，
                    生成「牌面尺寸 + 元素清单 + 数据字段」，先给你审阅。
                  </EmptyHint>
                )}

                {!running && spec && preview && (
                  <div className="space-y-2">
                    {run.result?.spec.note && (
                      <p className="rounded-[var(--md-sys-shape-corner-extra-small)] bg-[var(--md-sys-color-surface-container)] px-2 py-1.5 text-[11px] leading-5 text-foreground">
                        {run.result.spec.note}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <span className="rounded-full bg-[var(--md-sys-color-secondary-container)] px-2 py-0.5 text-[var(--md-sys-color-on-secondary-container)]">
                        {preview.stats.width}×{preview.stats.height} bit
                      </span>
                      <span className="rounded-full bg-[var(--md-sys-color-secondary-container)] px-2 py-0.5 text-[var(--md-sys-color-on-secondary-container)]">
                        {preview.stats.variants} 变体
                      </span>
                      <span className="rounded-full bg-[var(--md-sys-color-secondary-container)] px-2 py-0.5 text-[var(--md-sys-color-on-secondary-container)]">
                        {preview.stats.elements} 元素
                      </span>
                      <span className="rounded-full bg-[var(--md-sys-color-secondary-container)] px-2 py-0.5 text-[var(--md-sys-color-on-secondary-container)]">
                        {preview.stats.fields} 字段
                      </span>
                      <span className="rounded-full border border-[var(--md-sys-color-outline-variant)] px-2 py-0.5 text-muted-foreground">
                        {baseplateLabel(spec.baseplate)}
                      </span>
                    </div>

                    {spec.variants.map((variant, variantIndex) => (
                      <div key={variantIndex} className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {spec.variants.length > 1
                            ? `变体 ${variantIndex + 1}${variant.nameZh ? ` · ${variant.nameZh}` : ''}`
                            : '元素'}
                          （{variant.items.length}）
                          {variant.registryId && (
                            <span className="ml-1 font-normal text-muted-foreground md-code">
                              {variant.registryId}
                            </span>
                          )}
                        </p>
                        <ul className="max-h-40 space-y-0.5 overflow-auto">
                          {variant.items.map((item, index) => (
                            <li
                              key={`${item.kind}-${index}`}
                              className="truncate text-[11px] text-foreground md-code"
                            >
                              {specItemSummary(item)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}

                    {spec.fields.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          数据字段（{spec.fields.length}）
                        </p>
                        <ul className="max-h-24 space-y-0.5 overflow-auto">
                          {spec.fields.map(field => (
                            <li key={field.key} className="truncate text-[11px] md-code">
                              <span className="text-foreground">{field.key}</span>
                              <span className="text-muted-foreground">
                                {' '}· {field.label ?? field.key}
                                {field.default ? ` · 默认 ${field.default}` : ' · 默认空'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {preview.warnings.length > 0 && (
                      <div className="space-y-0.5 rounded-[var(--md-sys-shape-corner-extra-small)] bg-[var(--md-sys-color-surface-container)] px-2 py-1.5">
                        {preview.warnings.map((warning, index) => (
                          <p
                            key={index}
                            className="text-[10px] leading-4 text-muted-foreground"
                          >
                            {warning}
                          </p>
                        ))}
                      </div>
                    )}

                    {run.result && run.result.warnings.length > 0 && (
                      <div className="space-y-0.5 rounded-[var(--md-sys-shape-corner-extra-small)] bg-[var(--md-sys-color-surface-container)] px-2 py-1.5">
                        {run.result.warnings.map((warning, index) => (
                          <p
                            key={index}
                            className="text-[10px] leading-4 text-muted-foreground"
                          >
                            {warning}
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <Toggle
                        label="把这张图设为描图底图（不参与生成）"
                        checked={useAsReference}
                        onChange={setUseAsReference}
                      />
                    </div>

                    {run.result && (
                      <p className="text-[10px] text-muted-foreground">
                        {run.result.attempts > 1 ? '自动修复过一次 · ' : ''}
                        {run.result.model}
                        {run.result.usage?.total_tokens
                          ? ` · ${run.result.usage.total_tokens} tokens`
                          : ''}
                        {elapsed > 0 ? ` · ${elapsed}s` : ''}
                      </p>
                    )}

                    <details className="rounded-[var(--md-sys-shape-corner-extra-small)] border border-[var(--md-sys-color-outline-variant)] p-2">
                      <summary className="cursor-pointer text-[11px] text-muted-foreground">
                        查看模型原始返回（调试用）
                      </summary>
                      <div className="mt-2">
                        <CodeBlock code={run.result?.raw ?? ''} className="max-h-56" />
                      </div>
                    </details>
                  </div>
                )}
              </Panel>

              {notice && (
                <p className="rounded-[var(--md-sys-shape-corner-extra-small)] bg-[var(--md-sys-color-secondary-container)] px-3 py-2 text-[11px] text-[var(--md-sys-color-on-secondary-container)]">
                  {notice}
                </p>
              )}

              <Panel title="接下来怎么做" hint="AI 只写工程数据，生成由你手动触发">
                <ol className="list-decimal space-y-1 pl-4 text-[11px] leading-5 text-muted-foreground">
                  <li>点「应用到画布」：版面写进当前工程，可用 Ctrl+Z 整体撤回。</li>
                  <li>在画布上微调位置、字号，或改「数据字段」里的默认值。</li>
                  <li>
                    切到「生成代码」tab，自己确认命名后点
                    <span className="text-foreground"> ZIP / 写入文件 </span>
                    —— AI 不会自动生成或写盘。
                  </li>
                </ol>
              </Panel>
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] px-4 py-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <ActionButton
              variant="ghost"
              onClick={close}
              disabled={running}
            >
              关闭
            </ActionButton>
            <Chip
              active={false}
              onClick={() => {
                setImage(null)
                resetRun()
                setHint('')
              }}
              title="清空图片、结果与补充要求"
            >
              清空重来
            </Chip>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <ActionButton
              variant="outlined"
              onClick={() => {
                void runAnalysis()
              }}
              disabled={!canRun}
              title={image ? '让 AI 读这张图并生成版面' : '先选一张标志牌图片'}
            >
              {running ? '分析中…' : spec ? '重新分析' : '让 AI 配置版面'}
            </ActionButton>
            <ActionButton
              onClick={apply}
              disabled={!spec || running}
              title="把 AI 的版面写进当前工程（可 Ctrl+Z 撤回）"
            >
              应用到画布
            </ActionButton>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default AiWindow
