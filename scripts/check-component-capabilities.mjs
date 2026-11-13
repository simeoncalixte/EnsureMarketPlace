import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';
const require = createRequire(new URL('../EnsuredUI/package.json', import.meta.url));
const { currentPolicy, rendererCapabilities } = require('@ensured/constants/componentPolicy');
const registry = require('@ensured/xds/schema/component-registry.json');
const expected = {
  version: registry.policyVersion,
  components: registry.components
    .filter((c) => c.fieldTypes.length || c.binding === 'coverages')
    .map(({ id, version, fieldTypes, description, binding }) => ({
      id,
      version,
      fieldTypes,
      description,
      ...(binding ? { semantic: binding } : {}),
    })),
  defaults: registry.defaults,
};
if (!isDeepStrictEqual(currentPolicy, expected))
  throw new Error('Published Constants policy differs from published XDS registry');
const sources = {
  manual: readFileSync(
    new URL(
      '../EnsuredUI/src/Pages/InsurerDashboard/sections/ManualFieldControl.tsx',
      import.meta.url,
    ),
    'utf8',
  ),
  results: readFileSync(
    new URL('../EnsuredUI/src/Pages/Underwriting/SubmissionResultControl.tsx', import.meta.url),
    'utf8',
  ),
};
const catalogPaths = [
  '../EnsuredUI/src/schema/xds-components.json',
  '../EnsuredAPI/src/formCatalog/xds-components.json',
];
const projected = {
  ...registry,
  components: registry.components.filter(
    (c) => rendererCapabilities.legacy.includes(c.id) || c.id === 'xds.requested-coverage',
  ),
};
if (process.argv.includes('--write'))
  for (const file of catalogPaths)
    writeFileSync(new URL(file, import.meta.url), JSON.stringify(projected, null, 2) + '\n');
const catalogs = catalogPaths.map((file) =>
  JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8')),
);
for (const catalog of catalogs)
  if (!isDeepStrictEqual(catalog, projected))
    throw new Error(
      'Application catalog differs from published XDS registry and legacy capabilities',
    );
for (const [surface, ids] of Object.entries(rendererCapabilities))
  for (const id of ids) {
    if (!currentPolicy.components.some((c) => c.id === id && c.version === 1))
      throw new Error(`Unknown ${surface} capability ${id}`);
    if (surface !== 'legacy' && !sources[surface].includes(id))
      throw new Error(`Missing ${surface} adapter for ${id}`);
  }
console.log('Published component policy, registry and application adapter inventories agree.');
