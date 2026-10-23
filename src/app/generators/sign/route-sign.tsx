import type {
  SignKind,
} from '@/lib/types'

import {
  ExpresswaySignNode,
} from './expressway'
import {
  OrdinaryRoadSignSvg,
} from './ordinary_road'
import {
  UrbanExpresswayRoadNameSign,
} from './urban-expressway-road-name'
import {
  UrbanRoadNameSign,
} from './urban-road-name'

import type {
  Font,
} from '@pdf-lib/fontkit'

interface RouteSignProps {
  code: string
  kind: SignKind
  provinceLabel?: string
  threeDigitDescend?: boolean
  fontChinese: Font
  fontLatin: Font
  x?: number
  y?: number
  width?: number
  height?: number
}

export function RouteSignNode({
  code,
  kind,
  provinceLabel,
  threeDigitDescend,
  fontChinese,
  fontLatin,
  x,
  y,
  width,
  height,
}: RouteSignProps) {
  if (kind === 'ordinary-national' || kind === 'ordinary-provincial' || kind === 'ordinary-county' || kind === 'ordinary-township') {
    return <OrdinaryRoadSignSvg
      kind={kind}
      digits={code.replace(/^\D+/, '')}
      x={x}
      y={y}
      width={width}
      height={height}
    />
  }
  if (kind === 'urban-expressway') {
    return <UrbanExpresswayRoadNameSign
      name={code}
      x={x}
      y={y}
      width={width}
      height={height}
    />
  }
  if (kind === 'urban-road') {
    return <UrbanRoadNameSign
      name={code}
      x={x}
      y={y}
      width={width}
      height={height}
    />
  }
  return <ExpresswaySignNode
    code={code}
    kind={kind}
    provinceLabel={provinceLabel}
    threeDigitDescend={threeDigitDescend}
    fontChinese={fontChinese}
    fontLatin={fontLatin}
    x={x}
    y={y}
    width={width}
    height={height}
  />
}
