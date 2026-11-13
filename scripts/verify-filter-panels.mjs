import { chromium } from '../EnsuredNetwork/node_modules/playwright/index.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname, sep } from 'node:path';
if (!process.env.STORYBOOK_ROOT)
  throw new Error('Set STORYBOOK_ROOT to the independently built package Storybook.');
const root = resolve(process.env.STORYBOOK_ROOT);
let server,
  base = process.env.PARTY_STORYBOOK_URL;
if (!base) {
  server = createServer(async (req, res) => {
    try {
      const path = resolve(
        root,
        '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname),
      );
      if (!path.startsWith(root + sep)) throw new Error('Invalid path');
      const data = await readFile(path);
      res.setHeader(
        'Content-Type',
        {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.woff2': 'font/woff2',
        }[extname(path)] || 'application/octet-stream',
      );
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  server.unref();
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP listener');
  base = `http://127.0.0.1:${address.port}`;
}

const index = await (await fetch(base + '/index.json')).json();
const titles = (process.env.STORY_TITLES || 'XDS/Palette/Workflow').split('|');
const ids = (process.env.STORY_IDS || '').split('|').filter(Boolean);
const stories = Object.values(index.entries).filter(
  (s) => s.type === 'story' && (ids.length ? ids.includes(s.id) : titles.includes(s.title)),
);
if (!stories.length) throw new Error('No matching stories');
const outputDir = process.env.PALETTE_OUTPUT || 'output/filter-panels-2026-11-09';
const browser = await chromium.launch({ headless: true }),
  results = [];
try {
  for (const story of stories) {
    const page = await browser.newPage({
      viewport: { width: Number(process.env.STORY_WIDTH || 375), height: 1000 },
    });
    const errors = [];
    await page.addInitScript((theme) => {
      localStorage.setItem('ensured-xds-theme', theme);
      window.__partyStoryEvents = [];
      let channel;
      Object.defineProperty(window, '__STORYBOOK_ADDONS_CHANNEL__', {
        configurable: true,
        get: () => channel,
        set: (value) => {
          channel = value;
          for (const event of [
            'storyFinished',
            'playFunctionThrewException',
            'storyErrored',
            'storyThrewException',
          ])
            value.on(event, (payload) => window.__partyStoryEvents.push({ event, payload }));
        },
      });
    }, process.env.STORY_THEME || 'dark');
    page.on('pageerror', (e) => errors.push(e.message));
    // Fixtures must never reach any application server.
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== base && !['data:', 'blob:'].includes(url.protocol)) return route.abort();
      return route.continue();
    });
    await page.goto(`${base}/iframe.html?id=${story.id}&viewMode=story`);
    let outcome;
    try {
      await page.waitForFunction(
        () =>
          window.__partyStoryEvents?.some((e) =>
            [
              'storyFinished',
              'playFunctionThrewException',
              'storyErrored',
              'storyThrewException',
            ].includes(e.event),
          ),
        {},
        { timeout: 45000 },
      );
      outcome = await page.evaluate(() => window.__partyStoryEvents);
    } catch (e) {
      outcome = [
        { event: 'timeout', payload: (await page.locator('body').innerText()).slice(0, 2000) },
      ];
    }
    const passed =
      outcome.some((e) => e.event === 'storyFinished' && e.payload.status === 'success') &&
      !errors.length &&
      !outcome.some((e) => e.event !== 'storyFinished');
    if (passed) {
      const closed = page.locator('button[aria-controls]').filter({ hasText: /filters/i });
      if (
        !(await page.locator('[data-right-hand-panel]:visible').count()) &&
        (await closed.count())
      )
        await closed.first().click();
      const panels = page.locator('[data-right-hand-panel]:visible');
      for (let i = 0; i < (await panels.count()); i++) {
        const box = await panels.nth(i).boundingBox();
        if (
          !box ||
          Math.abs(box.x + box.width - Number(process.env.STORY_WIDTH || 375)) > 2 ||
          box.x < 0 ||
          box.y < 0 ||
          box.y + box.height > 1001
        )
          errors.push('Panel is not contained at the viewport right edge: ' + JSON.stringify(box));
      }
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    if (overflow) {
      errors.push('Narrow-screen overflow');
      errors.push(
        await page.evaluate(() =>
          JSON.stringify(
            [...document.querySelectorAll('body *')]
              .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
              .slice(0, 12)
              .map((e) => ({
                tag: e.tagName,
                cls: e.className,
                text: e.textContent.slice(0, 65),
                width: e.getBoundingClientRect().width,
                right: e.getBoundingClientRect().right,
              })),
          ),
        ),
      );
    }
    results.push({ id: story.id, passed: passed && !overflow && !errors.length, outcome, errors });
    console.log(
      passed ? 'PASS' : 'FAIL',
      story.id,
      passed ? '' : JSON.stringify({ outcome, errors }).slice(0, 2500),
    );
    await page.screenshot({
      path: `${outputDir}/${story.id}-${process.env.STORY_THEME || 'dark'}-${process.env.STORY_WIDTH || 375}.png`,
      fullPage: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
  server?.close();
  await mkdir(outputDir, { recursive: true });
  await writeFile(
    `${outputDir}/results-${process.env.STORY_LABEL || 'xds'}-${process.env.STORY_THEME || 'dark'}-${process.env.STORY_WIDTH || 375}.json`,
    JSON.stringify(results, null, 2),
  );
}

if (results.some((r) => !r.passed)) process.exitCode = 1;
