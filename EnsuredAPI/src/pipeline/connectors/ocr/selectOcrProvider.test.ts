import { selectOcrProvider, defaultOcrProviders } from './selectOcrProvider';
import { OcrProvider } from './OcrProvider';

function fakeProvider(name: string, available: boolean): OcrProvider {
  return { name, isAvailable: () => available, recognize: async () => ({ text: '', provider: name }) };
}

describe('selectOcrProvider (strategy)', () => {
  it('prefers the Document-AI provider when OCR_API_URL is configured', () => {
    const providers = defaultOcrProviders({ OCR_API_URL: 'https://ocr.example/api' } as NodeJS.ProcessEnv);
    expect(selectOcrProvider(providers).name).toBe('document-ai');
  });

  it('falls back to the local-document dispatcher when no Document-AI URL is configured', () => {
    const providers = defaultOcrProviders({} as NodeJS.ProcessEnv);
    expect(selectOcrProvider(providers).name).toBe('local-document');
  });

  it('picks the first available provider in priority order', () => {
    const selected = selectOcrProvider([fakeProvider('a', false), fakeProvider('b', true), fakeProvider('c', true)]);
    expect(selected.name).toBe('b');
  });

  it('throws when no provider is available', () => {
    expect(() => selectOcrProvider([fakeProvider('a', false)])).toThrow(/No OCR provider is available/);
  });
});
