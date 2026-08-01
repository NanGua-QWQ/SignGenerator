import type { ReactNode } from 'react'
import { use } from 'react'
import type { Sign } from '../../types'
import { cleanExitDistance, cleanExitRoute, cleanExitText, routeSignWidth } from '../generator'
import { ExpresswaySignNode } from '../sign/expressway'
import { WHITE, escapeXml, loadFont, OutlinedText } from '../svg-text'
import { RawSvg } from '../raw-svg'
import dualExitInterchangePreviewTemplate from '/template/双出口枢纽式互通立体交叉的出口预告.svg?raw'

const TEMPLATE_WIDTH = 583.96
const TEMPLATE_HEIGHT = 449.52
const ROUTE_SIGN_HEIGHT = 64
const ROUTE_SIGN_X = 211
const DESTINATION_X = 337
const DESTINATION_WIDTH = 134
const FIRST_ROW_Y = 86
const SECOND_ROW_Y = 213
const DESTINATION_TEXT_OPTIONS = {
  scaleMode: 'reference' as const,
  referenceText: '永州广州玉林',
  maxGap: 16,
}

export function DualExitInterchangePreviewSign({ sign }: { sign: Sign }): ReactNode {
  const fontChinese = use(loadFont('a'))
  const fontLatin = use(loadFont('b'))
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
          startY={FIRST_ROW_Y + 5}
          width={DESTINATION_WIDTH}
          height={54}
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
          startY={SECOND_ROW_Y + 5}
          width={DESTINATION_WIDTH}
          height={54}
          fill={WHITE}
          options={DESTINATION_TEXT_OPTIONS}
        />
        <OutlinedText
          font={fontLatin}
          text={distance}
          startX={233}
          startY={343}
          width={48}
          height={57}
          fill={WHITE}
          options={{ maxGap: 4, minGap: 0 }}
        />
        <OutlinedText
          font={fontLatin}
          text="km"
          startX={303}
          startY={363}
          width={50}
          height={33}
          fill={WHITE}
        />
      </g>
    </RawSvg>
  )
}
