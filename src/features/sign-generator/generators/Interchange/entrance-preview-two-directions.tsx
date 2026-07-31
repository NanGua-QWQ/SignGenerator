import type { ReactNode } from 'react'
import { use } from 'react'
import type { Font } from '@pdf-lib/fontkit'
import type { Sign } from '../../types'
import { cleanDirection, cleanEntranceArrowDirection, cleanEntranceDistance, cleanExitRoute, cleanExitText, routeSignWidth } from '../generator'
import { ExpresswaySignNode } from '../sign/expressway'
import { GREEN, WHITE, YELLOW, escapeXml, loadFont, OutlinedText } from '../svg-text'
import { RawSvg } from '../raw-svg'
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

interface DirectionPlateProps {
  fontChinese: Font
  text: string
  x: number
  y: number
}
function DirectionPlate({ fontChinese, text, x, y }: DirectionPlateProps) {
  return (
    <>
      <rect x={x} y={y} width={DIRECTION_PLATE_SIZE} height={DIRECTION_PLATE_SIZE} fill={WHITE} />
      <OutlinedText font={fontChinese} text={text} startX={x + 6} startY={y + 6} width={DIRECTION_PLATE_SIZE - 12} height={DIRECTION_PLATE_SIZE - 12} fill={GREEN} />
    </>
  )
}

export function EntrancePreviewTwoDirectionsSign({ sign }: { sign: Sign }): ReactNode {
  const fontChinese = use(loadFont('a'))
  const fontLatin = use(loadFont('b'))
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
  return (
    <RawSvg template={baseTemplate} label={`${label} 入口预告-2方向标志`} width={templateWidth}>
      <g data-generated="entrance-preview-two-directions">
        {!usesSecondDestination && (
          <>
            <DirectionPlate fontChinese={fontChinese} text={cardinalDirection} x={166.6} y={44.2} />
            <ExpresswaySignNode code={route} kind={sign.rightRouteKind} provinceLabel={sign.rightRouteProvinceLabel} threeDigitDescend={sign.rightRouteThreeDigitDescend} fontChinese={fontChinese} fontLatin={fontLatin} x={routeX} y={27.5} width={routeWidth} height={78} />
            {arrowDirection === 'front' ? (
              <>
                <OutlinedText font={fontLatin} text={distance} startX={115.5} startY={190} width={38} height={35.5} fill={WHITE} options={{ maxGap: 6, minGap: 5 }} />
                <OutlinedText font={fontLatin} text="m" startX={179.5} startY={209} width={17.6} height={17.6} fill={WHITE} />
              </>
            ) : (
              <>
                {/* 入口文字 */}
                <OutlinedText font={fontChinese} text="入" startX={arrowDirection === 'right' ? 176.4 : 29} startY={192.5} width={29} height={29} fill={YELLOW} options={{ maxGap: 7, minGap: 4 }} />
                <OutlinedText font={fontChinese} text="口" startX={arrowDirection === 'right' ? 214 : 67.4} startY={196.5} width={23} height={23} fill={YELLOW} options={{ maxGap: 7, minGap: 4 }} />
              </>
            )}
          </>
        )}

        {usesSecondDestination ? (
          <>
            <ExpresswaySignNode code={route} kind={sign.rightRouteKind} provinceLabel={sign.rightRouteProvinceLabel} threeDigitDescend={sign.rightRouteThreeDigitDescend} fontChinese={fontChinese} fontLatin={fontLatin} x={centeredRouteX} y={27.5} width={routeWidth} height={78.8} />
            <OutlinedText font={fontChinese} text={firstDestination} startX={52.3} startY={125} width={44} height={44} fill={WHITE} options={{ maxGap: 12, minGap: 7 }} />
            <OutlinedText font={fontChinese} text={secondDestination} startX={181} startY={125} width={44} height={44} fill={WHITE} options={{ maxGap: 12, minGap: 6 }} />
            {arrowDirection === 'front' ? (
              <>
                <OutlinedText font={fontChinese} text="入" startX={23} startY={192.5} width={33} height={33} fill={WHITE} options={{ maxGap: 7, minGap: 4 }} />
                <OutlinedText font={fontChinese} text="口" startX={60.4} startY={196.5} width={27} height={27} fill={WHITE} options={{ maxGap: 7, minGap: 4 }} />
                <OutlinedText font={fontLatin} text={distance} startX={122} startY={192} width={34} height={35} fill={WHITE} options={{ maxGap: 12, minGap: 5.3 }} />
                <OutlinedText font={fontLatin} text="m" startX={184} startY={210.5} width={17.6} height={17.6} fill={WHITE} />
              </>
            ) : (
              <>
                <OutlinedText font={fontChinese} text="入" startX={arrowDirection === 'right' ? 176.5 : 36} startY={192.5} width={33} height={33} fill={WHITE} options={{ maxGap: 7, minGap: 4 }} />
                <OutlinedText font={fontChinese} text="口" startX={arrowDirection === 'right' ? 214 : 73.4} startY={196.5} width={27} height={27} fill={WHITE} options={{ maxGap: 7, minGap: 4 }} />
              </>
            )}
          </>
        ) : (
          <OutlinedText font={fontChinese} text={`${firstDestination}方向`} startX={109.5} startY={124} width={44} height={44} fill={WHITE} options={{ maxGap: 12.5, minGap: 12.5 }} />
        )}
      </g>
    </RawSvg>
  )
}
