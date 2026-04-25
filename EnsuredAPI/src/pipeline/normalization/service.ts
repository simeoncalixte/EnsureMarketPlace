export class NormalizationService {
  async process(payload: any): Promise<Record<string, unknown>> {
    return { ok: true, service: 'normalization', received: payload };
  }
}
