const { chromium } = require('../EnsuredNetwork/node_modules/playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const results = [];
  for (const story of [
    'saved-without-pipeline',
    'edit-without-pipeline',
    'save-failure-retry',
    'permission-denied',
    'incomplete-draft',
    'loading-input',
  ]) {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
    await p.addInitScript(() => {
      window.events = [];
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
            value.on(event, (payload) => window.events.push({ event, payload }));
        },
      });
    });
    await p.goto(
      (process.env.STORYBOOK_URL || 'http://localhost:6017') +
        '/iframe.html?id=pages-insurer-dashboard-manual-input--' +
        story +
        '&viewMode=story',
    );
    await p.waitForFunction(() => window.events?.length, {}, { timeout: 45000 });
    const events = await p.evaluate(() => window.events);
    const pass =
      events.some((e) => e.event === 'storyFinished' && e.payload.status === 'success') &&
      !events.some((e) => e.event !== 'storyFinished');
    results.push({ story, pass, events });
    console.log(story, pass, pass ? '' : (await p.locator('body').innerText()).slice(0, 500));
    await p.close();
  }
  await b.close();
  fs.writeFileSync(
    require('node:path').join(__dirname, '../output/manual-input-2026-11-17/stories.json'),
    JSON.stringify(results, null, 2),
  );
  if (results.some((x) => !x.pass)) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
