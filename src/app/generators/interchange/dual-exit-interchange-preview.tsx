import dualExitInterchangePreviewTemplate from '@/generators/template/双出口枢纽式互通立体交叉的出口预告.svg'
import type {
  Sign,
} from '@/lib/types'

import {
  useFont,
} from '../../fonts/FontContext'
import {
  cleanExitDistance, cleanExitRoute, cleanExitText, routeSignWidth,
} from '../generator'
import {
  RawSvg,
} from '../raw-svg'
import {
  RouteSignNode,
} from '../sign/route-sign'
import {
  WHITE, escapeXml, OutlinedText,
} from '../svg-text'

const TEMPLATE_WIDTH = 583.96
const TEMPLATE_HEIGHT = 449.52
const ROUTE_SIGN_HEIGHT = 118
const ROUTE_SIGN_X = 210
const DESTINATION_X = 386
const DESTINATION_RIGHT = 548
const DESTINATION_MIN_WIDTH = 80
const ROUTE_DESTINATION_GAP = 14
const ROUTE_SIGN_MAX_WIDTH
  = DESTINATION_RIGHT - ROUTE_SIGN_X - ROUTE_DESTINATION_GAP - DESTINATION_MIN_WIDTH
const FIRST_ROW_Y = 47
const SECOND_ROW_Y = 193
const DESTINATION_TEXT_OPTIONS = {
  scaleMode: 'reference' as const,
  referenceText: '永州广州玉林',
  maxGap: 16,
  minGap: 14,
}

function rowLayout(preferredRouteWidth: number) {
  const routeWidth = Math.min(preferredRouteWidth, ROUTE_SIGN_MAX_WIDTH)
  const startX = Math.max(
    DESTINATION_X,
    ROUTE_SIGN_X + routeWidth + ROUTE_DESTINATION_GAP,
  )
  return {
    routeWidth,
    destinationX: startX,
    destinationWidth: DESTINATION_RIGHT - startX,
  }
}

export function DualExitInterchangePreviewSign({
  sign,
}: { sign: Sign }) {
  const fontChinese = useFont('a')
  const fontLatin = useFont('b')
  const firstRoute = cleanExitRoute(sign.leftRoute, 'G55', sign.leftRouteKind)
  const secondRoute = cleanExitRoute(sign.rightRoute, 'G55', sign.rightRouteKind)
  const firstDestination = cleanExitText(sign.exitName, '永州', 4)
  const secondDestination = cleanExitText(sign.exitDestination, '广州', 4)
  const distance = cleanExitDistance(sign.exitDistance || '3')
  const firstRowLayout = rowLayout(
    routeSignWidth(firstRoute, ROUTE_SIGN_HEIGHT, sign.leftRouteKind),
  )
  const secondRowLayout = rowLayout(
    routeSignWidth(secondRoute, ROUTE_SIGN_HEIGHT, sign.rightRouteKind),
  )
  const label = escapeXml(
    `${firstRoute} ${firstDestination} ${secondRoute} ${secondDestination} ${distance}km`,
  )

  return (
    <RawSvg
      template={dualExitInterchangePreviewTemplate}
      label={`${label} 双出口枢纽式互通立体交叉出口预告标志`}
      width={TEMPLATE_WIDTH}
      height={TEMPLATE_HEIGHT}
    >
      <g data-generated="dual-exit-interchange-preview">
        <g data-row="first">
          <RouteSignNode
            code={firstRoute}
            kind={sign.leftRouteKind}
            provinceLabel={sign.leftRouteProvinceLabel}
            threeDigitDescend={sign.leftRouteThreeDigitDescend}
            fontChinese={fontChinese}
            fontLatin={fontLatin}
            x={ROUTE_SIGN_X}
            y={FIRST_ROW_Y}
            width={firstRowLayout.routeWidth}
            height={ROUTE_SIGN_HEIGHT}
          />
          <g data-part="destination">
            <OutlinedText
              font={fontChinese}
              text={firstDestination}
              startX={firstRowLayout.destinationX}
              startY={FIRST_ROW_Y + 27.5}
              width={firstRowLayout.destinationWidth}
              height={71.5}
              fill={WHITE}
              options={DESTINATION_TEXT_OPTIONS}
            />
          </g>
        </g>
        <g data-row="second">
          <RouteSignNode
            code={secondRoute}
            kind={sign.rightRouteKind}
            provinceLabel={sign.rightRouteProvinceLabel}
            threeDigitDescend={sign.rightRouteThreeDigitDescend}
            fontChinese={fontChinese}
            fontLatin={fontLatin}
            x={ROUTE_SIGN_X}
            y={SECOND_ROW_Y}
            width={secondRowLayout.routeWidth}
            height={ROUTE_SIGN_HEIGHT}
          />
          <g data-part="destination">
            <OutlinedText
              font={fontChinese}
              text={secondDestination}
              startX={secondRowLayout.destinationX}
              startY={SECOND_ROW_Y + 27.5}
              width={secondRowLayout.destinationWidth}
              height={71.5}
              fill={WHITE}
              options={DESTINATION_TEXT_OPTIONS}
            />
          </g>
        </g>
        <OutlinedText
          font={fontChinese}
          text={distance}
          startX={280}
          startY={343}
          width={48}
          height={57}
          fill={WHITE}
          options={{
            maxGap: 4,
            minGap: 0,
          }}
        />
        <OutlinedText
          font={fontChinese}
          text="k"
          startX={331}
          startY={364}
          width={35}
          height={35}
          fill={WHITE}
        />
        <OutlinedText
          font={fontChinese}
          text="m"
          startX={377}
          startY={373}
          width={27}
          height={27}
          fill={WHITE}
        />
      </g>
    </RawSvg>
  )
}
