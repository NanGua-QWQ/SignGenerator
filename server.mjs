// The shipped app needs only Node.js; all drawing still runs in the browser.
import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), 'out');
const port = Number(process.env.PORT || 3000);
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

if (!existsSync(resolve(root, 'signs.html')) || !existsSync(resolve(root, 'fonts/han'))) {
  console.error('[ERROR] The offline build is missing. Run the rebuild script first.');
  process.exit(1);
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('[ERROR] PORT must be an integer from 1 to 65535.');
  process.exit(1);
}

const server = createServer(async (request, response) => {
  const reply = (status, body, headers = {}) => {
    response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
    response.end(request.method === 'HEAD' ? undefined : body);
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    reply(405, 'Method not allowed', { Allow: 'GET, HEAD' });
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent((request.url || '/').split('?')[0]);
  } catch {
    reply(400, 'Bad request');
    return;
  }
  // Reject Windows separators, drive names, null bytes and traversal before resolution.
  if (!pathname.startsWith('/') || /[\\:\0]/.test(pathname)
    || pathname.split('/').some(part => part === '..' || part === '.')) {
    reply(400, 'Bad request');
    return;
  }
  if (pathname === '/') {
    reply(307, '', { Location: '/signs' });
    return;
  }

  const normalized = pathname.replace(/\/+$/, '');
  const candidates = [normalized, `${normalized}.html`, `${normalized}/index.html`];
  try {
    for (const candidate of candidates) {
      const file = resolve(root, `.${candidate}`);
      if (!file.startsWith(root + sep)) continue;
      const info = await stat(file).catch(error => {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
        throw error;
      });
      if (!info?.isFile()) continue;

      const fontType = /^\/fonts\/(han|a|b|c)$/.test(normalized)
        ? (normalized === '/fonts/han' ? 'font/otf' : 'font/ttf') : null;
      response.writeHead(200, {
        'Content-Type': fontType || mimeTypes[extname(file)] || 'application/octet-stream',
        'Content-Length': info.size,
        'Cache-Control': normalized.startsWith('/_next/static/')
          ? 'public, max-age=31536000, immutable' : 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      });
      if (request.method === 'HEAD') response.end();
      else {
        const stream = createReadStream(file);
        stream.on('error', () => response.destroy());
        response.on('close', () => stream.destroy());
        stream.pipe(response);
      }
      return;
    }
    // Match the old application's fallback for unknown workspace names.
    if (/^\/[^/.]+$/.test(normalized)) reply(307, '', { Location: '/signs' });
    else reply(404, 'Not found');
  } catch (error) {
    console.error('[ERROR] Unable to read an application file:', error.message);
    if (!response.headersSent) reply(500, 'Unable to read application file');
    else response.destroy();
  }
});

server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `[ERROR] Port ${port} is already in use. Close the existing server and try again.`
    : `[ERROR] ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${port}`;
  console.log(`Road Sign Generator is ready: ${url}`);
  console.log('Offline mode. Keep this window open; press Ctrl+C to stop.');
  if (process.argv.includes('--open') && process.platform === 'win32') {
    const opener = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], {
      detached: true, stdio: 'ignore', windowsHide: true,
    });
    opener.on('error', () => console.log(`Open ${url} in your browser.`));
    opener.unref();
  }
});
