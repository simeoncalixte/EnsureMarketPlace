import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {currentPolicy,rendererCapabilities} = require('../EnsuredConstants/dist/componentPolicy.js');
const sources = {
 manual:readFileSync(new URL('../EnsuredUI/src/Pages/InsurerDashboard/sections/ManualFieldControl.tsx',import.meta.url),'utf8'),
 results:readFileSync(new URL('../EnsuredUI/src/Pages/Underwriting/SubmissionResultControl.tsx',import.meta.url),'utf8'),
 legacy:readFileSync(new URL('../EnsuredXDS/schema/form-catalog-components.json',import.meta.url),'utf8'),
};
for (const [surface,ids] of Object.entries(rendererCapabilities)) for (const id of ids) {
 if (!currentPolicy.components.some(c=>c.id===id&&c.version===1)) throw new Error(`Unknown ${surface} capability ${id}`);
 if (!sources[surface].includes(id)) throw new Error(`Missing ${surface} adapter for ${id}`);
}
console.log('Component policy and explicit adapter inventories agree.');
