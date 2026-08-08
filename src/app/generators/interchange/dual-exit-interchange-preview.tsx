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
  ExpresswaySignNode,
} from '../sign/expressway'
import {
  WHITE, escapeXml, OutlinedText,
} from '../svg-text'

const TEMPLATE_WIDTH = 583.96
const TEMPLATE_HEIGHT = 449.52
const ROUTE_SIGN_HEIGHT = 118
const ROUTE_SIGN_X = 210
const DESTINATION_X = 386
const DESTINATION_WIDTH = 134
const FIRST_ROW_Y = 47
const SECOND_ROW_Y = 193
const DESTINATION_TEXT_OPTIONS = {
  scaleMode: 'reference' as const,
  referenceText: '永州广州玉林',
  maxGap: 16,
  minGap: 14,
}

export function DualExitInterchangePreviewSign({
  sign,
}: { sign: Sign }) {
  const fontChinese = useFont('a')
  const fontLatin = useFont('b')
  const firstRoute = cleanExitRoute(sign.leftRoute, 'G55')
  const secondRoute = cleanExitRoute(sign.rightRoute, 'G55')
  const firstDestination = cleanExitText(sign.exitName, '永州', 4)
  const secondDestination = cleanExitText(sign.exitDestination, '广州', 4)
  const distance = cleanExitDistance(sign.exitDistance || '3')
  const firstRouteWidth = routeSignWidth(firstRoute, ROUTE_SIGN_HEIGHT)
  const secondRouteWidth = routeSignWidth(secondRoute, ROUTE_SIGN_HEIGHT)
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
        <ExpresswaySignNode
          code={firstRoute}
          kind={sign.leftRouteKind}
          provinceLabel={sign.leftRouteProvinceLabel}
          threeDigitDescend={sign.leftRouteThreeDigitDescend}
          fontChinese={fontChinese}
          fontLatin={fontLatin}
          x={ROUTE_SIGN_X}
          y={FIRST_ROW_Y}
          width={firstRouteWidth}
          height={ROUTE_SIGN_HEIGHT}
        />
        <OutlinedText
          font={fontChinese}
          text={firstDestination}
          startX={DESTINATION_X}
          startY={FIRST_ROW_Y + 27.5}
          width={DESTINATION_WIDTH}
          height={71.5}
          fill={WHITE}
          options={DESTINATION_TEXT_OPTIONS}
        />
        <ExpresswaySignNode
          code={secondRoute}
          kind={sign.rightRouteKind}
          provinceLabel={sign.rightRouteProvinceLabel}
          threeDigitDescend={sign.rightRouteThreeDigitDescend}
          fontChinese={fontChinese}
          fontLatin={fontLatin}
          x={ROUTE_SIGN_X}
          y={SECOND_ROW_Y}
          width={secondRouteWidth}
          height={ROUTE_SIGN_HEIGHT}
        />
        <OutlinedText
          font={fontChinese}
          text={secondDestination}
          startX={DESTINATION_X}
          startY={SECOND_ROW_Y + 27.5}
          width={DESTINATION_WIDTH}
          height={71.5}
          fill={WHITE}
          options={DESTINATION_TEXT_OPTIONS}
        />
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
