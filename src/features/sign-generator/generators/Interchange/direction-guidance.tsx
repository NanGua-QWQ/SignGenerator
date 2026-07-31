import type { ReactNode } from 'react'
import { use } from 'react'
import type { Sign } from '../../types'
import { ExpresswaySignNode } from '../sign/expressway'
import { cleanDirection, cleanExitRoute, routeSignWidth } from '../generator'
import { GREEN, escapeXml, loadFont, OutlinedText } from '../svg-text'
import { RawSvg } from '../raw-svg'
import directionGuidanceTemplate from '/template/分向指路标志.svg?raw'

const TEMPLATE_WIDTH = 200.07
const TEMPLATE_HEIGHT = 299.75
const ROUTE_SIGN_HEIGHT = 100
const ROUTE_SIGN_Y = 100

export function DirectionGuidanceSign({ sign }: { sign: Sign }): ReactNode {
  const fontChinese = use(loadFont('a'))
  const fontLatin = use(loadFont('b'))
  const leftDirection = cleanDirection(sign.leftDirection, '东')
  const rightDirection = cleanDirection(sign.rightDirection, '西')
  const route = cleanExitRoute(sign.leftRoute, 'G78')
  const leftRouteWidth = routeSignWidth(route, ROUTE_SIGN_HEIGHT)
  const leftRouteX = (TEMPLATE_WIDTH - leftRouteWidth) / 2
  const label = escapeXml(`${leftDirection} ${route} ${rightDirection}`)

  return (
    <RawSvg template={directionGuidanceTemplate} label={`${label} 分向指路标志`} width={TEMPLATE_WIDTH} height={TEMPLATE_HEIGHT}>
      <g data-generated="direction-guidance">
        <OutlinedText font={fontChinese} text={leftDirection} startX={106} startY={29.8} width={58} height={48} fill={GREEN} options={{ maxGap: 8, minGap: 8 }} />
        <ExpresswaySignNode code={route} kind={sign.leftRouteKind} provinceLabel={sign.leftRouteProvinceLabel} threeDigitDescend={sign.leftRouteThreeDigitDescend} fontChinese={fontChinese} fontLatin={fontLatin} x={leftRouteX} y={ROUTE_SIGN_Y} width={leftRouteWidth} height={ROUTE_SIGN_HEIGHT} />
        <OutlinedText font={fontChinese} text={rightDirection} startX={38} startY={225} width={53} height={43} fill={GREEN} options={{ maxGap: 8, minGap: 8 }} />
      </g>
    </RawSvg>
  )
}
