import { renderToStaticMarkup } from 'react-dom/server'
import type { Font } from '@pdf-lib/fontkit'
import type { Sign } from '../../types'
import { cleanDirection, cleanEntranceArrowDirection, cleanEntranceDistance, cleanExitRoute, cleanExitText, routeSignWidth } from '../generator'
import { expresswaySignNode } from '../sign/expressway'
import { GREEN, WHITE, YELLOW, escapeXml, loadFont, outlinedText } from '../svg-text'
import entrancePreviewLeftTemplate from '/template/入口预告-2方向-左.svg?raw'
import entrancePreviewTemplate from '/template/入口预告-2方向.svg?raw'

const FRONT_TEMPLATE_WIDTH = 277.68
const TURN_TEMPLATE_WIDTH = 277.26
const ROUTE_SIGN_HEIGHT = 80.5
const DIRECTION_PLATE_SIZE = 44

function templateForArrowDirection(direction: Sign['entranceArrowDirection']): { svg: string; width: number } {
  if (direction === 'left') return { svg: entrancePreviewLeftTemplate, width: TURN_TEMPLATE_WIDTH }
  if (direction === 'right') {
    return {
      svg: entrancePreviewLeftTemplate.replace('transform="translate(-101.37,-50.57)"', 'transform="translate(378.63,-50.57) scale(-1,1)"'),
      width: TURN_TEMPLATE_WIDTH,
    }
  }
  return { svg: entrancePreviewTemplate, width: FRONT_TEMPLATE_WIDTH }
}

function directionPlateNode(fontChinese: Font, text: string, x: number, y: number) {
  return (
    <>
      <rect x={x} y={y} width={DIRECTION_PLATE_SIZE} height={DIRECTION_PLATE_SIZE} fill={WHITE} />
      {outlinedText(fontChinese, text, x + 6, y + 6, DIRECTION_PLATE_SIZE - 12, DIRECTION_PLATE_SIZE - 12, GREEN)}
    </>
  )
}

export async function generateEntrancePreviewTwoDirectionsSvg(sign: Sign): Promise<string> {
  const [fontChinese, fontLatin] = await Promise.all([loadFont('a'), loadFont('b')])
  const arrowDirection = cleanEntranceArrowDirection(sign.entranceArrowDirection)
  const { svg: baseTemplate, width: templateWidth } = templateForArrowDirection(arrowDirection)
  const route = cleanExitRoute(sign.rightRoute, 'G15')
  const routeWidth = routeSignWidth(route, ROUTE_SIGN_HEIGHT)
  const usesSecondDestination = sign.entranceSecondDirectionEnabled
  const routeDigitsLength = route.replace(/\D/g, '').length
  const isTwoDigitLayout = routeDigitsLength === 2
  const cardinalDirection = cleanDirection(sign.entranceCardinalDirection, '南')
  const routeX = isTwoDigitLayout ? 58 : 23
  const centeredRouteX = (templateWidth - routeWidth) / 2
  const firstDestination = cleanExitText(sign.exitName, '汕头', 4)
  const secondDestination = cleanExitText(sign.exitDestination, '深圳', 4)
  const distance = cleanEntranceDistance(sign.exitDistance)
  const destinationLabel = usesSecondDestination ? `${firstDestination} ${secondDestination}` : `${firstDestination}方向`
  const label = escapeXml(`${route} ${cardinalDirection} ${destinationLabel} 入口 ${arrowDirection === 'front' ? `${distance}m` : ''}`)
  const overlay = renderToStaticMarkup(
    <g data-generated="entrance-preview-two-directions">
      {!usesSecondDestination && (
        <>
          {directionPlateNode(fontChinese, cardinalDirection, 166.6, 44.2)}
          {expresswaySignNode({ code: route, kind: sign.rightRouteKind, provinceLabel: sign.rightRouteProvinceLabel, threeDigitDescend: sign.rightRouteThreeDigitDescend, fontChinese, fontLatin, x: routeX, y: 27.5, width: routeWidth, height: 78 })}
          {arrowDirection === 'front' ? (
            <>
              {outlinedText(fontLatin, distance, 115.5, 190, 38, 35.5, WHITE, { maxGap: 6, minGap: 5 })}
              {outlinedText(fontLatin, 'm', 179.5, 209, 17.6, 17.6, WHITE)}
            </>
          ) : (
            <>
              {/* 入口文字 */}
              {outlinedText(fontChinese, '入', arrowDirection === 'right' ? 176.4 : 29, 192.5, 29, 29, YELLOW, { maxGap: 7 , minGap: 4 })}
              {outlinedText(fontChinese, '口', arrowDirection === 'right' ? 214 : 67.4, 196.5, 23, 23, YELLOW, { maxGap: 7 , minGap: 4 })}
            </>
          )}
        </>
      )}
      
      {usesSecondDestination ? (
        <>
          {expresswaySignNode({ code: route, kind: sign.rightRouteKind, provinceLabel: sign.rightRouteProvinceLabel, threeDigitDescend: sign.rightRouteThreeDigitDescend, fontChinese, fontLatin, x: centeredRouteX, y: 27.5, width: routeWidth, height: 78.8 })}
          {outlinedText(fontChinese, firstDestination, 52.3, 125, 44, 44, WHITE, { maxGap: 12, minGap: 7 })}
          {outlinedText(fontChinese, secondDestination, 181, 125, 44, 44, WHITE, { maxGap: 12, minGap: 6 })}
          {arrowDirection === 'front' ? (
            <>
              {outlinedText(fontChinese, '入', 23, 192.5, 33, 33, WHITE, { maxGap: 7 , minGap: 4 })}
              {outlinedText(fontChinese, '口', 60.4, 196.5, 27, 27, WHITE, { maxGap: 7 , minGap: 4 })}
              {outlinedText(fontLatin, distance, 122, 192, 34, 35, WHITE, { maxGap: 12, minGap: 5.3 })}
              {outlinedText(fontLatin, 'm', 184, 210.5, 17.6, 17.6, WHITE)}
            </>
          ) : (
            <>
              {outlinedText(fontChinese, '入', arrowDirection === 'right' ? 176.5 : 36, 192.5, 33, 33, WHITE, { maxGap: 7 , minGap: 4 })}
              {outlinedText(fontChinese, '口', arrowDirection === 'right' ? 214 : 73.4, 196.5, 27, 27, WHITE, { maxGap: 7 , minGap: 4 })}
            </>
          )}
        </>
      ) : (
        outlinedText(fontChinese, `${firstDestination}方向`, 109.5, 124, 44, 44, WHITE, { maxGap: 12.5, minGap: 12.5 })
      )}
    </g>,
  )
  return baseTemplate
    .replace(/<!--rotationCenter:[\s\S]*?-->/, '')
    .replace('<svg ', `<svg role="img" aria-label="${label} 入口预告-2方向标志" `)
    .replace('</svg>', `${overlay}</svg>`)
}
