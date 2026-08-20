import icon from './icon.png'
import narrow from './images/screenshots/narrow.jpeg'
import wide from './images/screenshots/wide.jpeg'

import type {
  MetadataRoute,
} from 'next'

export default function manifest() {
  const
    label = '道路名称标识页',
    type = 'image/jpeg'
  return {
    'name': 'sign-generator',
    'short_name': 'sign-generator',
    'background_color': '#359b47',
    'theme_color': '#359b47',
    'start_url': '/',
    'display': 'standalone',
    'orientation': 'landscape',
    'icons': ([
      'any',
      'maskable',
    ] as const).map(purpose => ({
      src: icon.src,
      sizes: '1024x1024',
      type: 'image/png',
      purpose,
    })),
    'screenshots': [
      {
        form_factor: 'wide',
        ...wide,
        label,
        type,
        sizes: '1753x898',
      },
      {
        form_factor: 'narrow',
        ...narrow,
        label,
        type,
        sizes: '425x874',
      },
    ],
    'display_override': [
      'window-controls-overlay',
    ],
  } satisfies MetadataRoute.Manifest
}
