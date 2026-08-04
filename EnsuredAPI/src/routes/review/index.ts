import { readFile } from 'fs/promises';
import path from 'path';
import { FastifyPluginAsync } from 'fastify';

const REVIEW_DOCS = {
  'call-graph': {
    label: 'Call Graph',
    filePath: path.resolve(__dirname, '../../../docs/call-graph/call-graph.html'),
  },
  erd: {
    label: 'ERD',
    filePath: path.resolve(__dirname, '../../../docs/erd/erd.html'),
  },
} as const;

type ReviewDocKey = keyof typeof REVIEW_DOCS;

function renderReviewIndex(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Ensured Review Artifacts</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      background: #f6f8fa;
      color: #0f172a;
      font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: grid;
      place-items: center;
    }
    main {
      width: min(720px, calc(100vw - 48px));
      border: 1px solid #e3e8ef;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
      padding: 28px;
    }
    h1 { margin: 0 0 8px; font-size: 22px; }
    p { margin: 0 0 22px; color: #64748b; }
    nav { display: grid; gap: 12px; }
    a {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 16px;
      border: 1px solid #e3e8ef;
      border-radius: 8px;
      color: #0f172a;
      text-decoration: none;
      font-weight: 700;
    }
    a:hover { border-color: #2563eb; background: #f8fbff; }
    span { color: #64748b; font-weight: 500; }
  </style>
</head>
<body>
  <main>
    <h1>Ensured Review Artifacts</h1>
    <p>Generated architecture views served from the API docs output.</p>
    <nav>
      <a href="/api/review/call-graph">Call Graph <span>routes, functions, models</span></a>
      <a href="/api/review/erd">ERD <span>tables, fields, relationships</span></a>
    </nav>
  </main>
</body>
</html>`;
}

async function readReviewDoc(docKey: ReviewDocKey): Promise<string> {
  return readFile(REVIEW_DOCS[docKey].filePath, 'utf8');
}

export const reviewRoute: FastifyPluginAsync = async (app) => {
  app.get('/review', async (_request, reply) => {
    return reply.type('text/html; charset=utf-8').send(renderReviewIndex());
  });

  app.get<{ Params: { docKey: string } }>('/review/:docKey', async (request, reply) => {
    const docKey = request.params.docKey as ReviewDocKey;
    if (!(docKey in REVIEW_DOCS)) {
      return reply.code(404).send({ error: 'review_artifact_not_found' });
    }

    try {
      const html = await readReviewDoc(docKey);
      return reply.type('text/html; charset=utf-8').send(html);
    } catch (error) {
      request.log.error({ err: error, docKey }, 'failed to read review artifact');
      return reply.code(404).send({ error: 'review_artifact_not_generated' });
    }
  });
};
