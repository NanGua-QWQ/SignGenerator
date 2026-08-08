import type {
  EntranceArrowDirection, ExpresswayKind, OrdinaryRoadKind,
} from './types'

export const DIRECTION_OPTIONS = ['东', '南', '西', '北'] satisfies string[]

export const ENTRANCE_ARROW_DIRECTION_OPTIONS = [
  {
    value: 'front',
    label: '前',
  },
  {
    value: 'left',
    label: '左',
  },
  {
    value: 'right',
    label: '右',
  },
] satisfies {
  value: EntranceArrowDirection;
  label: string
}[]

export const EXPRESSWAY_KIND_OPTIONS = [
  {
    value: 'national',
    label: '国家高速',
  },
  {
    value: 'provincial',
    label: '省高速',
  },
  {
    value: 'beijing-tianjin-hebei',
    label: '京津冀高速',
  },
] satisfies {
  value: ExpresswayKind;
  label: string
}[]

export const ORDINARY_KIND_OPTIONS = [
  {
    value: 'ordinary-national',
    label: '国道',
    prefix: 'G',
  },
  {
    value: 'ordinary-provincial',
    label: '省道',
    prefix: 'S',
  },
  {
    value: 'ordinary-county',
    label: '县道',
    prefix: 'X',
  },
  {
    value: 'ordinary-township',
    label: '乡道',
    prefix: 'Y',
  },
] satisfies {
  value: OrdinaryRoadKind;
  label: string;
  prefix: string
}[]
