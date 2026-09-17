import type {
  ReactNode,
} from 'react'

import type {
  Sign,
} from '@/lib/types'

import {
  useFont,
} from '../../fonts/FontContext'
import {
  cleanDirection,
  cleanEntranceArrowDirection,
  cleanEntranceDistance,
  cleanExitText,
} from '../generator'
import {
  RawSvg,
} from '../raw-svg'
import {
  GREEN,
  WHITE,
  escapeXml,
  OutlinedText,
  textLayout,
} from '../svg-text'

import type {
  Font,
} from '@pdf-lib/fontkit'

const WIDTH = 640
const HEIGHT = 650
const BOARD_X = 10
const BOARD_Y = 10
const BOARD_WIDTH = 608
const BOARD_HEIGHT = 610
const HEADER_BOTTOM = 210
const ARROW_SCALE = 1.45
const DESTINATION_TEXT_HEIGHT = 78
const ENTRANCE_DESTINATION_WIDTH = 250
const ENTRANCE_DESTINATION_LEFT_X = BOARD_X + 32
const ENTRANCE_DESTINATION_RIGHT_X = BOARD_X + BOARD_WIDTH - 32 - ENTRANCE_DESTINATION_WIDTH
const ENTRANCE_DESTINATION_TOP = BOARD_Y + 225
const ENTRANCE_DESTINATION_HEIGHT = 170
const ENTRANCE_DESTINATION_LINE_GAP = 10
const EXIT_DESTINATION_TOP = BOARD_Y + 240
const EXIT_DESTINATION_HEIGHT = 150
const EXIT_DESTINATION_SINGLE_WIDTH = BOARD_WIDTH - 84
const EXIT_DESTINATION_COLUMN_WIDTH = 240
const EXIT_DESTINATION_COLUMN_X = [
  BOARD_X + 42,
  BOARD_X + BOARD_WIDTH - 42 - EXIT_DESTINATION_COLUMN_WIDTH,
]

type ArrowDirection = Sign['entranceArrowDirection']

function fitDestinationHeight(font: Font, text: string, maxWidth: number) {
  const minGap = Array.from(text).length > 4 ? 4 : 8
  for (let height = DESTINATION_TEXT_HEIGHT; height >= 20; height -= 1) {
    const layout = textLayout(font, text, height, {
      scaleMode: 'reference',
      referenceText: '共和新路立交方向',
    })
    if (layout.usedWidth + minGap * Math.max(0, layout.glyphs.length - 1) <= maxWidth) {
      return height
    }
  }
  return 20
}

function destinationLines(text: string) {
  const characters = Array.from(text)
  if (characters.length <= 4) {return [text]}
  const splitAt = Math.ceil(characters.length / 2)
  return [
    characters.slice(0, splitAt).join(''),
    characters.slice(splitAt).join(''),
  ]
}

function fitExitDestinationHeight(font: Font, destinations: string[], width: number) {
  const lines = destinations.flatMap(destinationLines)
  for (let height = DESTINATION_TEXT_HEIGHT; height >= 30; height -= 1) {
    const textFits = lines.every((line) => {
      const layout = textLayout(font, line, height, {
        scaleMode: 'reference',
        referenceText: '共和新路立交方向',
      })
      return layout.usedWidth + 8 * Math.max(0, layout.glyphs.length - 1) <= width
    })
    const tallestBlock = Math.max(...destinations.map((destination) => {
      const lineCount = destinationLines(destination).length
      return lineCount * height + Math.max(0, lineCount - 1) * ENTRANCE_DESTINATION_LINE_GAP
    }))
    if (textFits && tallestBlock <= EXIT_DESTINATION_HEIGHT) {return height}
  }
  return 30
}

function ExitDestinationBlock({
  font,
  text,
  x,
  width,
  height,
}: { font: Font; text: string; x: number; width: number; height: number }) {
  const lines = destinationLines(text)
  const blockHeight = lines.length * height
    + Math.max(0, lines.length - 1) * ENTRANCE_DESTINATION_LINE_GAP
  const startY = EXIT_DESTINATION_TOP + (EXIT_DESTINATION_HEIGHT - blockHeight) / 2
  return <>
    {lines.map((line, index) => <OutlinedText
      key={`${text}-${index}`}
      font={font}
      text={line}
      startX={x}
      startY={startY + index * (height + ENTRANCE_DESTINATION_LINE_GAP)}
      width={width}
      height={height}
      fill={WHITE}
      options={{
        maxGap: 15,
        minGap: 8,
        scaleMode: 'reference',
        referenceText: '共和新路立交方向',
      }}
    />)}
  </>
}

function fitEntranceDestinationHeight(font: Font, destinations: string[]) {
  const lines = destinations.flatMap(destinationLines)
  for (let height = DESTINATION_TEXT_HEIGHT; height >= 36; height -= 1) {
    const textFits = lines.every((line) => {
      const layout = textLayout(font, line, height, {
        scaleMode: 'reference',
        referenceText: '共和新路立交方向',
      })
      return layout.usedWidth + 8 * Math.max(0, layout.glyphs.length - 1)
        <= ENTRANCE_DESTINATION_WIDTH
    })
    const tallestBlock = Math.max(...destinations.map((destination) => {
      const lineCount = destinationLines(destination).length
      return lineCount * height + Math.max(0, lineCount - 1) * ENTRANCE_DESTINATION_LINE_GAP
    }))
    if (textFits && tallestBlock <= ENTRANCE_DESTINATION_HEIGHT) {return height}
  }
  return 36
}

function EntranceDestinationBlock({
  font,
  text,
  x,
  height,
}: { font: Font; text: string; x: number; height: number }) {
  const lines = destinationLines(text)
  const blockHeight = lines.length * height
    + Math.max(0, lines.length - 1) * ENTRANCE_DESTINATION_LINE_GAP
  const startY = ENTRANCE_DESTINATION_TOP + (ENTRANCE_DESTINATION_HEIGHT - blockHeight) / 2
  return <>
    {lines.map((line, index) => <OutlinedText
      key={`${text}-${index}`}
      font={font}
      text={line}
      startX={x}
      startY={startY + index * (height + ENTRANCE_DESTINATION_LINE_GAP)}
      width={ENTRANCE_DESTINATION_WIDTH}
      height={height}
      fill={WHITE}
      options={{
        maxGap: 15,
        minGap: 8,
        scaleMode: 'reference',
        referenceText: '共和新路立交方向',
      }}
    />)}
  </>
}

function DirectionPlate({
  font,
  text,
  x,
  y,
}: { font: Font; text: string; x: number; y: number }) {
  return (
    <>
      <rect x={x} y={y} width="54" height="54" rx="3" fill={GREEN} />
      <OutlinedText
        font={font}
        text={text}
        startX={x + 7}
        startY={y + 7}
        width={40}
        height={40}
        fill={WHITE}
      />
    </>
  )
}

function SignFrame({
  children,
}: { children: ReactNode }) {
  return (
    <>
      <rect x={BOARD_X} y={BOARD_Y} width={BOARD_WIDTH} height={BOARD_HEIGHT} rx="34" fill={GREEN} />
      <rect x={BOARD_X + 10} y={BOARD_Y + 10} width={BOARD_WIDTH - 20} height={BOARD_HEIGHT - 20} rx="25" fill={WHITE} />
      <path
        d={`M ${BOARD_X + 10} ${BOARD_Y + HEADER_BOTTOM} H ${BOARD_X + BOARD_WIDTH - 10} V ${BOARD_Y + BOARD_HEIGHT - 35} Q ${BOARD_X + BOARD_WIDTH - 10} ${BOARD_Y + BOARD_HEIGHT - 10} ${BOARD_X + BOARD_WIDTH - 35} ${BOARD_Y + BOARD_HEIGHT - 10} H ${BOARD_X + 35} Q ${BOARD_X + 10} ${BOARD_Y + BOARD_HEIGHT - 10} ${BOARD_X + 10} ${BOARD_Y + BOARD_HEIGHT - 35} Z`}
        fill={GREEN}
      />
      {children}
    </>
  )
}

function Arrow({
  direction,
  x,
  y,
}: { direction: ArrowDirection; x: number; y: number }) {
  const normalized = cleanEntranceArrowDirection(direction)
  const path = normalized === 'front'
    ? 'M 33 78 H 47 V 42 H 65 L 40 14 L 15 42 H 33 Z'
    : normalized === 'right'
      ? 'M 0 58 L 43 15 H 25 V 0 H 80 V 55 H 62 V 34 L 18 77 Z'
      : 'M 80 58 L 37 15 H 55 V 0 H 0 V 55 H 18 V 34 L 62 77 Z'
  return <path d={path} transform={`translate(${x} ${y}) scale(${ARROW_SCALE})`} fill={WHITE} />
}

function UrbanRoadHeader({
  font,
  roadName,
  direction,
}: { font: Font; roadName: string; direction?: string }) {
  const roadNameWidth = direction ? 430 : 500
  const roadNameHeight = fitDestinationHeight(font, roadName, roadNameWidth)
  return (
    <>
      <OutlinedText
        font={font}
        text={roadName}
        startX={BOARD_X + 58}
        startY={BOARD_Y + 48 + (82 - roadNameHeight) / 2}
        width={roadNameWidth}
        height={roadNameHeight}
        fill={GREEN}
        options={{
          maxGap: 14,
          minGap: 8,
          scaleMode: 'reference',
          referenceText: '南北高架路周家嘴路隧道',
        }}
      />
      {direction && <DirectionPlate
        font={font}
        text={direction}
        x={BOARD_X + BOARD_WIDTH - 80}
        y={BOARD_Y + 62}
      />}
    </>
  )
}

export function UrbanExpresswayExitPreviewSign({
  sign,
}: { sign: Sign }) {
  const fontChinese = useFont('a')
  const roadName = cleanExitText(sign.urbanRoadName, '南北高架路', 12)
  const direction = sign.urbanExitDirectionVisible ? cleanDirection(sign.urbanDirection, '北') : undefined
  const destination = cleanExitText(sign.urbanDestination, '共和新路立交', 12)
  const secondDestination = cleanExitText(sign.exitDestination, '沪太路', 12)
  const destinationSuffix = sign.urbanExitDestinationDirectionVisible ? '方向' : ''
  const destinationTexts = sign.urbanExitSecondDestinationVisible
    ? [`${destination}${destinationSuffix}`, `${secondDestination}${destinationSuffix}`]
    : [`${destination}${destinationSuffix}`]
  const destinationWidth = sign.urbanExitSecondDestinationVisible
    ? EXIT_DESTINATION_COLUMN_WIDTH
    : EXIT_DESTINATION_SINGLE_WIDTH
  const destinationHeight = fitExitDestinationHeight(
    fontChinese, destinationTexts, destinationWidth,
  )
  const arrowDirection = cleanEntranceArrowDirection(sign.entranceArrowDirection)
  const label = escapeXml(`${roadName}${direction ? ` ${direction}` : ''} ${destinationTexts.join(' ')} ${arrowDirection} 无编号城市快速路出口预告`)
  return (
    <RawSvg
      template={`<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" />`}
      label={label}
      width={WIDTH}
      height={HEIGHT}
    >
      <g data-generated="urban-expressway-exit-preview">
        <SignFrame>
          <UrbanRoadHeader font={fontChinese} roadName={roadName} direction={direction} />
          <ExitDestinationBlock
            font={fontChinese}
            text={destinationTexts[0]}
            x={sign.urbanExitSecondDestinationVisible ? EXIT_DESTINATION_COLUMN_X[0] : BOARD_X + 42}
            width={destinationWidth}
            height={destinationHeight}
          />
          {sign.urbanExitSecondDestinationVisible && <ExitDestinationBlock
            font={fontChinese}
            text={destinationTexts[1]}
            x={EXIT_DESTINATION_COLUMN_X[1]}
            width={destinationWidth}
            height={destinationHeight}
          />}
          <Arrow direction={arrowDirection} x={BOARD_X + BOARD_WIDTH / 2 - 58} y={BOARD_Y + 430} />
        </SignFrame>
      </g>
    </RawSvg>
  )
}

export function UrbanExpresswayEntrancePreviewSign({
  sign,
}: { sign: Sign }) {
  const fontChinese = useFont('a')
  const fontLatin = useFont('b')
  const roadName = cleanExitText(sign.urbanRoadName, '九水路', 12)
  const firstDestination = cleanExitText(sign.urbanDestination, '李沧', 5)
  const secondDestination = cleanExitText(sign.exitDestination, '崂山', 5)
  const destinationHeight = fitEntranceDestinationHeight(
    fontChinese,
    [firstDestination, secondDestination],
  )
  const distance = cleanEntranceDistance(sign.exitDistance)
  const distanceLabel = sign.urbanEntranceDistanceVisible ? ` ${distance}m` : ''
  const label = escapeXml(`${roadName} ${firstDestination} ${secondDestination} 入口${distanceLabel} 无编号城市快速路入口预告`)
  return (
    <RawSvg
      template={`<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" />`}
      label={label}
      width={WIDTH}
      height={HEIGHT}
    >
      <g data-generated="urban-expressway-entrance-preview">
        <SignFrame>
          <UrbanRoadHeader font={fontChinese} roadName={roadName} />
          <EntranceDestinationBlock
            font={fontChinese}
            text={firstDestination}
            x={ENTRANCE_DESTINATION_LEFT_X}
            height={destinationHeight}
          />
          <EntranceDestinationBlock
            font={fontChinese}
            text={secondDestination}
            x={ENTRANCE_DESTINATION_RIGHT_X}
            height={destinationHeight}
          />
          <OutlinedText
            font={fontChinese}
            text="入口"
            startX={sign.urbanEntranceDistanceVisible ? BOARD_X + 36 : BOARD_X + 125}
            startY={sign.urbanEntranceDistanceVisible ? BOARD_Y + 410 : BOARD_Y + 452}
            width={sign.urbanEntranceDistanceVisible ? 112 : 220}
            height={sign.urbanEntranceDistanceVisible ? 60 : 76}
            fill={WHITE}
          />
          {sign.urbanEntranceDistanceVisible && <>
            <OutlinedText
              font={fontLatin}
              text={distance}
              startX={BOARD_X + 170}
              startY={BOARD_Y + 410}
              width={120}
              height={65}
              fill={WHITE}
              options={{
                maxGap: 7,
                minGap: 4,
              }}
            />
            <OutlinedText
              font={fontLatin}
              text="m"
              startX={BOARD_X + 300}
              startY={BOARD_Y + 440}
              width={42}
              height={38}
              fill={WHITE}
            />
          </>}
          <Arrow direction="front" x={BOARD_X + 450} y={sign.urbanEntranceDistanceVisible ? BOARD_Y + 385 : BOARD_Y + 420} />
        </SignFrame>
      </g>
    </RawSvg>
  )
}
