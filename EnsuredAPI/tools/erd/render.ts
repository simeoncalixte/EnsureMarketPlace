import * as fs from 'fs';
import * as path from 'path';
import { ErdSchema } from './types';

const DATA_PLACEHOLDER = '/*__DATA__*/ null';

/**
 * Embeds the schema into the standalone viewer template, producing a
 * self-contained HTML file with no external dependencies.
 */
export function renderViewer(schema: ErdSchema): string {
  const templatePath = path.join(__dirname, 'viewer.html');
  const template = fs.readFileSync(templatePath, 'utf8');
  if (!template.includes(DATA_PLACEHOLDER)) {
    throw new Error(`Data placeholder missing from ${templatePath}`);
  }
  // Escaping "<" keeps any "</script>" inside string values from closing the tag.
  const payload = JSON.stringify(schema).replace(/</g, '\\u003c');
  return template.replace(DATA_PLACEHOLDER, payload);
}
