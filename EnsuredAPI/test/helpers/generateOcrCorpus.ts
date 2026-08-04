/**
 * Writes the synthetic OCR document corpus to test/fixtures/ocr-corpus/ and a
 * manifest.json describing each document and the tokens its extracted text must
 * contain. Self-validates by running every document through the real OCR
 * connector and failing loudly if any expected token does not survive extraction.
 *
 *   npm run corpus:generate
 */
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { buildCorpus, CORPUS_PLAN } from './ocrCorpus';
import { runOcr } from '../../src/services/pipeline/connectors/ocr';

const OUT_DIR = path.join(__dirname, '..', 'fixtures', 'ocr-corpus');

async function main(): Promise<void> {
  delete process.env.OCR_API_URL; // force the local extraction path

  // Clean any previously generated docs (keep the directory).
  if (existsSync(OUT_DIR)) {
    for (const f of readdirSync(OUT_DIR)) rmSync(path.join(OUT_DIR, f));
  } else {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  const docs = await buildCorpus();
  const manifest: Array<Record<string, unknown>> = [];
  const failures: string[] = [];

  for (const doc of docs) {
    writeFileSync(path.join(OUT_DIR, doc.fileName), doc.bytes);

    // Self-validate: extract and confirm every mustContain token is present.
    let extracted = '';
    let provider = '';
    try {
      const res = await runOcr(doc.bytes, { fileName: doc.fileName });
      extracted = res.text;
      provider = res.provider ?? '';
    } catch (err) {
      failures.push(`${doc.fileName}: extraction threw — ${err instanceof Error ? err.message : String(err)}`);
    }
    for (const token of doc.mustContain) {
      if (!extracted.includes(token)) failures.push(`${doc.fileName}: missing token ${JSON.stringify(token)}`);
    }

    manifest.push({
      fileName: doc.fileName,
      format: doc.format,
      provider,
      byteLength: doc.bytes.length,
      mustContain: doc.mustContain,
      expect: doc.expect,
    });
  }

  writeFileSync(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const byFormat = CORPUS_PLAN.map((p) => `${p.format}=${p.count}`).join(', ');
  // eslint-disable-next-line no-console
  console.log(`Wrote ${docs.length} documents to ${OUT_DIR} (${byFormat})`);

  if (failures.length) {
    // eslint-disable-next-line no-console
    console.error(`\nSELF-VALIDATION FAILED (${failures.length}):`);
    // eslint-disable-next-line no-console
    failures.slice(0, 50).forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log('Self-validation passed: every expected token survived extraction.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('corpus generation crashed:', err);
  process.exit(1);
});
