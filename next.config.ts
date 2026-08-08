import {
  type TurbopackRuleConfigItem,
} from 'next/dist/server/config-shared'

import type {
  NextConfig,
} from 'next'

const
  rawRule = {
    loaders: [
      'raw-loader',
    ],
    as: '*.js',
  } satisfies TurbopackRuleConfigItem,
  nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    turbopack: {
      rules: {
        '*.svg': rawRule,
        '*.raw.ts': rawRule,
      },
    },
  }

export default nextConfig
