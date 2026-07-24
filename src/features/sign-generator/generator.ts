import type { Sign } from './types'
import { generateExpresswaySignSvg } from './generators/expressway'
import { generateRoadForkPreviewSvg } from './generators/road-fork-preview'

export async function generateSignSvg(sign: Sign): Promise<string> {
  if (sign.template === 'road-fork-preview') return generateRoadForkPreviewSvg(sign)
  return generateExpresswaySignSvg(sign.code, sign.name, sign.provinceLabel, sign.kind)
}

export function signFilename(sign: Sign): string {
  const code = sign.template === 'road-fork-preview' ? `道路分岔预告_${sign.exitNumber}` : sign.code
  const name = sign.template === 'road-fork-preview' ? sign.exitName || sign.name : sign.name
  const safeCode = String(code || 'road-sign').trim().replace(/[<>:"/\\|?*]/g, '_')
  const safeName = String(name || '').trim().replace(/[<>:"/\\|?*]/g, '_')
  const base = `${safeCode}${safeName ? `_${safeName}` : ''}`
  return `${base || 'road-sign'}.svg`
}
