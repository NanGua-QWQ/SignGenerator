import {
  useFont,
} from '@/fonts/FontContext'
import type {
  FreeArrowDirection, FreeSignVariant, Sign,
} from '@/lib/types'

import {
  NumberedExitSignNode,
} from './exit/numbered-exit'
import {
  ExitDirectionArrow,
} from './exit/right-exit-arrow'
import {
  RouteSignNode,
} from './sign/route-sign'
import {
  OutlinedText, textLayout, WHITE,
} from './svg-text'

const WIDTH = 1000
const PADDING = 48
const BOARD_Y = 118
const EXIT_SIGN_WIDTH = 284
const CONTENT_VERTICAL_PADDING = 24
const ROW_HEIGHT = 158
const TOP_BAR_HEIGHT = 72
const CUSTOM_EXIT_HEIGHT = 86
const ARROW_FOOTER_HEIGHT = 166
const PRESET_ARROW_CENTER_OFFSET = 90
const DIRECTION_PLATE_SIZE = 66

const BOARD_COLORS = {
  green: '#359b47',
  blue: '#1769aa',
  brown: '#8a5a36',
} as const

const VARIANT_ARROW: Partial<Record<FreeSignVariant, FreeArrowDirection>> = {
  'left-exit-down': 'left-down',
  'left-exit-up': 'left-up',
  'straight': 'front',
  'lane-guidance': 'down',
  'right-exit-down': 'right-down',
  'right-exit-up': 'right-up',
}

type SignFont = Parameters<typeof textLayout>[0]

function supportedText(font: SignFont, text: string) {
  return Array.from(text).filter((character) => {
    const codePoint = character.codePointAt(0)
    return character === ' ' || codePoint !== undefined && font.glyphForCodePoint(codePoint).id !== 0
  }).join('')
}

function FittedText({
  font,
  text,
  x,
  y,
  width,
  height,
}: {
  font: SignFont
  text: string
  x: number
  y: number
  width: number
  height: number
}) {
  const safeText = supportedText(font, text)
  if (!safeText || width <= 0 || height <= 0) {return null}

  const glyphCount = Array.from(safeText).length
  let fittedHeight = Math.max(6, Math.floor(height))
  for (; fittedHeight > 6; fittedHeight -= 1) {
    const layout = textLayout(font, safeText, fittedHeight, {
      scaleMode: 'reference',
      referenceText: safeText,
    })
    if (layout.usedWidth <= width) {break}
  }
  const fittedLayout = textLayout(font, safeText, fittedHeight, {
    scaleMode: 'reference',
    referenceText: safeText,
  })
  const availableGap = glyphCount > 1
    ? Math.max(0, (width - fittedLayout.usedWidth) / (glyphCount - 1))
    : 0
  return <OutlinedText
    font={font}
    text={safeText}
    startX={x}
    startY={y + (height - fittedHeight) / 2}
    width={width}
    height={fittedHeight}
    fill={WHITE}
    options={{
      align: 'center',
      maxGap: Math.min(3, availableGap),
      minGap: 0,
      scaleMode: 'reference',
      referenceText: safeText,
    }}
  />
}

function evenlySpacedLineWidth(font: SignFont, text: string, height: number) {
  const characters = Array.from(text)
  const widths = characters.map(character => textLayout(font, character, height, {
    scaleMode: 'reference',
    referenceText: '道路出口',
  }).usedWidth)
  const characterWidth = Math.max(0, ...widths)
  const gap = Math.min(14, Math.max(3, height * 0.16))
  return characterWidth * characters.length + gap * Math.max(0, characters.length - 1)
}

function EvenlySpacedLine({
  font,
  text,
  x,
  y,
  width,
  height,
}: {
  font: SignFont
  text: string
  x: number
  y: number
  width: number
  height: number
}) {
  const characters = Array.from(text)
  let fittedHeight = Math.max(6, Math.floor(height))
  for (; fittedHeight > 6; fittedHeight -= 1) {
    if (evenlySpacedLineWidth(font, text, fittedHeight) <= width) {break}
  }
  const widths = characters.map(character => textLayout(font, character, fittedHeight, {
    scaleMode: 'reference',
    referenceText: '道路出口',
  }).usedWidth)
  const characterWidth = Math.max(0, ...widths)
  const gap = Math.min(14, Math.max(3, fittedHeight * 0.16))
  const contentWidth = characterWidth * characters.length
    + gap * Math.max(0, characters.length - 1)
  const startX = x + (width - contentWidth) / 2
  const startY = y + (height - fittedHeight) / 2

  return <>
    {characters.map((character, index) => character === ' ' ? null : <OutlinedText
      key={`${character}-${index}`}
      font={font}
      text={character}
      startX={startX + index * (characterWidth + gap)}
      startY={startY}
      width={characterWidth}
      height={fittedHeight}
      fill={WHITE}
      options={{
        align: 'center',
        maxGap: 0,
        minGap: 0,
        scaleMode: 'reference',
        referenceText: '道路出口',
      }}
    />)}
  </>
}

function lineWidthAtHeight(font: SignFont, text: string, height: number, evenlySpaced: boolean) {
  if (evenlySpaced) {return evenlySpacedLineWidth(font, text, height)}
  const layout = textLayout(font, text, height, {
    scaleMode: 'reference',
    referenceText: text,
  })
  return layout.usedWidth + Math.max(0, Array.from(text).length - 1)
}

function balancedLines(text: string, english: boolean) {
  if (!english) {
    const characters = Array.from(text)
    const splitAt = Math.ceil(characters.length / 2)
    return [characters.slice(0, splitAt).join(''), characters.slice(splitAt).join('')]
  }

  const words = text.trim().split(/\s+/)
  if (words.length < 2) {
    const characters = Array.from(text)
    const splitAt = Math.ceil(characters.length / 2)
    return [characters.slice(0, splitAt).join(''), characters.slice(splitAt).join('')]
  }
  let splitAt = 1
  let bestDifference = Number.POSITIVE_INFINITY
  for (let index = 1; index < words.length; index += 1) {
    const left = words.slice(0, index).join(' ')
    const right = words.slice(index).join(' ')
    const difference = Math.abs(left.length - right.length)
    if (difference < bestDifference) {
      splitAt = index
      bestDifference = difference
    }
  }
  return [words.slice(0, splitAt).join(' '), words.slice(splitAt).join(' ')]
}

function AdaptiveTextBlock({
  font,
  text,
  x,
  y,
  width,
  height,
  english = false,
  minSingleLineHeight,
}: {
  font: SignFont
  text: string
  x: number
  y: number
  width: number
  height: number
  english?: boolean
  minSingleLineHeight: number
}) {
  const safeText = supportedText(font, text)
  if (!safeText) {return null}
  const evenlySpaced = !english && /[\u3400-\u9fff]/u.test(safeText)
  const shouldWrap = lineWidthAtHeight(
    font,
    safeText,
    minSingleLineHeight,
    evenlySpaced,
  ) > width
  const lines = shouldWrap ? balancedLines(safeText, english) : [safeText]
  const lineGap = lines.length > 1 ? english ? 3 : 7 : 0
  const lineHeight = (height - lineGap * (lines.length - 1)) / lines.length

  return <>
    {lines.map((line, index) => {
      const lineY = y + index * (lineHeight + lineGap)
      return evenlySpaced ? <EvenlySpacedLine
        key={`${line}-${index}`}
        font={font}
        text={line}
        x={x}
        y={lineY}
        width={width}
        height={lineHeight}
      /> : <FittedText
        key={`${line}-${index}`}
        font={font}
        text={line}
        x={x}
        y={lineY}
        width={width}
        height={lineHeight}
      />
    })}
  </>
}

function FreeArrow({
  direction,
  x,
  y,
  scale = 1.7,
}: {
  direction: FreeArrowDirection
  x: number
  y: number
  scale?: number
}) {
  if (direction === 'front') {
    return <ExitDirectionArrow direction="front" x={x} y={y} scale={scale} />
  }
  if (direction === 'down') {
    return <g transform={`translate(0 ${2 * y}) scale(1 -1)`}>
      <ExitDirectionArrow direction="front" x={x} y={y} scale={scale} />
    </g>
  }
  const side = direction.startsWith('left') ? 'left' : 'right'
  const arrow = <ExitDirectionArrow direction={side} x={x} y={y} scale={scale} />
  return direction.endsWith('down')
    ? <g transform={`translate(0 ${2 * y}) scale(1 -1)`}>{arrow}</g>
    : arrow
}

function DistanceLabel({
  font,
  value,
  unit,
  x,
  y,
  width,
  height,
}: {
  font: Parameters<typeof textLayout>[0]
  value: string
  unit: 'm' | 'km'
  x: number
  y: number
  width: number
  height: number
}) {
  const number = value || '0'
  const numberHeight = 74
  const numberGap = 8
  const numberLayout = textLayout(font, number, numberHeight, {
    scaleMode: 'reference',
    referenceText: number,
  })
  const numberWidth = numberLayout.usedWidth
    + numberGap * Math.max(0, Array.from(number).length - 1)
  const unitHeight = 34
  const unitGap = 1
  const unitLayout = textLayout(font, unit, unitHeight, {
    scaleMode: 'reference',
    referenceText: unit,
  })
  const unitWidth = unitLayout.usedWidth + unitGap * Math.max(0, unit.length - 1)
  const contentGap = 12
  const contentWidth = numberWidth + contentGap + unitWidth
  const startX = x + (width - contentWidth) / 2
  const numberY = y + (height - numberHeight) / 2

  return <g>
    <OutlinedText
      font={font}
      text={number}
      startX={startX}
      startY={numberY}
      width={numberWidth}
      height={numberHeight}
      fill={WHITE}
      options={{
        align: 'start',
        maxGap: numberGap,
        minGap: numberGap,
        scaleMode: 'reference',
        referenceText: number,
      }}
    />
    <OutlinedText
      font={font}
      text={unit}
      startX={startX + numberWidth + contentGap}
      startY={numberY + numberHeight - unitHeight - 5}
      width={unitWidth}
      height={unitHeight}
      fill={WHITE}
      options={{
        align: 'start',
        maxGap: unitGap,
        minGap: unitGap,
        scaleMode: 'reference',
        referenceText: unit,
      }}
    />
  </g>
}

export function FreeModeSign({
  sign,
  roadSignList,
}: {
  sign: Sign
  roadSignList: Sign[]
}) {
  const fontChinese = useFont('a')
  const fontLatin = useFont('b')
  const config = sign.freeConfig
  const isLeftExit = config.variant === 'left-exit-down' || config.variant === 'left-exit-up'
  const showExitNumberSign = config.showExitNumberSign && Boolean(config.exitNumber)
  const boardY = showExitNumberSign ? BOARD_Y : 0
  const topBarHeight = config.showTopBar ? TOP_BAR_HEIGHT : 0
  const customExitHeight = config.customExitNameEnabled ? CUSTOM_EXIT_HEIGHT : 0
  const headerHeight = topBarHeight + customExitHeight
  const presetArrow = VARIANT_ARROW[config.variant]
  const arrowFooterHeight = presetArrow || config.showExitDistance ? ARROW_FOOTER_HEIGHT : 0
  const rowsTop = boardY + headerHeight + CONTENT_VERTICAL_PADDING
  const arrowTop = rowsTop + config.rows.length * ROW_HEIGHT
  const boardHeight = headerHeight
    + CONTENT_VERTICAL_PADDING * 2
    + config.rows.length * ROW_HEIGHT
    + arrowFooterHeight
  const height = boardY + boardHeight
  const rowsWidth = WIDTH - PADDING * 2
  const boardColor = BOARD_COLORS[config.background]

  return <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={`0 0 ${WIDTH} ${height}`}
    role="img"
    aria-label={`${sign.name || '自由标志'}，${config.rows.length} 行内容`}
  >
    <g opacity={config.opacity}>
      {showExitNumberSign && <NumberedExitSignNode
        exitNumber={config.exitNumber}
        exitSuffix={config.exitSuffixEnabled ? config.exitSuffix : ''}
        fontChinese={fontChinese}
        fontLatin={fontLatin}
        x={isLeftExit ? 7 : WIDTH - 7 - EXIT_SIGN_WIDTH}
        y={1}
        width={EXIT_SIGN_WIDTH}
        color={boardColor}
        exitLabel={isLeftExit ? 'left-exit' : 'exit'}
      />}

      <rect y={boardY} width={WIDTH} height={boardHeight} rx="24" fill={boardColor} />
      <rect
        x="7"
        y={boardY + 7}
        width={WIDTH - 14}
        height={boardHeight - 14}
        rx="18"
        fill="none"
        stroke={WHITE}
        strokeWidth="8"
      />
      {config.showTopBar && <>
        <FittedText
          font={fontChinese}
          text={config.topBarText}
          x={PADDING + 12}
          y={boardY + 16}
          width={WIDTH - PADDING * 2 - 24}
          height={38}
        />
        <line
          x1={20}
          x2={WIDTH - 20}
          y1={boardY + TOP_BAR_HEIGHT}
          y2={boardY + TOP_BAR_HEIGHT}
          stroke={WHITE}
          strokeWidth="4"
        />
      </>}

      {config.customExitNameEnabled && <>
        <FittedText
          font={fontChinese}
          text={config.customExitName}
          x={PADDING}
          y={boardY + topBarHeight + 14}
          width={WIDTH - PADDING * 2}
          height={54}
        />
        <line
          x1={20}
          x2={WIDTH - 20}
          y1={boardY + headerHeight}
          y2={boardY + headerHeight}
          stroke={WHITE}
          strokeWidth="4"
        />
      </>}

      {config.rows.map((row, rowIndex) => {
        const rowY = rowsTop + rowIndex * ROW_HEIGHT
        const cellWidth = rowsWidth / row.elements.length
        const startsCenterDividerRun = row.showCenterDivider
          && (rowIndex === 0 || !config.rows[rowIndex - 1].showCenterDivider)
        let centerDividerRunLength = 1
        while (
          startsCenterDividerRun
          && config.rows[rowIndex + centerDividerRunLength]?.showCenterDivider
        ) {
          centerDividerRunLength += 1
        }
        return <g key={row.id}>
          {rowIndex > 0 && config.rows[rowIndex - 1].showDividerAfter && <line
            x1={PADDING}
            x2={WIDTH - PADDING}
            y1={rowY}
            y2={rowY}
            stroke={WHITE}
            strokeOpacity="0.55"
            strokeWidth="2"
          />}
          {startsCenterDividerRun && <line
            x1={WIDTH / 2}
            x2={WIDTH / 2}
            y1={rowY}
            y2={rowY + ROW_HEIGHT * centerDividerRunLength}
            stroke={WHITE}
            strokeWidth="5"
          />}
          {row.elements.map((element, elementIndex) => {
            const x = PADDING + elementIndex * cellWidth
            const centerX = x + cellWidth / 2
            if (element.type === 'arrow') {
              return <FreeArrow
                key={element.id}
                direction={element.arrowDirection}
                x={centerX}
                y={rowY + ROW_HEIGHT / 2}
                scale={2.05}
              />
            }
            if (element.type === 'road-sign') {
              const roadSign = roadSignList.find(item => item.id === element.roadSignId)
              if (!roadSign) {
                return <FittedText
                  key={element.id}
                  font={fontChinese}
                  text="请选择道路标识"
                  x={x + 12}
                  y={rowY + 64}
                  width={cellWidth - 24}
                  height={42}
                />
              }
              const code = roadSign.template === 'urban-expressway-road-name' || roadSign.template === 'urban-road-name'
                ? roadSign.urbanRoadName
                : roadSign.code
              const kind = roadSign.template === 'urban-expressway-road-name'
                ? 'urban-expressway'
                : roadSign.template === 'urban-road-name' ? 'urban-road' : roadSign.kind
              const hasDirection = Boolean(element.cardinalDirection)
              const directionIsLeading = centerX <= WIDTH / 2
              const sidePadding = 12
              const directionGap = 12
              const directionSpace = hasDirection
                ? DIRECTION_PLATE_SIZE + directionGap
                : 0
              const routeX = directionIsLeading
                ? x + sidePadding + directionSpace
                : x + sidePadding
              const routeWidth = cellWidth - sidePadding * 2 - directionSpace
              const directionX = directionIsLeading
                ? x + sidePadding
                : x + cellWidth - sidePadding - DIRECTION_PLATE_SIZE
              return <g key={element.id}>
                {hasDirection && <g aria-label={`${element.cardinalDirection}方位`}>
                  <rect
                    x={directionX}
                    y={rowY + (ROW_HEIGHT - DIRECTION_PLATE_SIZE) / 2}
                    width={DIRECTION_PLATE_SIZE}
                    height={DIRECTION_PLATE_SIZE}
                    fill={WHITE}
                  />
                  <OutlinedText
                    font={fontChinese}
                    text={element.cardinalDirection}
                    startX={directionX + 8}
                    startY={rowY + (ROW_HEIGHT - DIRECTION_PLATE_SIZE) / 2 + 8}
                    width={DIRECTION_PLATE_SIZE - 16}
                    height={DIRECTION_PLATE_SIZE - 16}
                    fill={boardColor}
                  />
                </g>}
                <RouteSignNode
                  code={code}
                  kind={kind}
                  provinceLabel={roadSign.provinceLabel}
                  threeDigitDescend={roadSign.threeDigitDescend}
                  fontChinese={fontChinese}
                  fontLatin={fontLatin}
                  x={routeX}
                  y={rowY + 24}
                  width={routeWidth}
                  height={ROW_HEIGHT - 48}
                />
              </g>
            }
            const iconWidth = (element.leadingIcon ? 46 : 0) + (element.trailingIcon ? 46 : 0)
            const textX = x + 12 + (element.leadingIcon ? 46 : 0)
            const textWidth = Math.max(40, cellWidth - 24 - iconWidth)
            return <g key={element.id}>
              {element.leadingIcon && <FreeArrow direction="right-up" x={x + 30} y={rowY + ROW_HEIGHT / 2} scale={0.72} />}
              <AdaptiveTextBlock
                font={fontChinese}
                text={element.text || '文本'}
                x={textX}
                y={rowY + (element.englishEnabled ? 18 : 38)}
                width={textWidth}
                height={element.englishEnabled ? 66 : 82}
                minSingleLineHeight={element.englishEnabled ? 24 : 32}
              />
              {element.englishEnabled && <AdaptiveTextBlock
                font={fontLatin}
                text={element.english || 'ENGLISH'}
                x={textX}
                y={rowY + 94}
                width={textWidth}
                height={34}
                english
                minSingleLineHeight={12}
              />}
              {element.trailingIcon && <FreeArrow direction="right-up" x={x + cellWidth - 30} y={rowY + ROW_HEIGHT / 2} scale={0.72} />}
            </g>
          })}
        </g>
      })}

      {presetArrow && <g>
        <FreeArrow
          direction={presetArrow}
          x={isLeftExit ? 220 : config.showExitDistance ? WIDTH - 220 : WIDTH / 2}
          y={arrowTop + PRESET_ARROW_CENTER_OFFSET}
          scale={2.25}
        />
      </g>}

      {config.showExitDistance && <g>
        <DistanceLabel
          font={fontLatin}
          value={config.exitDistance}
          unit={config.exitDistanceUnit}
          x={isLeftExit ? WIDTH - PADDING - 430 : PADDING}
          y={arrowTop}
          width={430}
          height={ARROW_FOOTER_HEIGHT}
        />
      </g>}
    </g>
  </svg>
}
