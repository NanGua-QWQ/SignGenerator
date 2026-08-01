import type { Font } from '@pdf-lib/fontkit'
import { use } from 'react'
import type { ReactNode } from 'react'
import type { OrdinaryRoadKind } from '../../types'
import { BLACK, RED, WHITE, YELLOW, loadFont, OutlinedText } from '../svg-text'

const WIDTH = 213.51
const HEIGHT = 102.59
const OUTER_RADIUS = 19.36
const MIDDLE_INSET_X = 4.9
const MIDDLE_INSET_Y = 4.99
const MIDDLE_WIDTH = 203.4
const MIDDLE_HEIGHT = 92.6
const MIDDLE_RADIUS = 13.74
const INNER_INSET_X = 9.31
const INNER_INSET_Y = 9.57
const INNER_WIDTH = 194.52
const INNER_HEIGHT = 83.52
const INNER_RADIUS = 9.2
const CODE_X = 30
const CODE_Y = 22
const CODE_WIDTH = 154
const CODE_HEIGHT = 57

//以下为对照层位置算法
/* const REFERENCE_PATH_SOURCE_X = 337.23
const REFERENCE_PATH_SOURCE_Y = 307.14
const REFERENCE_PATH_SOURCE_WIDTH = 286.34
const REFERENCE_PATH_SOURCE_HEIGHT = 105.66
const REFERENCE_PATH_SCALE = Math.min(CODE_WIDTH / REFERENCE_PATH_SOURCE_WIDTH, CODE_HEIGHT / REFERENCE_PATH_SOURCE_HEIGHT)
const REFERENCE_PATH_X = CODE_X + (CODE_WIDTH - REFERENCE_PATH_SOURCE_WIDTH * REFERENCE_PATH_SCALE) / 2
const REFERENCE_PATH_Y = CODE_Y + (CODE_HEIGHT - REFERENCE_PATH_SOURCE_HEIGHT * REFERENCE_PATH_SCALE) / 2
const REFERENCE_PATH_TRANSFORM = `matrix(${REFERENCE_PATH_SCALE} 0 0 ${REFERENCE_PATH_SCALE} ${REFERENCE_PATH_X - REFERENCE_PATH_SOURCE_X * REFERENCE_PATH_SCALE} ${REFERENCE_PATH_Y - REFERENCE_PATH_SOURCE_Y * REFERENCE_PATH_SCALE})`
 */

interface OrdinaryRoadConfig {
  codePrefix: string
  label: string
  border: string
  fill: string
  text: string
}

const ROAD_CONFIG: Record<OrdinaryRoadKind, OrdinaryRoadConfig> = {
  'ordinary-national': { codePrefix: 'G', label: '国道', border: WHITE, fill: RED, text: WHITE },
  'ordinary-provincial': {
    codePrefix: 'S',
    label: '省道',
    border: BLACK,
    fill: YELLOW,
    text: BLACK,
  },
  'ordinary-county': { codePrefix: 'X', label: '县道', border: BLACK, fill: WHITE, text: BLACK },
  'ordinary-township': { codePrefix: 'Y', label: '乡道', border: BLACK, fill: WHITE, text: BLACK },
}

function cleanDigits(value: string): string {
  return (
    String(value || '')
      .replace(/\D/g, '')
      .slice(0, 3) || '105'
  )
}

function ordinaryRoadCode(kind: OrdinaryRoadKind, digits: string): string {
  return `${ROAD_CONFIG[kind].codePrefix}${cleanDigits(digits)}`
}

interface OrdinaryRoadNodeProps {
  kind: OrdinaryRoadKind
  digits: string
  fontLatin: Font
}
function OrdinaryRoadNode({ kind, digits, fontLatin }: OrdinaryRoadNodeProps) {
  const config = ROAD_CONFIG[kind]
  const code = ordinaryRoadCode(kind, digits)
  {
    /*       <g transform={REFERENCE_PATH_TRANSFORM} opacity={0.45}>
        <path xmlns="http://www.w3.org/2000/svg" d="M433.1725,351.08143c5.58,-5.82 13.02,-9.76 11.82,-19.56c-0.37334,-3.17334 -2.32,-5.38668 -5.84,-6.64c-7.05332,-2.52 -14.12668,-1.99332 -21.22,1.58c-1.73332,0.88 -3.05332,1.79334 -3.96,2.74c-1.18666,1.26666 -1.98668,2.10668 -2.4,2.52c-0.5999,0.5879 -1.49614,0.73994 -2.24,0.38l-10.36,-4.94c-0.19626,-0.09296 -0.34442,-0.26436 -0.40894,-0.47308c-0.06452,-0.2087 -0.03954,-0.43586 0.06894,-0.62694c2.94668,-5.18666 6.54666,-9.26666 10.8,-12.24c4.65334,-3.25334 9.80666,-5.17334 15.46,-5.76c9.18666,-0.93334 17.10668,0.21332 23.76,3.44c4.22668,2.05334 8.08,6.22 11.56,12.5c0.4856,0.89244 0.74,1.89632 0.74,2.92v12.5c0,0.5133 -0.11626,1.01936 -0.34,1.48l-3,6.32c-0.03986,0.06642 -0.08686,0.12686 -0.14,0.18l-8.72,8.72c-0.0792,0.0924 -0.1744,0.1672 -0.28,0.22c-4.22668,2.89332 -8.12,6.01332 -11.68,9.36c-6.12,5.74666 -9.58,9.03332 -10.38,9.86c-5.21334,5.4 -8.95332,11.26668 -11.22,17.6c-0.18854,0.53792 -0.10694,1.13384 0.21892,1.5988c0.32586,0.46494 0.85554,0.74122 1.42108,0.7412h43.06c0.49706,0 0.9,0.40294 0.9,0.9v13.62c0,0.47496 -0.38504,0.86 -0.86,0.86h-61.98c-0.47006,-0.00002 -0.85756,-0.3787 -0.88,-0.86c-0.48,-10.97332 1.78,-21.14 6.78,-30.5c0.2261,-0.42562 0.4941,-0.8276 0.8,-1.2c3.52,-4.12 5.62,-7.9 8.78,-11.12c4.72,-4.84 10.86668,-9.84668 18.44,-15.02c0.46548,-0.31918 0.90102,-0.68772 1.3,-1.1z" fill="#221e1f" fill-rule="evenodd" stroke="none" stroke-width="2" stroke-miterlimit="10"/>
        <path xmlns="http://www.w3.org/2000/svg" d="M548.9489,360.48903c-0.047,11.8006 -0.415,21.208 -4.0428,32.2018c-4.52906,13.72708 -14.7536,20.44394 -30.6736,20.1506c-9.86,-0.18 -17.58,-3.78 -23.24,-11.4c-2.24,-3.01332 -3.86,-5.65332 -4.86,-7.92c-1.93334,-4.33332 -3.1508,-7.8816 -3.6524,-10.6448c-1.3248,-7.344 -1.97174,-14.89732 -1.9408,-22.66c0.03094,-7.76268 0.73806,-15.31068 2.1214,-22.644c0.52348,-2.75908 1.76912,-6.29748 3.737,-10.6152c1.018,-2.25866 2.65892,-4.88572 4.9228,-7.8812c5.7206,-7.5746 13.469,-11.113 23.3302,-11.2144c15.92188,-0.16654 26.09254,6.6316 30.512,20.3944c3.5402,11.0222 3.8332,20.4322 3.7862,32.2328zM496.6441,360.23943c-0.06628,4.95612 0.06074,9.89846 0.381,14.827c0.28494,4.38334 2.22074,9.64168 5.8074,15.775c0.35854,0.61084 0.78868,1.16868 1.28,1.66c4.24,4.2 9.90666,5.47334 17,3.82c0.56726,-0.13192 1.09828,-0.37702 1.56,-0.72c5.49334,-4 8.5,-8.70668 9.02,-14.12c0.64,-6.73334 1.19486,-13.52706 1.6646,-20.3812c0.00346,-0.04906 0.00648,-0.17232 0.009,-0.3698c0.00268,-0.19734 0.003,-0.3206 0.001,-0.3698c-0.2864,-6.86426 -0.65946,-13.6704 -1.1192,-20.4184c-0.37506,-5.42532 -3.2548,-10.21074 -8.6392,-14.3562c-0.45238,-0.35518 -0.97668,-0.61438 -1.5402,-0.7614c-7.04668,-1.8424 -12.7454,-0.721 -17.0962,3.3642c-0.50424,0.47802 -0.94912,1.02418 -1.3238,1.6252c-3.74932,6.0352 -5.82506,11.23992 -6.2272,15.6142c-0.45188,4.91814 -0.71094,9.8552 -0.7772,14.8112z" fill="#221e1f" fill-rule="evenodd" stroke="none" stroke-width="2" stroke-miterlimit="10"/>
        <path xmlns="http://www.w3.org/2000/svg" d="M589.2325,313.96143c7.4,-5.4 16.43334,-7.30668 27.1,-5.72c5.54668,0.82666 10.04668,2.84 13.5,6.04c3.97332,3.68 6.56666,7.90668 7.78,12.68c2.38666,9.37334 0.87332,18.61332 -4.54,27.72c-0.3836,0.66256 -0.24956,1.50016 0.32,2c3.42,3.04 6.2,6.82 7.28,11.38c2.64,10.98 2.58,26.96 -5.54,35.72c-3.57332,3.85334 -8.08666,6.45332 -13.54,7.8c-17.82,4.4 -34.76,-0.9 -44.28,-17.6c-0.17138,-0.30746 -0.20372,-0.6731 -0.0887,-1.00278c0.115,-0.32968 0.36612,-0.5912 0.68872,-0.71722l10.96,-4.24c0.71118,-0.27724 1.52168,-0.08654 2.04,0.48c3.18666,3.56 5.95332,5.82668 8.3,6.8c7.46668,3.08 14.90668,2.70666 22.32,-1.12c0.63908,-0.3391 1.1609,-0.85396 1.5,-1.48c4.45332,-8.12 4.73332,-15.98 0.84,-23.58c-2.65332,-5.18666 -8.3,-7.01332 -16.94,-5.48c-0.3236,0.05452 -0.65478,-0.03632 -0.9053,-0.24828c-0.25052,-0.21198 -0.3949,-0.52356 -0.3947,-0.85172v-13.72c0,-0.30344 0.1312,-0.59188 0.3586,-0.78846c0.2274,-0.19658 0.5279,-0.28128 0.8214,-0.23156c7.4,1.22 14.36,-1.18 15.96,-9.04c1.04,-5.04 0.04,-9.14 -3,-12.3c-0.51392,-0.52708 -1.13478,-0.93644 -1.82,-1.2c-9.96,-3.73334 -18.54668,-1.96 -25.76,5.32c-0.26252,0.26394 -0.66192,0.33584 -1,0.18l-11.36,-5.44c-0.10344,-0.04926 -0.17902,-0.14278 -0.2061,-0.25498c-0.02708,-0.11222 -0.00286,-0.23138 0.0661,-0.32502c4.17334,-5.57332 7.35334,-9.16666 9.54,-10.78z" fill="#221e1f" fill-rule="evenodd" stroke="none" stroke-width="2" stroke-miterlimit="10"/>
        <path xmlns="http://www.w3.org/2000/svg" d="M362.2325,310.32143c2.54668,0.33332 5.51334,2.16 8.9,5.48c3.4,3.32 5.99334,6.67334 7.78,10.06c0.3461,0.63444 0.17678,1.43014 -0.4,1.88c-0.78668,0.62666 -1.84,0.98 -3.16,1.06c-0.39874,0.02418 -0.74712,0.30132 -0.88,0.7c-0.05334,0.14666 -1.79334,1.12 -5.22,2.92c-0.52934,0.27672 -1.18282,0.18906 -1.64,-0.22l-7.26,-6.68c-0.34086,-0.31464 -0.75424,-0.53512 -1.2,-0.64c-5.76,-1.36 -11.46,-1.35332 -17.1,0.02c-0.70352,0.16936 -1.33796,0.54582 -1.82,1.08c-3.12,3.4 -3.81332,7.4 -2.08,12c0.25092,0.64714 0.62456,1.23816 1.1,1.74c5.45332,5.6 12.68,10.03334 21.68,13.3c0.5575,0.21238 1.08888,0.5016 1.58,0.86c2.98,2.16 8.36,5.26 11.32,8.68c8.36,9.76 10.72,20.75334 7.08,32.98c-2.26668,7.57332 -7.17332,12.51332 -14.72,14.82c-11.65332,3.57332 -22.56668,3.22 -32.74,-1.06c-1.46814,-0.60842 -2.81608,-1.47544 -3.98,-2.56c-0.70668,-0.65332 -2.54668,-2.47332 -5.52,-5.46c-0.85332,-0.86666 -1.31332,-1.55334 -1.38,-2.06c-0.08,-0.66668 -0.50666,-1.07334 -1.28,-1.22c-0.2527,-0.03792 -0.481,-0.19994 -0.62,-0.44l-3.06,-5.28c-0.24382,-0.4432 -0.09218,-0.99624 0.34,-1.24l10.32,-5.96c0.2652,-0.15384 0.58068,-0.19602 0.87698,-0.11724c0.29632,0.07878 0.5492,0.27202 0.70302,0.53724c3.44,5.97332 7.69332,9.53334 12.76,10.68c5.4,1.21332 10.60668,1.26 15.62,0.14c8.88,-2 9.12,-8.74 7.66,-17.2c-0.118,-0.6686 -0.40738,-1.29562 -0.84,-1.82c-4.66666,-5.52 -12.46,-10.84666 -23.38,-15.98c-2.64,-1.25334 -6.09332,-3.7 -10.36,-7.34c-6.56,-5.62 -8.5,-11.24 -9.5,-19.58c-0.4,-3.37334 -0.00666,-6.52668 1.18,-9.46c4.22666,-10.46668 12.48668,-16.01332 24.78,-16.64c6.09332,-0.29334 10.92,0.13334 14.48,1.28c0.02124,0.0053 0.03948,0.0188 0.05074,0.03756c0.01126,0.01876 0.01458,0.04122 0.00928,0.06244c-0.06668,0.2 -0.14,0.36 -0.22,0.48c-0.02366,0.02758 -0.02014,0.06572 0.00916,0.0992c0.0293,0.03348 0.0796,0.05686 0.13084,0.0608z" fill="#221e1f" fill-rule="evenodd" stroke="none" stroke-width="2" stroke-miterlimit="10"/>
      </g> */
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`${code} ${config.label}标识牌`}
    >
      <rect
        x={0}
        y={0}
        width={WIDTH}
        height={HEIGHT}
        rx={OUTER_RADIUS}
        fill={config.fill}
        stroke="none"
        strokeMiterlimit={10}
      />
      <rect
        x={MIDDLE_INSET_X}
        y={MIDDLE_INSET_Y}
        width={MIDDLE_WIDTH}
        height={MIDDLE_HEIGHT}
        rx={MIDDLE_RADIUS}
        fill={config.border}
        stroke="none"
        strokeMiterlimit={10}
      />
      <rect
        x={INNER_INSET_X}
        y={INNER_INSET_Y}
        width={INNER_WIDTH}
        height={INNER_HEIGHT}
        rx={INNER_RADIUS}
        fill={config.fill}
        stroke="none"
        strokeMiterlimit={10}
      />

      <OutlinedText
        font={fontLatin}
        text={code}
        startX={CODE_X}
        startY={CODE_Y}
        width={CODE_WIDTH}
        height={CODE_HEIGHT}
        fill={config.text}
        options={{ maxGap: 13, minGap: 9 }}
      />
    </svg>
  )
}

interface OrdinaryRoadSignSvgProps {
  kind: OrdinaryRoadKind
  digits: string
}

export function OrdinaryRoadSignSvg({ kind, digits }: OrdinaryRoadSignSvgProps): ReactNode {
  const fontLatin = use(loadFont('b'))
  return <OrdinaryRoadNode kind={kind} digits={digits} fontLatin={fontLatin} />
}

export function ordinaryRoadFilename(kind: OrdinaryRoadKind, digits: string): string {
  return `${ordinaryRoadCode(kind, digits)}.svg`
}
