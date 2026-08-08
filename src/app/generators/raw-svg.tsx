import type {
  ReactNode,
} from 'react'

interface RawSvgProps {
  template: string
  label: string
  width?: number | string
  height?: number | string
  children?: ReactNode
}

function extractInner(template: string) {
  return template
    .replace(/<!--rotationCenter:[\s\S]*?-->/, '')
    .replace(/^[\s\S]*?<svg[^>]*>/i, '')
    .replace(/<\/svg>[\s\S]*$/i, '')
}

function extractViewBox(template: string) {
  const match = /<svg[^>]*\sviewBox=["']([^"']+)["']/i.exec(template)
  return match?.[1]
}

export function RawSvg({
  template, label, width, height, children,
}: RawSvgProps) {
  const inner = extractInner(template)
  const viewBox = extractViewBox(template)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={label}
      viewBox={viewBox}
      width={width}
      height={height}
    >
      <g dangerouslySetInnerHTML={{
        __html: inner,
      }} />
      {children}
    </svg>
  )
}
