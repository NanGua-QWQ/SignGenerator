import fs from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const isProduction = process.argv.includes('--prod')
const port = Number(process.env.PORT || 5173)
const base = '/'

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
}

let vite
let productionTemplate
let productionRender

async function showStartupAnimation(port) {
  const title = 'SignGenerator'
  const author = '作者：Itz_NanGua'
  const line = '═'.repeat(30)
  const text = `\x1b[36m${line}\x1b[0m\n\x1b[93m${title}\x1b[0m\n\x1b[95m${author}\x1b[0m\n\x1b[36m${line}\x1b[0m\n\x1b[32m$\x1b[0m\n`

  process.stdout.write('\x1b[?25l')
  let index = 0
  const timer = setInterval(() => {
    process.stdout.write(text[index])
    index += 1

    if (index >= text.length) {
      clearInterval(timer)
      process.stdout.write('\x1b[?25h')
      console.log(`\x1b[92m🚀 SSR server is live at http://localhost:${port}\x1b[0m`)
    }
  }, 20)
}

if (!isProduction) {
  const { createServer: createViteServer } = require('./node_modules/vite/index.cjs')
  vite = await createViteServer({
    appType: 'custom',
    server: { middlewareMode: true },
  })
} else {
  productionTemplate = await fs.readFile(path.resolve(__dirname, 'dist/client/index.html'), 'utf-8')
  productionRender = (
    await import(pathToFileURL(path.resolve(__dirname, 'dist/server/entry-server.js')).href)
  ).render
}

createServer(async (request, response) => {
  try {
    const requestUrl = request.url || '/'

    if (!isProduction && vite) {
      const handled = await new Promise(resolve => {
        vite.middlewares(request, response, () => resolve(false))
      })
      if (handled || response.writableEnded) return
    }

    if (isProduction && (await serveStatic(requestUrl, response))) return

    const url = requestUrl.replace(base, '/')
    const template = isProduction
      ? productionTemplate
      : await vite.transformIndexHtml(
          url,
          await fs.readFile(path.resolve(__dirname, 'index.html'), 'utf-8'),
        )
    const render = isProduction
      ? productionRender
      : (await vite.ssrLoadModule('/src/entry-server.tsx')).render
    const appHtml = await render(url)
    const html = template.replace('<!--app-html-->', appHtml)

    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    response.end(html)
  } catch (error) {
    if (!isProduction && vite) vite.ssrFixStacktrace(error)
    console.error(error)
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end(error instanceof Error ? error.stack : String(error))
  }
}).listen(port, () => {
  showStartupAnimation(port)
})

async function serveStatic(requestUrl, response) {
  const url = new URL(requestUrl, 'http://localhost')
  const pathname = decodeURIComponent(url.pathname)
  if (pathname === '/' || pathname.includes('..')) return false

  for (const root of ['dist/client', 'public']) {
    const filePath = path.resolve(__dirname, root, pathname.slice(1))
    if (!filePath.startsWith(path.resolve(__dirname, root))) continue

    try {
      const content = await fs.readFile(filePath)
      const ext = path.extname(filePath)
      response.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control':
          root === 'dist/client' ? 'public, max-age=31536000, immutable' : 'no-cache',
      })
      response.end(content)
      return true
    } catch {
      // Try the next static root, then fall back to SSR.
    }
  }

  return false
}
