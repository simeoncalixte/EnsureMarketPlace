import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { Readable } from 'node:stream';
import amqplib from 'amqplib';
import Busboy from 'busboy';

const DEFAULT_PORT = Number(process.env.SUBMISSION_RELAY_PORT ?? '30026');
const DEFAULT_QUEUE = process.env.SUBMISSION_RELAY_QUEUE ?? 'ingest_submissions';
const RABBIT_URL = process.env.RABBIT_URL ?? process.env.AMQP_URL ?? 'amqp://localhost';
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Submission-Queue');
}

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body, null, 2));
}

function readRequestBody(request) {
  return new Promise((resolveRequest, rejectRequest) => {
    const chunks = [];
    let totalBytes = 0;

    request.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_UPLOAD_BYTES) {
        rejectRequest(new Error(`Request body exceeds the ${MAX_UPLOAD_BYTES / 1024 / 1024} MB limit.`));
        request.destroy();
        return;
      }

      chunks.push(Buffer.from(chunk));
    });

    request.on('end', () => {
      resolveRequest(Buffer.concat(chunks).toString('utf8'));
    });

    request.on('error', rejectRequest);
  });
}

function parseMultipart(request) {
  return new Promise((resolveRequest, rejectRequest) => {
    const fields = {};
    const files = [];
    let finished = false;

    const done = (error, value) => {
      if (finished) {
        return;
      }

      finished = true;
      if (error) {
        rejectRequest(error);
        return;
      }

      resolveRequest(value);
    };

    const busboy = Busboy({
      headers: request.headers,
      limits: {
        fileSize: MAX_UPLOAD_BYTES,
        files: 100,
        fields: 100,
      },
    });

    busboy.on('field', (name, value) => {
      fields[name] = value;
    });

    busboy.on('file', (fieldName, file, info) => {
      const { filename, mimeType } = info;
      const chunks = [];
      let size = 0;

      file.on('data', (chunk) => {
        size += chunk.length;
        chunks.push(Buffer.from(chunk));
      });

      file.on('limit', () => {
        done(new Error(`Attachment ${filename} exceeds the ${MAX_UPLOAD_BYTES / 1024 / 1024} MB limit.`));
      });

      file.on('end', () => {
        files.push({
          fieldName,
          filename,
          mimeType,
          size,
          buffer: Buffer.concat(chunks),
        });
      });
    });

    busboy.on('error', (error) => done(error));
    busboy.on('finish', () => done(null, { fields, files }));

    request.pipe(busboy);
  });
}

function normalizeBody(body) {
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
    return body;
  }

  if (typeof body === 'string' && body.trim()) {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  return null;
}

function buildPayload(envelope, files) {
  const attachmentMetadata = Array.isArray(envelope.attachments) ? envelope.attachments : [];

  return {
    transport: envelope.transport ?? 'submission-ui',
    queue: envelope.queue ?? DEFAULT_QUEUE,
    sourceMethod: envelope.sourceMethod ?? envelope.method ?? 'POST',
    sourcePath: envelope.sourcePath ?? envelope.path ?? '/api/submissions',
    templateId: envelope.templateId ?? 'unknown',
    payload: normalizeBody(envelope.payload),
    attachments: files.map((file, index) => {
      const metadata = attachmentMetadata[index] ?? {};

      return {
        path: metadata.path ?? file.filename,
        size: metadata.size ?? file.size,
        type: metadata.type ?? file.mimeType,
        modifiedAt: metadata.modifiedAt ?? null,
        contentBase64: file.buffer.toString('base64'),
      };
    }),
  };
}

async function publishToQueue(queue, payload) {
  const connection = await amqplib.connect(RABBIT_URL);

  try {
    const channel = await connection.createChannel();

    try {
      await channel.assertQueue(queue, { durable: true });
      const messageId = randomUUID();
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload, null, 2)), {
        contentType: 'application/json',
        contentEncoding: 'utf-8',
        persistent: true,
        messageId,
      });

      return messageId;
    } finally {
      await channel.close().catch(() => {});
    }
  } finally {
    await connection.close().catch(() => {});
  }
}

const server = createServer(async (request, response) => {
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    response.end();
    return;
  }

  const url = new URL(request.url ?? '/', 'http://localhost');

  if (url.pathname === '/health') {
    sendJson(response, 200, {
      ok: true,
      queue: DEFAULT_QUEUE,
      rabbitUrl: RABBIT_URL,
    });
    return;
  }

  if (url.pathname !== '/publish') {
    sendJson(response, 404, { ok: false, error: 'Not found' });
    return;
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'Use POST to publish a submission bundle.' });
    return;
  }

  try {
    const contentType = request.headers['content-type'] ?? '';
    let fields = {};
    let files = [];

    if (contentType.includes('multipart/form-data')) {
      ({ fields, files } = await parseMultipart(request));
    } else {
      const rawBody = await readRequestBody(request);
      const parsedBody = rawBody.trim() ? JSON.parse(rawBody) : {};
      fields = parsedBody;
      files = Array.isArray(parsedBody.files)
        ? parsedBody.files.map((file) => ({
            fieldName: 'files',
            filename: file.path ?? file.filename ?? 'upload.bin',
            mimeType: file.type ?? 'application/octet-stream',
            size: file.size ?? 0,
            buffer: Buffer.from(file.contentBase64 ?? '', 'base64'),
          }))
        : [];
    }

    const queue = String(fields.queue ?? DEFAULT_QUEUE).trim() || DEFAULT_QUEUE;
    const payload = buildPayload(fields, files);
    const messageId = await publishToQueue(queue, {
      ...payload,
      publishedAt: new Date().toISOString(),
    });

    sendJson(response, 200, {
      ok: true,
      queue,
      messageId,
      attachmentCount: payload.attachments.length,
      bytesPublished: Buffer.byteLength(JSON.stringify(payload, null, 2), 'utf8'),
    });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to publish submission bundle.',
    });
  }
});

server.listen(DEFAULT_PORT, '0.0.0.0', () => {
  console.log(`Submission relay listening on http://localhost:${DEFAULT_PORT}`);
  console.log(`Publishing to RabbitMQ at ${RABBIT_URL} using queue ${DEFAULT_QUEUE}`);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});