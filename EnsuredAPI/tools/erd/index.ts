/**
 * CLI entry point: introspects the Sequelize models and writes the ERD.
 *
 *   npm run graph:erd            # writes docs/erd/erd.{html,json}
 *   npm run graph:erd -- --out somewhere/else
 */
import * as fs from 'fs';
import * as path from 'path';
import { extractSchema } from './extract';
import { renderViewer } from './render';

interface CliOptions {
  outDir: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { outDir: path.join('docs', 'erd') };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') {
      const value = argv[++i];
      if (!value) throw new Error('Missing value for --out');
      options.outDir = value;
    } else if (arg === '--help' || arg === '-h') {
      process.stdout.write('Usage: graph:erd [--out <dir>]\n');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const projectRoot = path.resolve(__dirname, '..', '..');
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')) as {
    name?: string;
  };

  const started = Date.now();
  const schema = extractSchema(packageJson.name ?? path.basename(projectRoot));

  const outDir = path.resolve(projectRoot, options.outDir);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'erd.json'), JSON.stringify(schema, null, 2));
  fs.writeFileSync(path.join(outDir, 'erd.html'), renderViewer(schema));

  const { stats } = schema;
  process.stdout.write(
    [
      `Extracted schema in ${((Date.now() - started) / 1000).toFixed(1)}s`,
      `  tables:  ${stats.tables} across ${stats.domains} domains`,
      `  columns: ${stats.columns} (${stats.foreignKeys} foreign keys)`,
      `  edges:   ${stats.relationships} relationships`,
      `  output:  ${path.relative(projectRoot, outDir)}/erd.{html,json}`,
      '',
    ].join('\n'),
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`erd: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
