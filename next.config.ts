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
    /*
     * `next dev` 默认只放行启动时用的主机名（`localhost`），其余来源访问
     * `/_next/**`、`/__nextjs*`（含 HMR、字体、字体 CSS）一律 403 Unauthorized。
     * 桌面端预览面板是用 `127.0.0.1:3000` 打开页面的，所以整站 JS chunk 全被拦，
     * 页面能返回 200 但 hydration 直接失败。这里把回环地址显式加进白名单。
     * 只影响 dev，生产构建不带这个开关。
     */
    allowedDevOrigins: [
      '127.0.0.1',
      '[::1]',
    ],
    turbopack: {
      rules: {
        '*.svg': rawRule,
      },
    },
  }

export default nextConfig
