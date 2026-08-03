import directionGuidanceTemplate from '@/generators/template/分向指路标志.svg'

import {
  useFont,
} from '../../fonts/FontContext'
import {
  cleanDirection, cleanExitRoute, routeSignWidth,
} from '../generator'
import {
  RawSvg,
} from '../raw-svg'
import {
  ExpresswaySignNode,
} from '../sign/expressway'
import {
  GREEN, escapeXml, OutlinedText,
} from '../svg-text'

import type {
  Sign,
} from '@/lib/types'

const TEMPLATE_WIDTH = 200.07
const TEMPLATE_HEIGHT = 299.75
const ROUTE_SIGN_HEIGHT = 100
const ROUTE_SIGN_Y = 100

export function DirectionGuidanceSign({
  sign,
}: { sign: Sign }) {
  const fontChinese = useFont('a')
  const fontLatin = useFont('b')
  const leftDirection = cleanDirection(sign.leftDirection, '东')
  const rightDirection = cleanDirection(sign.rightDirection, '西')
  const route = cleanExitRoute(sign.leftRoute, 'G78')
  const leftRouteWidth = routeSignWidth(route, ROUTE_SIGN_HEIGHT)
  const leftRouteX = (TEMPLATE_WIDTH - leftRouteWidth) / 2
  const label = escapeXml(`${leftDirection} ${route} ${rightDirection}`)

  return (
    <RawSvg
      template={directionGuidanceTemplate}
      label={`${label} 分向指路标志`}
      width={TEMPLATE_WIDTH}
      height={TEMPLATE_HEIGHT}
    >
      <g data-generated="direction-guidance">
        <OutlinedText
          font={fontChinese}
          text={leftDirection}
          startX={106}
          startY={29.8}
          width={58}
          height={48}
          fill={GREEN}
          options={{
            maxGap: 8,
            minGap: 8,
          }}
        />
        <ExpresswaySignNode
          code={route}
          kind={sign.leftRouteKind}
          provinceLabel={sign.leftRouteProvinceLabel}
          threeDigitDescend={sign.leftRouteThreeDigitDescend}
          fontChinese={fontChinese}
          fontLatin={fontLatin}
          x={leftRouteX}
          y={ROUTE_SIGN_Y}
          width={leftRouteWidth}
          height={ROUTE_SIGN_HEIGHT}
        />
        <OutlinedText
          font={fontChinese}
          text={rightDirection}
          startX={38}
          startY={225}
          width={53}
          height={43}
          fill={GREEN}
          options={{
            maxGap: 8,
            minGap: 8,
          }}
        />
      </g>
    </RawSvg>
  )
}
