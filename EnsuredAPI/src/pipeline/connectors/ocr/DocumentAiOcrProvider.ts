import { OcrInput, OcrProvider, OcrResult } from './OcrProvider';

/**
 * Adapter for a cloud Document-AI / OCR HTTP endpoint — the production default.
 *
 * It POSTs the raw document bytes to `OCR_API_URL` (optionally authenticated with
 * `OCR_API_KEY`) and reads the extracted text from the JSON response. This is
 * intentionally provider-agnostic: point `OCR_API_URL` at your Document-AI
 * integration (AWS Textract / Google Document AI / Azure AI Document Intelligence
 * behind an endpoint), or subclass/extend this adapter to call a vendor SDK
 * directly and populate `layout`.
 *
 * Available only when `OCR_API_URL` is configured, so it naturally takes priority
 * in production and is skipped in local/dev where the Tesseract fallback runs.
 */
export class DocumentAiOcrProvider implements OcrProvider {
  readonly name = 'document-ai';

  private readonly apiUrl?: string;

  private readonly apiKey?: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.apiUrl = env.OCR_API_URL;
    this.apiKey = env.OCR_API_KEY;
  }

  isAvailable(): boolean {
    return Boolean(this.apiUrl);
  }

  async recognize(input: OcrInput): Promise<OcrResult> {
    if (!this.apiUrl) {
      throw new Error('DocumentAiOcrProvider: OCR_API_URL is not configured');
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/octet-stream' };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    if (input.fileName) headers['X-Document-Filename'] = input.fileName;
    if (input.mimeType) headers['X-Document-Content-Type'] = input.mimeType;

    const res = await fetch(this.apiUrl, { method: 'POST', body: input.buffer as unknown as BodyInit, headers });
    if (!res.ok) {
      throw new Error(`DocumentAiOcrProvider: OCR API error ${res.status}`);
    }

    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      text: String(body.text ?? body.result ?? ''),
      provider: this.name,
      layout: (body.layout as Record<string, unknown> | undefined) ?? undefined,
    };
  }
}
