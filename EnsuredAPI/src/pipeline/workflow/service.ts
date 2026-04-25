export class WorkflowService {
  async process(payload: any): Promise<Record<string, unknown>> {
    return { ok: true, service: 'workflow', received: payload };
  }
}
