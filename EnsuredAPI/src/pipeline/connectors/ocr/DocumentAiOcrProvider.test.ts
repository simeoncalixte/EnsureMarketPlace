import { DocumentAiOcrProvider } from './DocumentAiOcrProvider';

describe('DocumentAiOcrProvider (adapter)', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    (global as any).fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('is unavailable without OCR_API_URL and available with it', () => {
    expect(new DocumentAiOcrProvider({} as NodeJS.ProcessEnv).isAvailable()).toBe(false);
    expect(new DocumentAiOcrProvider({ OCR_API_URL: 'https://x' } as NodeJS.ProcessEnv).isAvailable()).toBe(true);
  });

  it('POSTs the document bytes (with auth) and returns the extracted text', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ text: 'hello world' }) });
    (global as any).fetch = fetchMock;

    const provider = new DocumentAiOcrProvider({ OCR_API_URL: 'https://ocr.example/api', OCR_API_KEY: 'secret' } as NodeJS.ProcessEnv);
    const result = await provider.recognize({ buffer: Buffer.from('bytes'), fileName: 'doc.pdf' });

    expect(result).toMatchObject({ text: 'hello world', provider: 'document-ai' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://ocr.example/api');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer secret');
  });

  it('throws on a non-ok API response', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({}) });
    const provider = new DocumentAiOcrProvider({ OCR_API_URL: 'https://ocr.example/api' } as NodeJS.ProcessEnv);
    await expect(provider.recognize({ buffer: Buffer.from('x') })).rejects.toThrow(/OCR API error 502/);
  });

  it('throws if recognize is called while unconfigured', async () => {
    const provider = new DocumentAiOcrProvider({} as NodeJS.ProcessEnv);
    await expect(provider.recognize({ buffer: Buffer.from('x') })).rejects.toThrow(/OCR_API_URL is not configured/);
  });
});
