import * as fs from 'fs';
import * as path from 'path';
import { CallGraph } from './types';

const DATA_PLACEHOLDER = '/*__DATA__*/ null';

/**
 * Embeds the graph into the standalone viewer template. The result is a
 * self-contained HTML file with no external dependencies.
 */
export function renderViewer(graph: CallGraph): string {
  const templatePath = path.join(__dirname, 'viewer.html');
  const template = fs.readFileSync(templatePath, 'utf8');
  if (!template.includes(DATA_PLACEHOLDER)) {
    throw new Error(`Data placeholder missing from ${templatePath}`);
  }
  // < keeps "</script>" sequences inside string values from closing the script tag
  const payload = JSON.stringify(graph).replace(/</g, '\\u003c');
  return template.replace(DATA_PLACEHOLDER, payload);
}
