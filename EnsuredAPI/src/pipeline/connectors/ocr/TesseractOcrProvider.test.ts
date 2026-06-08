import { TesseractOcrProvider } from './TesseractOcrProvider';

// tesseract.js is a real (but heavy) dependency. Mock it so this unit test
// verifies the adapter's worker lifecycle without downloading a language model.
const recognize = jest.fn();
const terminate = jest.fn();
const createWorker = jest.fn(async () => ({ recognize, terminate }));
jest.mock('tesseract.js', () => ({ createWorker: (...args: unknown[]) => createWorker(...args) }));

describe('TesseractOcrProvider (adapter)', () => {
  beforeEach(() => {
    recognize.mockReset();
    terminate.mockReset();
    createWorker.mockClear();
  });

  it('is always available as the local image OCR engine', () => {
    expect(new TesseractOcrProvider({} as NodeJS.ProcessEnv).isAvailable()).toBe(true);
  });

  it('creates a worker, recognizes the buffer, returns text, and terminates', async () => {
    recognize.mockResolvedValue({ data: { text: 'Named Insured: Acme LLC' } });
    const provider = new TesseractOcrProvider({ OCR_TESSERACT_LANG: 'eng' } as unknown as NodeJS.ProcessEnv);
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG-ish

    const result = await provider.recognize({ buffer });

    expect(createWorker).toHaveBeenCalledWith('eng');
    expect(recognize).toHaveBeenCalledWith(buffer);
    expect(result).toEqual({ text: 'Named Insured: Acme LLC', provider: 'tesseract' });
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it('terminates the worker even when recognition fails', async () => {
    recognize.mockRejectedValue(new Error('boom'));
    const provider = new TesseractOcrProvider({} as NodeJS.ProcessEnv);
    await expect(provider.recognize({ buffer: Buffer.from('x') })).rejects.toThrow('boom');
    expect(terminate).toHaveBeenCalledTimes(1);
  });
});
