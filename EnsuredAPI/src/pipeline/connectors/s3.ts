import { Readable } from 'stream';

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function getS3Object(bucket: string, key: string): Promise<Buffer> {
  try {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({ region: process.env.AWS_REGION });
    const res: any = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = res.Body;
    if (!body) return Buffer.alloc(0);
    if (body instanceof Uint8Array) return Buffer.from(body);
    if (typeof body === 'string') return Buffer.from(body);
    return await streamToBuffer(body as Readable);
  } catch (err: any) {
    throw new Error(`S3 getObject failed: ${err?.message ?? String(err)}`);
  }
}

export async function putS3Object(bucket: string, key: string, body: Buffer | string): Promise<void> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({ region: process.env.AWS_REGION });
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }));
}
