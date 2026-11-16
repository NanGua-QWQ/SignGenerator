'use client'

import {
  useState,
} from 'react'

import {
  useAtomValue, useSetAtom,
} from 'jotai'

import {
  addFieldAtom, addFieldOptionAtom, layoutProjectAtom, removeFieldAtom, removeFieldOptionAtom,
  updateFieldAtom, updateFieldOptionsAtom,
} from '@/state/studio-store'

import {
  cn,
} from '@/lib/utils'

import {
  ActionButton, Chip, EmptyHint, Field, Panel, SelectInput, TextInput, Toggle,
} from './controls'

import {
  FIELD_OPTION_PRESETS,
} from '@/lib/studio/sprites'
import {
  extractPlaceholderKeys,
} from '@/lib/studio/text'
import {
  fieldNbtKey,
} from '@/lib/studio/layout-model'

import type {
  LayoutField,
} from '@/lib/studio/layout-model'

/**
 * 数据字段面板：声明实体里可编辑的固定字段与枚举选项。
 *
 * 元素里写 `{key}` 占位符即与之联动；生成的实体会同时产出
 * `getPlaceholderValue` / `getFieldOptions` / `applyFieldOption` 三处映射。
 */
export default function FieldPanel() {
  const project = useAtomValue(layoutProjectAtom)
  const addField = useSetAtom(addFieldAtom)
  const updateField = useSetAtom(updateFieldAtom)
  const removeField = useSetAtom(removeFieldAtom)
  const addFieldOption = useSetAtom(addFieldOptionAtom)
  const removeFieldOption = useSetAtom(removeFieldOptionAtom)
  const updateFieldOptions = useSetAtom(updateFieldOptionsAtom)

  /** 整个版面上实际用到的占位符（用于标注「未被引用」的字段） */
  const usedKeys = new Set<string>()
  for (const element of project.elements) {
    const source = element.kind === 'logo' ? element.path : element.kind === 'text' ? element.text : ''
    for (const key of extractPlaceholderKeys(source)) usedKeys.add(key)
  }

  return (
    <div className="space-y-3">
      <Panel
        title="数据字段"
        hint={`共 ${project.fields.length} 个 · 元素里用 {key} 引用`}
        actions={(
          <ActionButton variant="tonal" onClick={addField} title="新增字段">
            + 字段
          </ActionButton>
        )}
      >
        {project.fields.length === 0
          ? (
              <EmptyHint>
                还没有字段。新增后，文本或贴图路径里就能写
                {' '}
                {'{text1}'}
                {' '}
                这样的占位符 ——
                生成的实体会带对应的 NBT 读写与占位符映射。
              </EmptyHint>
            )
          : (
              <div className="space-y-3">
                {project.fields.map(field => (
                  <FieldCard
                    key={field.id}
                    field={field}
                    used={usedKeys.has(field.key)}
                    onUpdate={patch => updateField({
                      id: field.id,
                      patch,
                    })}
                    onRemove={() => removeField(field.id)}
                    onAddOption={() => addFieldOption(field.id)}
                    onRemoveOption={index => removeFieldOption({
                      fieldId: field.id,
                      index,
                    })}
                    onOptions={options => updateFieldOptions({
                      fieldId: field.id,
                      options,
                    })}
                  />
                ))}
              </div>
            )}
      </Panel>

      <Panel title="字段与版面的联动" hint="说明性文字，不参与生成">
        <ul className="space-y-1 text-[11px] leading-4 text-muted-foreground">
          <li>· 元素里写 {'{text1}'}，游戏内会替换成该字段的当前值；</li>
          <li>· <span className="md-code">NBT 字段名</span> 决定存档里的键名（<span className="md-code">{'putString("…")'}</span>），留空即与占位符同名；</li>
          <li>· 枚举字段的选项会出现在游戏内的文本编辑界面，点一下即写回并同步；</li>
          <li>· 字符串字段生成 <span className="md-code">getPlaceholderValue</span>；枚举字段另外生成 <span className="md-code">getFieldOptions</span> 与 <span className="md-code">applyFieldOption</span>；</li>
          <li>· 字段是「字符串」还是「枚举」，取决于它要不要给玩家一组按钮选。</li>
        </ul>
      </Panel>
    </div>
  )
}

function FieldCard({
  field,
  used,
  onUpdate,
  onRemove,
  onAddOption,
  onRemoveOption,
  onOptions,
}: {
  field: LayoutField
  used: boolean
  onUpdate: (patch: Partial<LayoutField>) => void
  onRemove: () => void
  onAddOption: () => void
  onRemoveOption: (index: number) => void
  onOptions: (options: LayoutField['options']) => void
}) {
  /** 实际写入 NBT 的键名（留空 = 与占位符 key 同名） */
  const nbtKey = fieldNbtKey(field)
  /** 对应的 Java 字段名（key 已被收窄到 [A-Za-z0-9_]，与生成器一致） */
  const javaName = field.key

  const [dragOption, setDragOption] = useState<number | null>(null)
  const [dropOption, setDropOption] = useState<number | null>(null)

  const reorderOptions = (from: number, to: number) => {
    if (from === to) return
    const next = [...field.options]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onOptions(next)
  }

  return (
    <div className="space-y-2 rounded-[var(--md-sys-shape-corner-small)] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-lowest)] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs font-medium text-foreground">
            {field.label || field.key}
          </span>
          {!used && (
            <span className="shrink-0 rounded-full bg-[var(--md-sys-color-surface-container-highest)] px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
              未引用
            </span>
          )}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <Chip
            active={field.type === 'enum'}
            onClick={() => onUpdate({
              type: field.type === 'enum' ? 'string' : 'enum',
              options: field.type === 'enum'
                ? field.options
                : field.options.length > 0
                  ? field.options
                  : [
                      {
                        label: '选项 1', value: 'value1',
                      },
                      {
                        label: '选项 2', value: 'value2',
                      },
                    ],
            })}
            title="切换字符串 / 枚举选项"
          >
            {field.type === 'enum' ? '枚举' : '字符串'}
          </Chip>
          <ActionButton variant="danger" onClick={onRemove} title="删除字段">删除</ActionButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="占位符 key" hint="元素里写 {key}">
          <TextInput
            value={field.key}
            mono
            onChange={key => onUpdate({
              key: key.replace(/[^a-zA-Z0-9_]/g, ''),
            })}
          />
        </Field>
        <Field label="显示名">
          <TextInput value={field.label} onChange={label => onUpdate({ label })} />
        </Field>
      </div>

      <Field
        label="NBT 字段名"
        hint={`留空 = 与占位符同名（${field.key}）`}
      >
        <TextInput
          value={field.nbtKey}
          mono
          placeholder={field.key}
          onChange={nbtKey => onUpdate({
            nbtKey: nbtKey.replace(/[^a-zA-Z0-9_.-]/g, ''),
          })}
        />
      </Field>

      <Field label="默认值" hint="新建方块时的初始值">
        <TextInput value={field.defaultValue} onChange={defaultValue => onUpdate({ defaultValue })} />
      </Field>

      {field.type === 'enum' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium tracking-[0.03125rem] text-muted-foreground">
              枚举选项
            </span>
            <ActionButton variant="ghost" onClick={onAddOption} title="添加一个选项">+ 选项</ActionButton>
          </div>

          {field.options.length === 0
            ? <p className="text-[11px] text-muted-foreground">还没有选项，点「+ 选项」加一个。</p>
            : (
                <div className="space-y-1.5">
                  {field.options.map((option, index) => (
                    <div
                      key={`${field.id}-${index}`}
                      className={cn(
                        'flex items-center gap-1.5 rounded-[var(--md-sys-shape-corner-small)]',
                        dropOption === index && dragOption !== null && 'bg-[var(--md-sys-color-secondary-container)]',
                      )}
                      onDragOver={event => {
                        event.preventDefault()
                        event.dataTransfer.dropEffect = 'move'
                        setDropOption(index)
                      }}
                      onDragLeave={() => setDropOption(current => current === index ? null : current)}
                      onDrop={event => {
                        event.preventDefault()
                        if (dragOption !== null) reorderOptions(dragOption, index)
                        setDragOption(null)
                        setDropOption(null)
                      }}
                    >
                      <button
                        type="button"
                        draggable
                        title="拖拽调整选项顺序"
                        className="w-8 shrink-0 cursor-grab select-none text-center text-[10px] text-muted-foreground hover:text-foreground active:cursor-grabbing md-code"
                        onDragStart={event => {
                          setDragOption(index)
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData('text/plain', String(index))
                        }}
                        onDragEnd={() => {
                          setDragOption(null)
                          setDropOption(null)
                        }}
                      >
                        {index + 1}
                      </button>
                      <TextInput
                        value={option.label}
                        placeholder="按钮文字"
                        onChange={label => onOptions(field.options.map((item, itemIndex) =>
                          itemIndex === index ? {
                            ...item, label,
                          } : item))}
                      />
                      <TextInput
                        value={option.value}
                        mono
                        placeholder="写入值"
                        onChange={value => onOptions(field.options.map((item, itemIndex) =>
                          itemIndex === index ? {
                            ...item, value,
                          } : item))}
                      />
                      <button
                        type="button"
                        title="删除选项"
                        onClick={() => onRemoveOption(index)}
                        className="md-icon-button size-6 shrink-0 text-destructive"
                      >
                        <svg viewBox="0 0 24 24" className="size-3.5 fill-current">
                          <path d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

          {/* 常用选项预设 */}
          <details className="group">
            <summary className="cursor-pointer list-none text-[11px] text-muted-foreground hover:text-foreground">
              ▸ 载入内置选项预设（来自模组参考源码）
            </summary>
            <div className="mt-2 flex flex-wrap gap-1">
              {FIELD_OPTION_PRESETS.map(preset => (
                <Chip
                  key={preset.key}
                  active={sameOptions(field.options, preset.options)}
                  onClick={() => {
                    const options = preset.options.map(option => ({ ...option }))
                    onOptions(options)
                    // 默认值不在新选项里（最常见的是空默认值）就退回第一个，
                    // 否则生成的实体里是 `private String logo1 = "";`，
                    // 贴图路径会拼出 sign_expressway_.png 这种不存在的图
                    if (!options.some(option => option.value === field.defaultValue)) {
                      onUpdate({ defaultValue: options[0]?.value ?? '' })
                    }
                  }}
                  title={`${preset.options.length} 个选项`}
                >
                  {preset.title}
                </Chip>
              ))}
            </div>
          </details>
        </div>
      )}

      {field.type === 'string' && (
        <p className="text-[11px] leading-4 text-muted-foreground">
          字符串字段生成 <span className="md-code">getPlaceholderValue</span> 与 NBT 读写。
          需要给玩家一组预设按钮时，切换成「枚举」。
        </p>
      )}

      <div className="space-y-1 rounded-[var(--md-sys-shape-corner-extra-small)] bg-[var(--md-sys-color-surface-container-high)] px-2 py-1.5">
        <p className="text-[10px] leading-4 text-muted-foreground">
          <span className="text-[var(--md-sys-color-on-surface-variant)]">生成：</span>
          {' '}
          <span className="md-code text-foreground">
            {`nbt.putString("${nbtKey}", this.${javaName});`}
          </span>
        </p>
        <p className="text-[10px] leading-4 text-muted-foreground">
          <span className="text-[var(--md-sys-color-on-surface-variant)]">占位符：</span>
          {' '}
          <span className="md-code text-foreground">{`{${field.key}}`}</span>
          {nbtKey !== field.key && (
            <span className="ml-1">
              （NBT 键名与占位符不同名）
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

function sameOptions(
  a: LayoutField['options'],
  b: LayoutField['options'],
): boolean {
  if (a.length !== b.length) return false
  return a.every((item, index) => item.label === b[index].label && item.value === b[index].value)
}

export { SelectInput, Toggle }
