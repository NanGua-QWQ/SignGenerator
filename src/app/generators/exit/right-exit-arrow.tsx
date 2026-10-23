import {
  WHITE,
} from '../svg-text'

const RIGHT_EXIT_ARROW_PATH = [
  'M286.285,291.045l0.93,-17.64c0.012,-0.24062 -0.13084,-0.46208 ',
  '-0.355,-0.55038c-0.22415,-0.0883 -0.47966,-0.02377 -0.635,0.16039',
  'c-1.17,1.37 -19.05334,19.80667 -26.8,26.98c-0.19577,0.17902 ',
  '-0.49982,0.17021 -0.69,-0.02l-8.08,-8.08c-0.14275,-0.14276 ',
  '-0.22305,-0.33613 -0.22305,-0.53708c0,-0.20095 0.0803,-0.39282 ',
  '0.22305,-0.53292l26.89,-26.9c0.0683,-0.06912 0.08704,-0.17312 ',
  '0.04717,-0.26173c-0.03987,-0.0886 -0.13015,-0.14356 -0.22717,-0.13828',
  'l-17.78,0.73c-0.18017,0.00778 -0.34703,-0.09651 -0.41836,-0.26147',
  'c-0.07134,-0.16497 -0.0321,-0.35581 0.09836,-0.47853l11.78,-11.07',
  'c0.21929,-0.20639 0.51041,-0.3271 0.82,-0.34l27.36,-1.14',
  'c0.16771,-0.00511 0.32994,0.05996 0.44763,0.17955c0.11769,0.11959 ',
  '0.18016,0.28285 0.17237,0.45045l-1.46,27.51c-0.01932,0.34133 ',
  '-0.16527,0.66526 -0.41,0.91l-11.24,11.24c-0.0775,0.07745 ',
  '-0.19469,0.09783 -0.29457,0.05121c-0.09987,-0.04661 ',
  '-0.16171,-0.15053 -0.15543,-0.26121z',
].join('')

const RIGHT_EXIT_CENTER_X = 274.7
const RIGHT_EXIT_CENTER_Y = 276
const FRONT_ARROW_PATH = 'M 33 78 H 47 V 42 H 65 L 40 14 L 15 42 H 33 Z'

export function RightExitArrow({
  x,
  y,
  scale = 1.45,
}: { x: number; y: number; scale?: number }) {
  return (
    <path
      d={RIGHT_EXIT_ARROW_PATH}
      transform={`translate(${x - RIGHT_EXIT_CENTER_X * scale} ${y - RIGHT_EXIT_CENTER_Y * scale}) scale(${scale})`}
      fill={WHITE}
    />
  )
}

export function ExitDirectionArrow({
  direction,
  x,
  y,
  scale = 1.45,
}: {
  direction: 'front' | 'left' | 'right'
  x: number
  y: number
  scale?: number
}) {
  if (direction === 'front') {
    return <path
      d={FRONT_ARROW_PATH}
      transform={`translate(${x - 40 * scale} ${y - 46 * scale}) scale(${scale})`}
      fill={WHITE}
    />
  }

  const transform = direction === 'right'
    ? `translate(${x - RIGHT_EXIT_CENTER_X * scale} ${y - RIGHT_EXIT_CENTER_Y * scale}) scale(${scale})`
    : `translate(${x + RIGHT_EXIT_CENTER_X * scale} ${y - RIGHT_EXIT_CENTER_Y * scale}) scale(${-scale} ${scale})`
  return <path d={RIGHT_EXIT_ARROW_PATH} transform={transform} fill={WHITE} />
}
