import entrancePreviewTemplateOne from '@/generators/template/入口预告(进入后1个方向)-a.svg'
import entrancePreviewLeftTemplateOne from '@/generators/template/入口预告(进入后1个方向)-bc.svg'
import entrancePreviewTemplate from '@/generators/template/入口预告(进入后2个方向)-a.svg'
import entrancePreviewLeftTemplate from '@/generators/template/入口预告(进入后2个方向)-bc.svg'
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
  GREEN, WHITE, escapeXml, OutlinedText,
} from '../svg-text'

import type {
  Font,
} from '@pdf-lib/fontkit'

const FRONT_TEMPLATE_WIDTH = 277.68
const TURN_TEMPLATE_WIDTH = 277.26
const ONE_DIRECTION_FRONT_TEMPLATE_WIDTH = 269
const ONE_DIRECTION_TURN_TEMPLATE_WIDTH = 268.58
const ROUTE_SIGN_HEIGHT = 80.5
const SINGLE_DIRECTION_PLATE_SIZE = 44
const TWO_DIRECTION_PLATE_SIZE = 22
const ARROW_SCALE = 0.72
const ENTRANCE_TEXT_HEIGHT = 24
const ENTRANCE_TEXT_X = 28
const DESTINATION_TEXT_OPTIONS = {
  scaleMode: 'reference' as const,
  referenceText: '汕头深圳玉林方向',
}

function scaleArrow(template: string, centerX: number, centerY: number) {
  const transform = `translate(${centerX} ${centerY}) scale(${ARROW_SCALE}) translate(${-centerX} ${-centerY})`
  return template.replace(
    /(<path\b(?=[^>]*fill="#ffffff")[^>]*)(\/>)(?=<\/g><\/g><\/svg>)/,
    `$1 transform="${transform}"$2`,
  )
}

function templateForArrowDirection(
  direction: Sign['entranceArrowDirection'],
  usesSecondDestination: boolean,
) {
  const frontTemplate = usesSecondDestination
    ? scaleArrow(entrancePreviewTemplate, 334.85, 255.55)
    : scaleArrow(entrancePreviewTemplateOne, 334.16, 259.51)
  const leftTemplate = usesSecondDestination
    ? scaleArrow(entrancePreviewLeftTemplate, 290.84, 260.2)
    : scaleArrow(entrancePreviewLeftTemplateOne, 291.71, 259.23)
  const frontWidth = usesSecondDestination
    ? FRONT_TEMPLATE_WIDTH
    : ONE_DIRECTION_FRONT_TEMPLATE_WIDTH
  const turnWidth = usesSecondDestination
    ? TURN_TEMPLATE_WIDTH
    : ONE_DIRECTION_TURN_TEMPLATE_WIDTH

  switch (direction) {
    case 'left':
      return {
        svg: leftTemplate,
        width: turnWidth,
      }
    case 'right': {
      const transform = usesSecondDestination ? 'transform="translate(378.63,-50.57) scale(-1,1)"' : 'transform="translate(374.29,-51.19) scale(-1,1)"'
      return {
        svg: leftTemplate.replace(/transform="translate\([^)]*\)"/, transform),
        width: turnWidth,
      }
    }
    default:
      return {
        svg: frontTemplate,
        width: frontWidth,
      }
  }
}

interface DirectionPlateProps {
  fontChinese: Font
  text: string
  x: number
  y: number
  size?: number
}
function DirectionPlate({
  fontChinese, text, x, y, size = SINGLE_DIRECTION_PLATE_SIZE,
}: DirectionPlateProps) {
  const padding = size * 3 / 22
  return (
    <>
      <rect x={x} y={y} width={size} height={size} fill={WHITE} />
      <OutlinedText
        font={fontChinese}
        text={text}
        startX={x + padding}
        startY={y + padding}
        width={size - padding * 2}
        height={size - padding * 2}
        fill={GREEN}
      />
    </>
  )
}

function FrontEntranceFooter({
  fontChinese,
  fontLatin,
  distance,
  distanceVisible,
  distanceUnit,
}: {
  fontChinese: Font
  fontLatin: Font
  distance: string
  distanceVisible: boolean
  distanceUnit: Sign['entranceDistanceUnit']
}) {
  if (!distanceVisible) {
    return <OutlinedText
      font={fontChinese}
      text="入口"
      startX={ENTRANCE_TEXT_X}
      startY={197}
      width={70}
      height={ENTRANCE_TEXT_HEIGHT}
      fill={WHITE}
      options={{
        maxGap: 10,
        minGap: 8,
      }}
    />
  }

  return <>
    <OutlinedText
      font={fontChinese}
      text="入口"
      startX={ENTRANCE_TEXT_X}
      startY={197}
      width={70}
      height={ENTRANCE_TEXT_HEIGHT}
      fill={WHITE}
      options={{
        maxGap: 8,
        minGap: 6,
      }}
    />
    <OutlinedText
      font={fontLatin}
      text={distance}
      startX={108}
      startY={195}
      width={66}
      height={28}
      fill={WHITE}
      options={{
        maxGap: 5,
        minGap: 3,
      }}
    />
    <OutlinedText
      font={fontLatin}
      text={distanceUnit}
      startX={183}
      startY={208}
      width={distanceUnit === 'km' ? 30 : 18}
      height={12}
      fill={WHITE}
      options={{
        maxGap: 2,
        minGap: 1,
      }}
    />
  </>
}

export function EntrancePreviewTwoDirectionsSign({
  sign,
}: { sign: Sign }) {
  const fontChinese = useFont('a')
  const fontLatin = useFont('b')
  const arrowDirection = cleanEntranceArrowDirection(sign.entranceArrowDirection)
  const usesSecondDestination = sign.entranceSecondDirectionEnabled
  const {
    svg: baseTemplate, width: templateWidth,
  } = templateForArrowDirection(
    arrowDirection,
    usesSecondDestination,
  )
  const route = cleanExitRoute(sign.rightRoute, 'G15', sign.rightRouteKind)
  const routeWidth = routeSignWidth(route, ROUTE_SIGN_HEIGHT, sign.rightRouteKind)
  const routeDigitsLength = route.replace(/\D/g, '').length
  const isWellDigitLayout = routeDigitsLength === 2 || routeDigitsLength === 1
  const cardinalDirection = cleanDirection(sign.entranceCardinalDirection, '南')
  const leftCardinalDirection = cleanDirection(sign.entranceLeftCardinalDirection, '西')
  const rightCardinalDirection = cleanDirection(sign.entranceRightCardinalDirection, '东')
  const routeX = isWellDigitLayout ? 58 : 23
  const layoutUnit = templateWidth / 6
  const twoDirectionRouteScale = Math.min(1, layoutUnit * 2.2 / routeWidth)
  const twoDirectionRouteWidth = routeWidth * twoDirectionRouteScale
  const twoDirectionRouteHeight = ROUTE_SIGN_HEIGHT * twoDirectionRouteScale
  const twoDirectionRouteX = (templateWidth - twoDirectionRouteWidth) / 2
  const twoDirectionRouteY = layoutUnit * 0.6
  const directionPlateGap = layoutUnit * 0.12
  const directionPlateY = twoDirectionRouteY
    + (twoDirectionRouteHeight - TWO_DIRECTION_PLATE_SIZE) / 2
  const leftDirectionPlateX = twoDirectionRouteX - TWO_DIRECTION_PLATE_SIZE - directionPlateGap
  const rightDirectionPlateX = twoDirectionRouteX + twoDirectionRouteWidth + directionPlateGap
  const firstDestination = cleanExitText(sign.exitName, '汕头', 4).replace(/\s+/gu, '')
  const secondDestination = cleanExitText(sign.exitDestination, '深圳', 4).replace(/\s+/gu, '')
  const firstDestinationLength = Math.max(1, Array.from(firstDestination).length)
  const secondDestinationLength = Math.max(1, Array.from(secondDestination).length)
  const destinationSideInset = layoutUnit * 0.6
  const destinationCenterGap = layoutUnit * 0.6
  const destinationGroupsWidth = layoutUnit * 4.2
  const firstDestinationWidth = destinationGroupsWidth
    * firstDestinationLength / (firstDestinationLength + secondDestinationLength)
  const secondDestinationWidth = destinationGroupsWidth - firstDestinationWidth
  const firstDestinationX = destinationSideInset
  const secondDestinationX = firstDestinationX + firstDestinationWidth + destinationCenterGap
  const destinationY = layoutUnit * 2.7
  const destinationHeight = layoutUnit
  const destinationFitTargets = [
    {
      text: firstDestination, width: firstDestinationWidth,
    },
    {
      text: secondDestination, width: secondDestinationWidth,
    },
  ]
  const distance = cleanEntranceDistance(sign.exitDistance)
  const destinationLabel = usesSecondDestination ? `${firstDestination} ${secondDestination}` : `${firstDestination}方向`
  const cardinalLabel = usesSecondDestination
    ? [
      sign.entranceLeftCardinalDirectionVisible ? leftCardinalDirection : '',
      sign.entranceRightCardinalDirectionVisible ? rightCardinalDirection : '',
    ].filter(Boolean).join(' ')
    : cardinalDirection
  const label = escapeXml(
    `${route} ${cardinalLabel} ${destinationLabel} 入口 ${arrowDirection === 'front' && sign.entranceDistanceVisible ? `${distance}${sign.entranceDistanceUnit}` : ''}`,
  )
  return (
    <RawSvg template={baseTemplate} label={`${label} 入口预告-2方向标志`} width={templateWidth}>
      <g data-generated="entrance-preview-two-directions">
        {!usesSecondDestination
          && <>
            <DirectionPlate fontChinese={fontChinese} text={cardinalDirection} x={166.6} y={44.2} />
            <RouteSignNode
              code={route}
              kind={sign.rightRouteKind}
              provinceLabel={sign.rightRouteProvinceLabel}
              threeDigitDescend={sign.rightRouteThreeDigitDescend}
              fontChinese={fontChinese}
              fontLatin={fontLatin}
              x={routeX}
              y={27.5}
              width={routeWidth}
              height={78}
            />
            {arrowDirection === 'front'
              ? <FrontEntranceFooter
                fontChinese={fontChinese}
                fontLatin={fontLatin}
                distance={distance}
                distanceVisible={sign.entranceDistanceVisible}
                distanceUnit={sign.entranceDistanceUnit}
              />
              : <>
                {/* 入口文字 */}
                <OutlinedText
                  font={fontChinese}
                  text="入"
                  startX={arrowDirection === 'right' ? 179 : 29}
                  startY={192.5}
                  width={29}
                  height={29}
                  fill={WHITE}
                  options={{
                    maxGap: 7,
                    minGap: 4,
                  }}
                />
                <OutlinedText
                  font={fontChinese}
                  text="口"
                  startX={arrowDirection === 'right' ? 217.5 : 67.5}
                  startY={196.5}
                  width={23}
                  height={23}
                  fill={WHITE}
                  options={{
                    maxGap: 7,
                    minGap: 4,
                  }}
                />
              </>
            }
          </>
        }

        {usesSecondDestination ? <>
          {sign.entranceLeftCardinalDirectionVisible && <DirectionPlate
            fontChinese={fontChinese}
            text={leftCardinalDirection}
            x={leftDirectionPlateX}
            y={directionPlateY}
            size={TWO_DIRECTION_PLATE_SIZE}
          />}
          <RouteSignNode
            code={route}
            kind={sign.rightRouteKind}
            provinceLabel={sign.rightRouteProvinceLabel}
            threeDigitDescend={sign.rightRouteThreeDigitDescend}
            fontChinese={fontChinese}
            fontLatin={fontLatin}
            x={twoDirectionRouteX}
            y={twoDirectionRouteY}
            width={twoDirectionRouteWidth}
            height={twoDirectionRouteHeight}
          />
          {sign.entranceRightCardinalDirectionVisible && <DirectionPlate
            fontChinese={fontChinese}
            text={rightCardinalDirection}
            x={rightDirectionPlateX}
            y={directionPlateY}
            size={TWO_DIRECTION_PLATE_SIZE}
          />}
          <OutlinedText
            font={fontChinese}
            text={firstDestination}
            startX={firstDestinationX}
            startY={destinationY}
            width={firstDestinationWidth}
            height={destinationHeight}
            fill={WHITE}
            options={{
              ...DESTINATION_TEXT_OPTIONS,
              fitTargets: destinationFitTargets,
              maxGap: layoutUnit * 0.1,
              minGap: layoutUnit * 0.08,
            }}
          />
          <OutlinedText
            font={fontChinese}
            text={secondDestination}
            startX={secondDestinationX}
            startY={destinationY}
            width={secondDestinationWidth}
            height={destinationHeight}
            fill={WHITE}
            options={{
              ...DESTINATION_TEXT_OPTIONS,
              fitTargets: destinationFitTargets,
              maxGap: layoutUnit * 0.1,
              minGap: layoutUnit * 0.08,
            }}
          />
          {arrowDirection === 'front' ? <>
            <FrontEntranceFooter
              fontChinese={fontChinese}
              fontLatin={fontLatin}
              distance={distance}
              distanceVisible={sign.entranceDistanceVisible}
              distanceUnit={sign.entranceDistanceUnit}
            />
          </> : <>
            <OutlinedText
              font={fontChinese}
              text="入"
              startX={arrowDirection === 'right' ? 176.5 : 36}
              startY={192.5}
              width={33}
              height={33}
              fill={WHITE}
              options={{
                maxGap: 7,
                minGap: 4,
              }}
            />
            <OutlinedText
              font={fontChinese}
              text="口"
              startX={arrowDirection === 'right' ? 214 : 73.4}
              startY={196.5}
              width={27}
              height={27}
              fill={WHITE}
              options={{
                maxGap: 7,
                minGap: 4,
              }}
            />
          </>
          }
        </> : <OutlinedText
          font={fontChinese}
          text={`${firstDestination}方向`}
          startX={50}
          startY={124}
          width={169}
          height={44}
          fill={WHITE}
          options={{
            ...DESTINATION_TEXT_OPTIONS,
            maxGap: 12.5,
            minGap: 5,
          }}
        />
        }
      </g>
    </RawSvg>
  )
}
