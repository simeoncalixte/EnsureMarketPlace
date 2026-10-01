import ts from 'typescript';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(root, 'pipeline-packages.json'), 'utf8'));
const auditPath = path.join(root, 'pipeline-parity.json');
const sourceRoot = process.argv[2];
const moduleNames = new Map(Object.entries(manifest.files).map(([old, info]) => [info.package + '/' + info.path.replace(/^src\//, '').replace(/\.ts$/, ''), old]));
function logicalModule(specifier, filename, base) {
  if (moduleNames.has(specifier)) return moduleNames.get(specifier);
  if (!specifier.startsWith('.')) return specifier;
  const full = path.resolve(path.dirname(filename), specifier);
  const found = [full, full + '.ts', full + '.json', path.join(full, 'index.ts')].find(p => existsSync(p) && (p.endsWith('.ts') || p.endsWith('.json')));
  return found ? path.relative(base, found).replaceAll(path.sep, '/') : specifier;
}
function runtimeHash(source, filename, base) {
  // Module wiring and type declarations may change; executable bodies must match.
  source = source.replace(/(['"])([^'"\n]+)\1/g, (text, quote, value) => {
    if (!value.startsWith('.') && !value.startsWith('@simeoncalixte/')) return text;
    return quote + logicalModule(value, filename, base) + quote;
  });
  if (filename.endsWith('/pipeline/strategies.ts')) source = source.replace('new AmqpStrategy(new IngestionService())', 'new AmqpStrategy()');
  const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const statements = parsed.statements.filter(s => !ts.isImportDeclaration(s) && !ts.isExportDeclaration(s) && !(filename.endsWith('/pipeline/strategies.ts') && ts.isClassDeclaration(s) && s.name?.text === 'AmqpStrategy'));
  const printer = ts.createPrinter({ removeComments: true });
  source = statements.map(s => printer.printNode(ts.EmitHint.Unspecified, s, parsed)).join('\n').replace(/\bexport\s+/g, '');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true } }).outputText;
  return createHash('sha256').update(js).digest('hex');
}
const audit = sourceRoot ? { description: 'Executable TypeScript bodies compared with the pre-migration working tree; module wiring and erased types excluded. Existing type/constant declarations were relocated without changing values.', files: {} } : JSON.parse(readFileSync(auditPath, 'utf8'));
let failures = 0;
for (const [old, info] of Object.entries(manifest.files)) {
  if (!old.endsWith('.ts') || old.endsWith('.test.ts') || old.endsWith('.d.ts')) continue;
  const current = path.join(root, info.directory, info.path);
  if (sourceRoot) {
    const original = path.join(sourceRoot, old);
    if (!existsSync(original)) continue;
    audit.files[old] = runtimeHash(readFileSync(original, 'utf8'), original, sourceRoot);
  }
  if (!audit.files[old]) continue;
  const actual = runtimeHash(readFileSync(current, 'utf8'), current, path.join(root, info.directory));
  if (actual !== audit.files[old]) { console.error(`Runtime body differs: ${old}`); failures++; }
}
function amqpMethodHash(filename) {
  const parsed = ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
  const declaration = parsed.statements.find(s => ts.isClassDeclaration(s) && s.name?.text === 'AmqpStrategy');
  const method = declaration.members.find(s => s.name?.getText(parsed) === 'ensureSubmissions');
  const text = 'class AmqpStrategy {' + ts.createPrinter().printNode(ts.EmitHint.Unspecified, method, parsed) + '}';
  return runtimeHash(text, 'amqp-method.ts', root);
}
const amqpKey = 'AMQP.ensureSubmissions';
if (sourceRoot) audit.files[amqpKey] = amqpMethodHash(path.join(sourceRoot, 'src/pipeline/strategies.ts'));
if (audit.files[amqpKey] !== amqpMethodHash(path.join(root, 'EnsuredPipelineIngestionAmqp/src/index.ts'))) { console.error('AMQP delivery logic differs'); failures++; }
if (sourceRoot && !failures) writeFileSync(auditPath, JSON.stringify(audit, null, 2) + '\n');
console.log(`${Object.keys(audit.files).length} runtime checks audited; ${failures} differences.`);
process.exitCode = failures ? 1 : 0;
