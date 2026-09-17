import {
  useFont,
} from '../../fonts/FontContext'
import {
  GREEN,
  WHITE,
  OutlinedText,
  textLayout,
} from '../svg-text'

const HEIGHT = 360
const PADDING = 34

export function urbanExpresswayRoadNameNaturalSize(
  font: Parameters<typeof textLayout>[0],
  name: string,
) {
  const text = Array.from(String(name || '').trim()).slice(0, 24).join('') || '北四环'
  const textLayoutResult = textLayout(font, text, 150)
  return {
    text,
    width: Math.max(520, Math.ceil(textLayoutResult.usedWidth + 220)),
    height: HEIGHT,
  }
}

export function UrbanExpresswayRoadNameSign({
  name,
  x,
  y,
  width: renderedWidth,
  height: renderedHeight,
}: { name: string; x?: number; y?: number; width?: number; height?: number }) {
  const font = useFont('a')
  const {
    text, width,
  } = urbanExpresswayRoadNameNaturalSize(font, name)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${HEIGHT}`}
      x={x}
      y={y}
      width={renderedWidth ?? width}
      height={renderedHeight ?? HEIGHT}
      role="img"
      aria-label={`${text} 无编号快速路道路标识`}
    >
      <rect width={width} height={HEIGHT} rx="72" fill={GREEN} />
      <rect
        x={PADDING}
        y={PADDING}
        width={width - PADDING * 2}
        height={HEIGHT - PADDING * 2}
        rx="48"
        fill="none"
        stroke={WHITE}
        strokeWidth="14"
      />
      <OutlinedText
        font={font}
        text={text}
        startX={PADDING + 28}
        startY={105}
        width={width - (PADDING + 28) * 2}
        height={150}
        fill={WHITE}
        options={{
          maxGap: 30,
          minGap: 12,
          scaleMode: 'reference',
          referenceText: '北四环快速路',
        }}
      />
    </svg>
  )
}
