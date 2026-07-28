import { renderToStaticMarkup } from 'react-dom/server'
import type { Sign } from '../../types'
import { expresswaySignNode } from '../sign/expressway'
import { cleanDirection, cleanExitRoute, routeSignWidth } from '../generator'
import { GREEN, escapeXml, loadFont, outlinedText } from '../svg-text'
import directionGuidanceTemplate from '/template/分向指路标志.svg?raw'

const TEMPLATE_WIDTH = 200.07
const TEMPLATE_HEIGHT = 299.75
const ROUTE_SIGN_HEIGHT = 100
const ROUTE_SIGN_Y = 100

export async function generateDirectionGuidanceSvg(sign: Sign): Promise<string> {
  const [fontChinese, fontLatin] = await Promise.all([loadFont('a'), loadFont('b')])
  const leftDirection = cleanDirection(sign.leftDirection, '东')
  const rightDirection = cleanDirection(sign.rightDirection, '西')
  const route = cleanExitRoute(sign.leftRoute, 'G78')
  const leftRouteWidth = routeSignWidth(route, ROUTE_SIGN_HEIGHT)
  const leftRouteX = (TEMPLATE_WIDTH - leftRouteWidth) / 2
  const label = escapeXml(`${leftDirection} ${route} ${rightDirection}`)

  const overlay = renderToStaticMarkup(
    <g data-generated="direction-guidance">
      {outlinedText(fontChinese, leftDirection, 106, 29.8, 58, 48, GREEN, { maxGap: 8, minGap: 8 })}
      {expresswaySignNode({ code: route, kind: sign.leftRouteKind, provinceLabel: sign.leftRouteProvinceLabel, threeDigitDescend: sign.leftRouteThreeDigitDescend, fontChinese, fontLatin, x: leftRouteX, y: ROUTE_SIGN_Y, width: leftRouteWidth, height: ROUTE_SIGN_HEIGHT })}
      {outlinedText(fontChinese, rightDirection, 38, 225, 53, 43, GREEN, { maxGap: 8, minGap: 8 })}
    </g>,
  )

  const svg = directionGuidanceTemplate
    .replace(/<!--rotationCenter:[\s\S]*?-->/, '')
    .replace('<svg ', `<svg role="img" aria-label="${label} 分向指路标志" `)

  return svg.replace('</svg>', `${overlay}</svg>`).replace(/width="[^"]+"/, `width="${TEMPLATE_WIDTH}"`).replace(/height="[^"]+"/, `height="${TEMPLATE_HEIGHT}"`)
}
