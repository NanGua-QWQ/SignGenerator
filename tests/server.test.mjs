import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer, request } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tabs = JSON.parse(await readFile(resolve(root, 'src/app/[tab]/tab-meta.json'), 'utf8'));

test('offline server: pages, assets, exact fonts and invalid requests', async t => {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const { port } = probe.address();
  await new Promise(done => probe.close(done));
  const child = spawn(process.execPath, [resolve(root, 'server.mjs')], {
    cwd: process.env.TEMP || root,
    env: { ...process.env, PORT: String(port) },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (child.exitCode === null) {
      const closed = once(child, 'exit');
      child.kill();
      await closed;
    }
  });
  await new Promise((done, fail) => {
    const timeout = setTimeout(() => fail(new Error('Server startup timed out')), 10000);
    child.stdout.on('data', data => {
      if (String(data).includes('is ready:')) { clearTimeout(timeout); done(); }
    });
    child.once('error', error => { clearTimeout(timeout); fail(error); });
    child.once('exit', code => { clearTimeout(timeout); fail(new Error(`Server exited: ${code}`)); });
  });
  const get = (path, method = 'GET') => new Promise((done, fail) => {
    const req = request({ hostname: '127.0.0.1', port, path, method }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => done({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', fail);
    });
    req.on('error', fail);
    req.end();
  });

  await t.test('home and old unknown-tab redirects', async () => {
    for (const path of ['/', '/unknown-workspace']) {
      const res = await get(path);
      assert.equal(res.status, 307);
      assert.equal(res.headers.location, '/signs');
    }
  });
  await t.test('all six deep links and client navigation payloads', async () => {
    for (const [tab, title] of Object.entries(tabs)) {
      for (const suffix of ['', '/', '?kind=provincial']) {
        const res = await get(`/${tab}${suffix}`);
        assert.equal(res.status, 200);
        assert.match(res.headers['content-type'], /text\/html/);
        assert.ok(res.body.toString().includes(title));
      }
      const payload = await get(`/${tab}.txt?_rsc=test`);
      assert.equal(payload.status, 200);
      assert.ok(payload.body.length > 0);
      assert.match(payload.headers['content-type'], /text\/plain/);
    }
  });
  await t.test('all exported resources served byte for byte', async () => {
    for (const filename of await readdir(resolve(root, 'out'), { recursive: true })) {
      if (!/\.(js|css|txt|ico|html)$/.test(filename)) continue;
      const disk = await readFile(resolve(root, 'out', filename));
      const response = await get('/' + filename.replaceAll('\\', '/'));
      assert.equal(response.status, 200, filename);
      assert.deepEqual(response.body, disk, filename);
    }
  });
  await t.test('all four full fonts retain their original bytes', async () => {
    const fonts = { han: 'SourceHanSansSC-Bold.otf', a: 'jtbz_A.ttf', b: 'jtbz_B.ttf', c: 'jtbz_C.ttf' };
    for (const [key, filename] of Object.entries(fonts)) {
      const response = await get(`/fonts/${key}`);
      assert.equal(response.status, 200);
      assert.match(response.headers['content-type'], /font\/(otf|ttf)/);
      assert.deepEqual(response.body, await readFile(resolve(root, 'src/app/fonts/files', filename)));
    }
  });
  await t.test('HEAD, missing assets, methods and path containment', async () => {
    const head = await get('/signs', 'HEAD');
    assert.equal(head.status, 200);
    assert.equal(head.body.length, 0);
    assert.ok(Number(head.headers['content-length']) > 0);
    assert.equal((await get('/signs', 'POST')).status, 405);
    assert.equal((await get('/fonts/missing')).status, 404);
    assert.equal((await get('/_next/missing.js')).status, 404);
    for (const path of ['/../package.json', '/%2e%2e/package.json', '/%5c..%5cpackage.json', '/%00', '/C:/Windows/win.ini', '/%zz']) {
      assert.equal((await get(path)).status, 400, path);
    }
  });
});
