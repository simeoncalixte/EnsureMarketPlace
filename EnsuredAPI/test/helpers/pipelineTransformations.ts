import fs from 'fs/promises';
import path from 'path';

type TransformationRecord = {
  process: string;
  stage: string;
  testName: string;
  description: string;
  before: unknown;
  after: unknown;
  recordedAt: string;
};

function serializeForReview(value: unknown, seen = new WeakSet<object>()): unknown {
  if (Buffer.isBuffer(value)) {
    return {
      kind: 'Buffer',
      byteLength: value.length,
      utf8Preview: value.toString('utf8', 0, Math.min(value.length, 1000)),
    };
  }

  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => serializeForReview(item, seen));
  if (!value || typeof value !== 'object') return value;

  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  const modelLike = value as { toJSON?: () => unknown };
  if (typeof modelLike.toJSON === 'function') {
    return serializeForReview(modelLike.toJSON(), seen);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')
        ? '[redacted]'
        : serializeForReview(entry, seen),
    ]),
  );
}

export function createPipelineTransformationReporter(processName: string) {
  const records: TransformationRecord[] = [];
  const outputPath = path.join(
    __dirname,
    '..',
    '..',
    'test-results',
    'pipeline-process-transformations',
    `${processName}.json`,
  );

  return {
    record(input: {
      stage: string;
      testName: string;
      description: string;
      before: unknown;
      after: unknown;
    }) {
      records.push({
        process: processName,
        stage: input.stage,
        testName: input.testName,
        description: input.description,
        before: serializeForReview(input.before),
        after: serializeForReview(input.after),
        recordedAt: new Date().toISOString(),
      });
    },

    async write() {
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(
        outputPath,
        `${JSON.stringify({
          process: processName,
          generatedAt: new Date().toISOString(),
          transformationCount: records.length,
          transformations: records,
        }, null, 2)}\n`,
        'utf8',
      );
    },

    outputPath,
  };
}
