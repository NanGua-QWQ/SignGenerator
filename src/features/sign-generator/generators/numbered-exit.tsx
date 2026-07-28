import type { Font } from '@pdf-lib/fontkit'
import { GREEN, WHITE, outlinedText, textLayout } from './svg-text'
import numberedExitTemplate from '/template/数字出口.svg?raw'

export const NUMBERED_EXIT_WIDTH = 221.64
export const NUMBERED_EXIT_HEIGHT = 91.34
export const NUMBERED_EXIT_RIGHT_MARGIN = 0
export const NUMBERED_EXIT_TOP_SPACE = 104.34
export const NUMBERED_EXIT_Y = -98.34

const VIEW_BOX = '0 0 221.64 91.34'
const NUMBER_MAX_WIDTH = 84
const NUMBER_MAX_HEIGHT = 38
const NUMBER_MIN_HEIGHT = 34
const NUMBER_BOX_X = 106
const NUMBER_BOX_WIDTH = 85

const baseMarkup = numberedExitTemplate
  .replace(/<!--rotationCenter:[\s\S]*?-->/, '')
  .replace(/^[\s\S]*?<svg[^>]*>/, '')
  .replace(/<\/svg>[\s\S]*$/, '')

interface NumberedExitSignNodeProps {
  exitNumber: string
  fontChinese: Font
  fontLatin: Font
  x: number
  y: number
  width?: number
}

function cleanExitNumber(value: string): string {
  return String(value || '').replace(/\D/g, '').slice(0, 4) || '360'
}

function fittedNumberHeight(font: Font, text: string): number {
  for (let height = NUMBER_MAX_HEIGHT; height >= NUMBER_MIN_HEIGHT; height -= 1) {
    if (textLayout(font, text, height).usedWidth <= NUMBER_MAX_WIDTH) return height
  }
  return NUMBER_MIN_HEIGHT
}

export function numberedExitSignNode({ exitNumber, fontChinese, fontLatin, x, y, width = NUMBERED_EXIT_WIDTH }: NumberedExitSignNodeProps) {
  const number = cleanExitNumber(exitNumber)
  const numberHeight = fittedNumberHeight(fontLatin, number)
  const renderedHeight = width * NUMBERED_EXIT_HEIGHT / NUMBERED_EXIT_WIDTH

  return (
    <svg x={x} y={y} width={width} height={renderedHeight} viewBox={VIEW_BOX} aria-hidden="true">
      <g dangerouslySetInnerHTML={{ __html: baseMarkup }} />
      {outlinedText(fontChinese, '出口', 15, 30, 70, 30, WHITE, { maxGap: 12, minGap: 12 })}
      {outlinedText(fontLatin, number, NUMBER_BOX_X, 28, NUMBER_BOX_WIDTH, numberHeight, GREEN, { maxGap: 5, minGap: 1 })}
    </svg>
  )
}

export function expandCanvasForNumberedExit(svg: string, width: number, height: number): string {
  return svg
    .replace(/width="[^"]+"/, `width="${width}"`)
    .replace(/height="[^"]+"/, `height="${height + NUMBERED_EXIT_TOP_SPACE}"`)
    .replace(/viewBox="[^"]+"/, `viewBox="0,${-NUMBERED_EXIT_TOP_SPACE},${width},${height + NUMBERED_EXIT_TOP_SPACE}"`)
}
