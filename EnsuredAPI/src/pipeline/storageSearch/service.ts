export class StorageSearchService {
  async process(payload: any): Promise<Record<string, unknown>> {
    return { ok: true, service: 'storageSearch', received: payload };
  }
}
