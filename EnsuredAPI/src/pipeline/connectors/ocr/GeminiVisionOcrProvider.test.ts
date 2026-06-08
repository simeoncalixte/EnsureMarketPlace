import { GeminiVisionOcrProvider, isHighPrecisionOcr } from './GeminiVisionOcrProvider';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

jest.mock('@langchain/google-genai');

const MockChat = ChatGoogleGenerativeAI as unknown as jest.Mock;
const invoke = jest.fn();

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const env = (over: Record<string, string>) => over as unknown as NodeJS.ProcessEnv;

describe('isHighPrecisionOcr', () => {
  it('parses common truthy values, defaults off', () => {
    expect(isHighPrecisionOcr(env({}))).toBe(false);
    expect(isHighPrecisionOcr(env({ OCR_HIGH_PRECISION: 'false' }))).toBe(false);
    for (const v of ['1', 'true', 'yes', 'on', 'TRUE']) {
      expect(isHighPrecisionOcr(env({ OCR_HIGH_PRECISION: v }))).toBe(true);
    }
  });
});

describe('GeminiVisionOcrProvider', () => {
  beforeEach(() => {
    MockChat.mockReset();
    invoke.mockReset();
    MockChat.mockImplementation(() => ({ invoke }));
  });

  describe('isAvailable (opt-in gating)', () => {
    it('off without the flag, off without a key, on with both', () => {
      expect(new GeminiVisionOcrProvider(env({ GEMINI_API_KEY: 'k' })).isAvailable()).toBe(false);
      expect(new GeminiVisionOcrProvider(env({ OCR_HIGH_PRECISION: '1' })).isAvailable()).toBe(false);
      expect(new GeminiVisionOcrProvider(env({ OCR_HIGH_PRECISION: '1', GEMINI_API_KEY: 'k' })).isAvailable()).toBe(true);
    });
  });

  it('sends the image as multimodal content and returns the extracted text', async () => {
    invoke.mockResolvedValue({ content: 'ACME ENERGY LLC\nPOL-26-90001' });
    const provider = new GeminiVisionOcrProvider(env({ OCR_HIGH_PRECISION: '1', GEMINI_API_KEY: 'secret', GEMINI_MODEL: 'gemini-2.5-flash' }));

    const result = await provider.recognize({ buffer: PNG, fileName: 'scan.png' });

    expect(result.provider).toBe('gemini-vision');
    expect(result.text).toContain('POL-26-90001');
    expect(MockChat).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'secret', model: 'gemini-2.5-flash', temperature: 0 }));

    const [messages] = invoke.mock.calls[0];
    const content = messages[0].content as Array<{ type: string; image_url?: string }>;
    expect(content.some((p) => p.type === 'text')).toBe(true);
    const imagePart = content.find((p) => p.type === 'image_url');
    expect(imagePart?.image_url).toMatch(/^data:image\/png;base64,/);
  });

  it('rejects a non-image buffer', async () => {
    const provider = new GeminiVisionOcrProvider(env({ OCR_HIGH_PRECISION: '1', GEMINI_API_KEY: 'k' }));
    await expect(provider.recognize({ buffer: Buffer.from('not an image') })).rejects.toThrow(/not a recognized image/);
  });
});
