/**
 * CLI entry point: analyzes the API source and writes the call graph.
 *
 *   npm run graph:calls            # writes docs/call-graph/call-graph.{html,json}
 *   npm run graph:calls -- --out somewhere/else --src src
 */
import * as fs from 'fs';
import * as path from 'path';
import { analyzeProject } from './analyzer';
import { renderViewer } from './render';

interface CliOptions {
  srcDir: string;
  outDir: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { srcDir: 'src', outDir: path.join('docs', 'call-graph') };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--src') options.srcDir = requireValue(argv, ++i, '--src');
    else if (arg === '--out') options.outDir = requireValue(argv, ++i, '--out');
    else if (arg === '--help' || arg === '-h') {
      process.stdout.write('Usage: graph:calls [--src <dir>] [--out <dir>]\n');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value) throw new Error(`Missing value for ${flag}`);
  return value;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const projectRoot = path.resolve(__dirname, '..', '..');
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')) as { name?: string };

  const started = Date.now();
  const graph = analyzeProject({
    projectRoot,
    srcDir: options.srcDir,
    projectName: packageJson.name ?? path.basename(projectRoot),
  });

  const outDir = path.resolve(projectRoot, options.outDir);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'call-graph.json'), JSON.stringify(graph, null, 2));
  fs.writeFileSync(path.join(outDir, 'call-graph.html'), renderViewer(graph));

  const { stats } = graph;
  process.stdout.write(
    [
      `Analyzed ${stats.modules} modules in ${((Date.now() - started) / 1000).toFixed(1)}s`,
      `  symbols: ${stats.functions} functions, ${stats.methods} methods, ${stats.entities} models, ${stats.routes} routes`,
      `  edges:   ${stats.callEdges} calls, ${stats.usesEdges} model usages`,
      `  output:  ${path.relative(projectRoot, outDir)}/call-graph.{html,json}`,
      '',
    ].join('\n'),
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`call-graph: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
