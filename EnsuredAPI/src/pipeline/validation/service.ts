export class ValidationService {
  async process(payload: any): Promise<Record<string, unknown>> {
    return { ok: true, service: 'validation', received: payload };
  }
}
