import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const roots = [
  'EnsuredUI/src',
  'EnsuredNetwork/frontend/src',
  'SubmissionUI/src',
  'EnsuredLogistics/app',
  'EnsuredAuth/public',
  'EnsuredServices/public',
];
const errors = [];
let checked = 0;
function scan(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, item.name);
    if (item.isDirectory()) {
      scan(file);
      continue;
    }
    if (!/\.(?:tsx?|jsx?|mjs|css|html)$/.test(file) || /\.stories\.|\.generated\./.test(file))
      continue;
    const text = readFileSync(file, 'utf8');
    checked++;
    // #992 is a human-readable batch identifier in AdminPage, not a color.
    for (const m of text.matchAll(/#[\da-f]{6,8}\b|#[\da-f]{3,4}\b|rgba?\(\s*\d[\d.,\s]*\)/gi)) {
      if (file.endsWith('AdminPage.tsx') && m[0] === '#992') continue;
      errors.push(`${file}:${text.slice(0, m.index).split('\n').length}: ${m[0]}`);
    }
  }
}
roots.forEach(scan);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `XDS color ownership verified across ${checked} product source files. Generated CSS is checked separately with theme:check. Raw renderer and vendor colors must be imported from XDS. Developer CallGraph demos, third-party assets and document output formats are outside this UI check.`,
  );
