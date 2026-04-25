export class OcrService {
  async process(payload: any): Promise<Record<string, unknown>> {
    return { ok: true, service: 'ocr', received: payload };
  }
}
