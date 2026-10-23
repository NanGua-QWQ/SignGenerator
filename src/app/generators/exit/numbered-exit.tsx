import numberedExitTemplate from '@/generators/template/数字出口.svg'

import {
  GREEN, WHITE, OutlinedText, textLayout,
} from '../svg-text'

import type {
  Font,
} from '@pdf-lib/fontkit'

export const NUMBERED_EXIT_WIDTH = 221.64
export const NUMBERED_EXIT_HEIGHT = 91.34
export const NUMBERED_EXIT_RIGHT_MARGIN = 0
export const NUMBERED_EXIT_TOP_SPACE = 104.34
export const NUMBERED_EXIT_Y = -98.34

const VIEW_BOX = '0 0 221.64 91.34'
const NUMBER_MAX_HEIGHT = 38
const NUMBER_MIN_HEIGHT = 22
const NUMBER_BOX_X = 96
const NUMBER_BOX_WIDTH = 108
const NUMBER_REFERENCE = '0123456789'
const SUFFIX_REFERENCE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ-'

const baseMarkup = numberedExitTemplate
  .replace(/<!--rotationCenter:[\s\S]*?-->/, '')
  .replace(/^[\s\S]*?<svg[^>]*>/, '')
  .replace(/<\/svg>[\s\S]*$/, '')

interface NumberedExitSignNodeProps {
  exitNumber: string
  exitSuffix?: string
  fontChinese: Font
  fontLatin: Font
  x: number
  y: number
  width?: number
  color?: string
  exitLabel?: 'exit' | 'left-exit'
}

const cleanExitNumber = (value: string) =>

  String(value || '')
    .replace(/\D/g, '')
    .slice(0, 4) || '360'

function fittedNumberParts(font: Font, number: string, suffix: string) {
  for (let height = NUMBER_MAX_HEIGHT; height >= NUMBER_MIN_HEIGHT; height -= 1) {
    const numberGap = 2
    const numberWidth = textLayout(font, number, height, {
      scaleMode: 'reference',
      referenceText: NUMBER_REFERENCE,
    }).usedWidth
      + numberGap * Math.max(0, number.length - 1)
    const suffixHeight = suffix ? Math.max(13, Math.round(height * 0.54)) : 0
    const suffixGap = 1
    const suffixWidth = suffix
      ? textLayout(font, suffix, suffixHeight, {
        scaleMode: 'reference',
        referenceText: SUFFIX_REFERENCE,
      }).usedWidth
        + suffixGap * Math.max(0, suffix.length - 1)
      : 0
    const contentGap = suffix ? 3 : 0
    if (numberWidth + contentGap + suffixWidth <= NUMBER_BOX_WIDTH) {
      return {
        contentGap,
        height,
        numberGap,
        numberWidth,
        suffixGap,
        suffixHeight,
        suffixWidth,
      }
    }
  }
  const height = NUMBER_MIN_HEIGHT
  const suffixHeight = suffix ? 13 : 0
  return {
    contentGap: suffix ? 2 : 0,
    height,
    numberGap: 1,
    numberWidth: textLayout(font, number, height, {
      scaleMode: 'reference',
      referenceText: NUMBER_REFERENCE,
    }).usedWidth
      + Math.max(0, number.length - 1),
    suffixGap: 0,
    suffixHeight,
    suffixWidth: suffix ? textLayout(font, suffix, suffixHeight, {
      scaleMode: 'reference',
      referenceText: SUFFIX_REFERENCE,
    }).usedWidth : 0,
  }
}

export function NumberedExitSignNode({
  exitNumber,
  exitSuffix = '',
  fontChinese,
  fontLatin,
  x,
  y,
  width = NUMBERED_EXIT_WIDTH,
  color = GREEN,
  exitLabel = 'exit',
}: NumberedExitSignNodeProps) {
  const suffix = String(exitSuffix || '')
    .toUpperCase()
    .replace(/[^A-Z-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-/, '')
    .slice(0, 3)
  const number = cleanExitNumber(exitNumber)
  const numberParts = fittedNumberParts(fontLatin, number, suffix)
  const contentWidth = numberParts.numberWidth
    + numberParts.contentGap
    + numberParts.suffixWidth
  const numberX = NUMBER_BOX_X + (NUMBER_BOX_WIDTH - contentWidth) / 2
  const numberY = 28 + (NUMBER_MAX_HEIGHT - numberParts.height) / 2
  const renderedHeight = width * NUMBERED_EXIT_HEIGHT / NUMBERED_EXIT_WIDTH
  const coloredMarkup = color === GREEN ? baseMarkup : baseMarkup.replace(/#359b47/gi, color)

  return (
    <svg x={x} y={y} width={width} height={renderedHeight} viewBox={VIEW_BOX} aria-hidden="true">
      <g dangerouslySetInnerHTML={{
        __html: coloredMarkup,
      }} />
      {exitLabel === 'left-exit' ? <>
        <OutlinedText
          font={fontChinese}
          text="左"
          startX={31}
          startY={8}
          width={38}
          height={25}
          fill={WHITE}
        />
        <OutlinedText
          font={fontChinese}
          text="出口"
          startX={14}
          startY={43}
          width={72}
          height={27}
          fill={WHITE}
          options={{
            maxGap: 10,
            minGap: 10,
          }}
        />
      </> : <OutlinedText
        font={fontChinese}
        text="出口"
        startX={15}
        startY={30}
        width={70}
        height={30}
        fill={WHITE}
        options={{
          maxGap: 12,
          minGap: 12,
        }}
      />}
      <OutlinedText
        font={fontLatin}
        text={number}
        startX={numberX}
        startY={numberY}
        width={numberParts.numberWidth}
        height={numberParts.height}
        fill={color}
        options={{
          align: 'start',
          maxGap: numberParts.numberGap,
          minGap: numberParts.numberGap,
          scaleMode: 'reference',
          referenceText: NUMBER_REFERENCE,
        }}
      />
      {suffix && <OutlinedText
        font={fontLatin}
        text={suffix}
        startX={numberX + numberParts.numberWidth + numberParts.contentGap}
        startY={numberY + numberParts.height - numberParts.suffixHeight - 2}
        width={numberParts.suffixWidth}
        height={numberParts.suffixHeight}
        fill={color}
        options={{
          align: 'start',
          maxGap: numberParts.suffixGap,
          minGap: numberParts.suffixGap,
          scaleMode: 'reference',
          referenceText: SUFFIX_REFERENCE,
        }}
      />}
    </svg>
  )
}

export const expandCanvasForNumberedExit = (svg: string, width: number, height: number) =>
  svg
    .replace(/width="[^"]+"/, `width="${width}"`)
    .replace(/height="[^"]+"/, `height="${height + NUMBERED_EXIT_TOP_SPACE}"`)
    .replace(
      /viewBox="[^"]+"/,
      `viewBox="0,${-NUMBERED_EXIT_TOP_SPACE},${width},${height + NUMBERED_EXIT_TOP_SPACE}"`,
    )
