import {
  type TurbopackRuleConfigItem,
} from 'next/dist/server/config-shared'

import type {
  NextConfig,
} from 'next'

const
  basePath = process.env.NEXT_PUBLIC_BASE_PATH,
  rawRule = {
    loaders: [
      'raw-loader',
    ],
    as: '*.js',
  } satisfies TurbopackRuleConfigItem,
  nextConfig: NextConfig = {
    output: 'export',
    // GitHub Pages project sites are hosted under /<repository-name>.
    // This is empty for local development and the offline package.
    ...basePath ? {
      basePath,
    } : {
    },
    reactCompiler: true,
    webpack(config) {
      // These imports are source text, not images or executable TS modules.
      // Match them before Next's image and TypeScript loaders.
      config.module.rules = [{
        oneOf: [
          {
            test: /(?:\.svg|\.raw\.ts)$/i,
            type: 'asset/source',
          },
          {
            rules: config.module.rules,
          },
        ],
      }]
      return config
    },
    turbopack: {
      rules: {
        '*.svg': rawRule,
        '*.raw.ts': rawRule,
      },
    },
  }

export default nextConfig
