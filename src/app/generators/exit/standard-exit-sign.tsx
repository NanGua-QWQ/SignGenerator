import type {
  Sign,
} from '@/lib/types'

import {
  useFont,
} from '../../fonts/FontContext'
import {
  cleanExitRoute,
  cleanExitText,
  routeSignWidth,
} from '../generator'
import {
  RawSvg,
} from '../raw-svg'
import {
  RouteSignNode,
} from '../sign/route-sign'
import {
  GREEN,
  WHITE,
  escapeXml,
  OutlinedText,
  textLayout,
} from '../svg-text'
import {
  NUMBERED_EXIT_WIDTH,
  NumberedExitSignNode,
} from './numbered-exit'
import {
  ExitDirectionArrow,
} from './right-exit-arrow'

const WIDTH = 520
const HEIGHT = 640
const BOARD_X = 55
const BOARD_Y = 125
const BOARD_WIDTH = 410
const BOARD_HEIGHT = 470
const ROUTE_SIGN_HEIGHT = 112
const DESTINATION_TEXT_WIDTH = BOARD_WIDTH - 84
const DESTINATION_TEXT_HEIGHT = 86

function fitDestinationText(font: ReturnType<typeof useFont>, text: string) {
  const glyphCount = Array.from(text).length
  const minGap = glyphCount > 5 ? 4 : 12
  for (let height = DESTINATION_TEXT_HEIGHT; height >= 20; height -= 1) {
    const layout = textLayout(font, text, height, {
      scaleMode: 'reference',
      referenceText: '日照 济宁',
    })
    if (layout.usedWidth + minGap * Math.max(0, glyphCount - 1) <= DESTINATION_TEXT_WIDTH) {
      return {
        height,
        minGap,
      }
    }
  }
  return {
    height: 20,
    minGap: 0,
  }
}

export function StandardExitSign({
  sign,
}: { sign: Sign }) {
  const fontChinese = useFont('a')
  const fontLatin = useFont('b')
  const route = cleanExitRoute(sign.rightRoute, 'G15', sign.rightRouteKind)
  const routeWidth = Math.min(
    routeSignWidth(route, ROUTE_SIGN_HEIGHT, sign.rightRouteKind),
    BOARD_WIDTH - 72,
  )
  const destination = [
    cleanExitText(sign.exitName, '', 4),
    cleanExitText(sign.exitDestination, '', 4),
  ].filter(Boolean).join(' ')
  const destinationText = fitDestinationText(fontChinese, destination)
  const arrowDirection = sign.entranceArrowDirection
  const label = escapeXml(`出口 ${sign.exitNumber} ${route} ${destination}`)
  return (
    <RawSvg
      template={`<svg viewBox="0 0 ${WIDTH} ${HEIGHT}" />`}
      label={`${label} 国标出口标识`}
      width={WIDTH}
      height={HEIGHT}
    >
      <g data-generated="standard-exit-sign">
        <NumberedExitSignNode
          exitNumber={sign.exitNumber}
          fontChinese={fontChinese}
          fontLatin={fontLatin}
          x={BOARD_X + BOARD_WIDTH - NUMBERED_EXIT_WIDTH}
          y={20}
        />
        <rect x={BOARD_X} y={BOARD_Y} width={BOARD_WIDTH} height={BOARD_HEIGHT} rx="44" fill={GREEN} />
        <rect
          x={BOARD_X + 13}
          y={BOARD_Y + 13}
          width={BOARD_WIDTH - 26}
          height={BOARD_HEIGHT - 26}
          rx="31"
          fill="none"
          stroke={WHITE}
          strokeWidth="9"
        />
        <RouteSignNode
          code={route}
          kind={sign.rightRouteKind}
          provinceLabel={sign.rightRouteProvinceLabel}
          threeDigitDescend={sign.rightRouteThreeDigitDescend}
          fontChinese={fontChinese}
          fontLatin={fontLatin}
          x={(WIDTH - routeWidth) / 2}
          y={BOARD_Y + 48}
          width={routeWidth}
          height={ROUTE_SIGN_HEIGHT}
        />
        <OutlinedText
          font={fontChinese}
          text={destination}
          startX={BOARD_X + 42}
          startY={BOARD_Y + 205 + (DESTINATION_TEXT_HEIGHT - destinationText.height) / 2}
          width={DESTINATION_TEXT_WIDTH}
          height={destinationText.height}
          fill={WHITE}
          options={{
            maxGap: 28,
            minGap: destinationText.minGap,
            scaleMode: 'reference',
            referenceText: '日照 济宁',
          }}
        />
        <ExitDirectionArrow
          direction={arrowDirection}
          x={WIDTH / 2}
          y={BOARD_Y + 365}
          scale={1.45}
        />
      </g>
    </RawSvg>
  )
}
