// Usage: node run-stories.cjs <storybook-static-dir> <out.json> <titlePrefix>[,<titlePrefix>...]
// Serves the static Storybook, runs each matching story's play function, then axe on the root.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const [dir, out, prefixes] = process.argv.slice(2);
const axeSrc = fs.readFileSync(path.join(__dirname, 'node_modules/axe-core/axe.min.js'), 'utf8');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(dir, p);
  if (!f.startsWith(path.resolve(dir)) || !fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  const want = prefixes.split(',');
  const stories = Object.values(index.entries).filter((e) => e.type === 'story' && want.some((w) => e.title === w));
  const b = await chromium.launch();
  const results = [];
  for (const s of stories) {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    const consoleErrors = [];
    p.on('pageerror', (e) => consoleErrors.push(String(e)));
    await p.addInitScript(() => {
      window.__ev = [];
      let ch;
      Object.defineProperty(window, '__STORYBOOK_ADDONS_CHANNEL__', {
        configurable: true,
        get: () => ch,
        set: (v) => {
          ch = v;
          for (const ev of ['storyFinished', 'playFunctionThrewException', 'storyErrored', 'storyThrewException', 'storyMissing'])
            v.on(ev, (payload) => window.__ev.push({ ev, payload: JSON.parse(JSON.stringify(payload ?? null)) }));
        },
      });
    });
    await p.goto(`${base}/iframe.html?id=${s.id}&viewMode=story`);
    let events = [];
    try {
      await p.waitForFunction(() => window.__ev.some((e) => e.ev !== 'storyFinished' || e.payload), {}, { timeout: 45000 });
      await p.waitForTimeout(300);
      events = await p.evaluate(() => window.__ev);
    } catch (e) { events = [{ ev: 'timeout', payload: String(e) }]; }
    const play = events.some((e) => e.ev === 'storyFinished' && e.payload?.status === 'success') && !events.some((e) => e.ev !== 'storyFinished');
    await p.addScriptTag({ content: axeSrc });
    const axe = await p.evaluate(async () => {
      const r = await window.axe.run('#storybook-root', { resultTypes: ['violations'] });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
    });
    const errs = events.filter((e) => e.ev !== 'storyFinished').map((e) => JSON.stringify(e.payload).slice(0, 600));
    results.push({ id: s.id, play, axeViolations: axe, errors: errs, pageErrors: consoleErrors });
    console.log(`${play ? 'PASS' : 'FAIL'} play | axe ${axe.length} | ${s.id}${errs.length ? ' :: ' + errs[0] : ''}${axe.length ? ' :: ' + axe.map((a) => a.id + '(' + a.impact + ')').join(',') : ''}`);
    await p.close();
  }
  await b.close();
  server.close();
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  const fail = results.filter((r) => !r.play || r.axeViolations.length);
  console.log(`stories=${results.length} playFail=${results.filter((r) => !r.play).length} axeFail=${results.filter((r) => r.axeViolations.length).length}`);
  if (!results.length || fail.length) process.exitCode = 1;
})().catch((e) => { console.error(e); process.exitCode = 1; server.close(); });
