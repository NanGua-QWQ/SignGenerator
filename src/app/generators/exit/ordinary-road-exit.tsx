import ordinaryRoadExitTemplate from '@/generators/template/普通道路出口.svg'
import type {
  Sign,
} from '@/lib/types'

import {
  useFont,
} from '../../fonts/FontContext'
import {
  cleanExitText,
} from '../generator'
import {
  RawSvg,
} from '../raw-svg'
import {
  RouteSignNode,
} from '../sign/route-sign'
import {
  escapeXml,
  OutlinedText,
  textLayout,
  WHITE,
} from '../svg-text'
import {
  ExitDirectionArrow,
} from './right-exit-arrow'

const WIDTH = 520
const HEIGHT = 640
const BOARD_X = 55
const BOARD_Y = 125
const BOARD_WIDTH = 410
const CONTENT_WIDTH = BOARD_WIDTH - 84
const CONTENT_X = BOARD_X + 42
const DESTINATION_TOP = BOARD_Y + 130
const DESTINATION_HEIGHT = 140
const DESTINATION_LINE_GAP = 10
const DESTINATION_MAX_TEXT_HEIGHT = 76
const GREEN = '#359b47'
const BLUE = '#0B43B8'

function destinationLines(text: string) {
  const characters = Array.from(text)
  if (characters.length <= 4) {return [text]}
  const splitAt = Math.ceil(characters.length / 2)
  return [
    characters.slice(0, splitAt).join(''),
    characters.slice(splitAt).join(''),
  ]
}

function fitDestinationHeight(font: ReturnType<typeof useFont>, text: string) {
  const lines = destinationLines(text)
  for (let height = DESTINATION_MAX_TEXT_HEIGHT; height >= 30; height -= 1) {
    const textFits = lines.every((line) => {
      const layout = textLayout(font, line, height, {
        scaleMode: 'reference',
        referenceText: '宝杨路',
      })
      return layout.usedWidth + 8 * Math.max(0, layout.glyphs.length - 1) <= CONTENT_WIDTH
    })
    const blockHeight = lines.length * height
      + Math.max(0, lines.length - 1) * DESTINATION_LINE_GAP
    if (textFits && blockHeight <= DESTINATION_HEIGHT) {return height}
  }
  return 30
}

function DestinationLabel({
  font,
  text,
}: { font: ReturnType<typeof useFont>; text: string }) {
  const lines = destinationLines(text)
  const height = fitDestinationHeight(font, text)
  const blockHeight = lines.length * height
    + Math.max(0, lines.length - 1) * DESTINATION_LINE_GAP
  const startY = DESTINATION_TOP + (DESTINATION_HEIGHT - blockHeight) / 2
  return <>
    {lines.map((line, index) => <OutlinedText
      key={`${line}-${index}`}
      font={font}
      text={line}
      startX={CONTENT_X}
      startY={startY + index * (height + DESTINATION_LINE_GAP)}
      width={CONTENT_WIDTH}
      height={height}
      fill={WHITE}
      options={{
        maxGap: 20,
        minGap: 8,
        scaleMode: 'reference',
        referenceText: '宝杨路',
      }}
    />)}
  </>
}

export function OrdinaryRoadExitSign({
  sign,
}: { sign: Sign }) {
  const fontChinese = useFont('a')
  const fontLatin = useFont('b')
  const textMode = sign.ordinaryExitContentMode === 'text'
  const background = sign.ordinaryExitBackground === 'blue' ? BLUE : GREEN
  const destination = cleanExitText(sign.exitName, '宝杨路', 12)
  const contentLabel = textMode ? destination : sign.code
  const label = escapeXml(`${contentLabel} 普通道路出口`)
  const template = ordinaryRoadExitTemplate.replaceAll(GREEN, background)

  return (
    <RawSvg
      template={template}
      label={label}
      width={WIDTH}
      height={HEIGHT}
    >
      <g data-generated="ordinary-road-exit">
        {textMode ? <DestinationLabel
          font={fontChinese}
          text={destination}
        /> : <RouteSignNode
          code={sign.kind === 'urban-expressway' || sign.kind === 'urban-road' ? sign.urbanRoadName : sign.code}
          kind={sign.kind}
          provinceLabel={sign.provinceLabel}
          threeDigitDescend={sign.threeDigitDescend}
          fontChinese={fontChinese}
          fontLatin={fontLatin}
          x={(WIDTH - 236) / 2}
          y={BOARD_Y + 130}
          width={236}
          height={114}
        />}
        <ExitDirectionArrow
          direction={sign.entranceArrowDirection}
          x={WIDTH / 2}
          y={BOARD_Y + 355}
          scale={1.45}
        />
      </g>
    </RawSvg>
  )
}
