import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const root = new URL('../', import.meta.url);
const require = createRequire(new URL('EnsuredUI/package.json', root));
const source = readFileSync(require.resolve('@ensured/xds/colors.css'), 'utf8');
const targets = ['EnsuredAuth/public/xds-colors.generated.css','EnsuredServices/public/xds-colors.generated.css','SubmissionUI/src/xds-colors.generated.css','EnsuredLogistics/app/xds-colors.generated.css'];
for (const file of targets) {
 const path = new URL(file, root);
 if (process.argv.includes('--check')) {
   if (readFileSync(path,'utf8') !== source) throw new Error(`${file} differs from XDS; run node scripts/sync-xds-theme-assets.mjs`);
 } else writeFileSync(path, source);
}
console.log(`XDS theme assets ${process.argv.includes('--check')?'verified':'synced'}: ${targets.length}`);
