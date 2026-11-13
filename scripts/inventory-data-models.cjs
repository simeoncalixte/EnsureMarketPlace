// Offline inventory of declared Sequelize contracts. Never connects to a database.
const fs = require('node:fs'),
  path = require('node:path');
const root = path.resolve(__dirname, '..');
const { createRequire } = require('node:module');
const appRequire = createRequire(path.join(root, 'EnsuredAPI/package.json'));
const { Sequelize } = appRequire('sequelize');
const { initModels } = appRequire('@simeoncalixte/ensured-pipeline-shared/db/models');
const db = new Sequelize('inventory', 'inventory', 'unused', {
  dialect: 'postgres',
  logging: false,
});
initModels(db);
const entities = Object.values(db.models)
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((model) => ({
    model: model.name,
    table: model.getTableName(),
    fields: Object.entries(model.getAttributes()).map(([name, a]) => ({
      name,
      column: a.field || name,
      type: a.type.toString(),
      nullable: a.allowNull !== false && !a.primaryKey,
      primaryKey: !!a.primaryKey,
      unique: a.unique || false,
      reference: a.references ? { table: a.references.model, key: a.references.key } : null,
      allowedValues: a.validate?.isIn?.[0] || null,
      default: a.defaultValue === undefined ? null : String(a.defaultValue),
    })),
    associations: Object.values(model.associations).map((a) => ({
      kind: a.associationType,
      target: a.target.name,
      foreignKey: a.foreignKey,
      as: a.as,
    })),
    indexes: model.options.indexes,
  }));
const out = path.join(root, 'docs/data-models');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, 'sequelize-contracts.json'),
  JSON.stringify(
    {
      scope:
        'Declared Sequelize models, not deployed schema; raw-SQL/service-owned stores require separate inventory.',
      entities,
    },
    null,
    2,
  ) + '\n',
);
const esc = (x) =>
  String(x ?? '—')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ');
let md =
  '# Declared model field dictionary\n\nGenerated with `node scripts/inventory-data-models.cjs`. No database connection is made. These are model declarations, not evidence of deployed constraints. See `README.md` for ownership, tenant, source, unit, null and retention rules; unresolved semantics are explicitly tracked there.\n';
for (const e of entities) {
  md += `\n## ${e.model} (${esc(e.table)})\n\n| Field / column | Type | Nullable | Key / reference | Allowed values |\n| --- | --- | --- | --- | --- |\n`;
  for (const f of e.fields)
    md += `| ${esc(f.name)} / ${esc(f.column)} | ${esc(f.type)} | ${f.nullable} | ${esc(f.primaryKey ? 'PK' : f.reference ? JSON.stringify(f.reference) : f.unique ? 'UNIQUE' : '—')} | ${esc(f.allowedValues?.join(', '))} |\n`;
}
fs.writeFileSync(path.join(out, 'field-dictionary.md'), md);
console.log(
  `Inventoried ${entities.length} entities and ${entities.reduce((n, e) => n + e.fields.length, 0)} fields; no database accessed.`,
);
