export class ExtractionService {
  async process(payload: any): Promise<Record<string, unknown>> {
    return { ok: true, service: 'extraction', received: payload };
  }
}
