// Usage: node pixdiff.cjs <sbA> <sbB> <out.json> id1,id2,...  — screenshots each story in both builds and compares bytes.
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const [a, b, out, ids] = process.argv.slice(2);
const serve = (dir) => http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(dir, p); if (!fs.existsSync(f)) { res.statusCode = 404; return res.end(); } const t = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(f)]; if (t) res.setHeader('content-type', t); fs.createReadStream(f).pipe(res); });
(async () => {
  const sa = serve(a), sb = serve(b); await new Promise(r => sa.listen(0, r)); await new Promise(r => sb.listen(0, r));
  const br = await chromium.launch(); const res = [];
  for (const id of ids.split(',')) {
    const shots = [];
    for (const s of [sa, sb]) { const p = await br.newPage({ viewport: { width: 1440, height: 1000 } }); await p.emulateMedia({ reducedMotion: 'reduce' }); await p.goto(`http://localhost:${s.address().port}/iframe.html?id=${id}&viewMode=story`); await p.waitForTimeout(2500); shots.push(await p.screenshot({ fullPage: true, animations: 'disabled' })); await p.close(); }
    const same = shots[0].equals(shots[1]); res.push({ id, identical: same }); console.log(`${same ? 'IDENTICAL' : 'DIFFERENT'} ${id}`);
  }
  await br.close(); sa.close(); sb.close(); fs.writeFileSync(out, JSON.stringify(res, null, 2));
})();
