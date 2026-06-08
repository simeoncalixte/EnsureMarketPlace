import { OcrProvider } from './OcrProvider';
import { DocumentAiOcrProvider } from './DocumentAiOcrProvider';
import { LocalDocumentOcrProvider } from './LocalDocumentOcrProvider';

/**
 * Default provider priority order (the **strategy**): a configured Document-AI
 * provider wins (production), otherwise fall back to the local content-aware
 * dispatcher (dev/offline), which routes by format — PDF/DOCX/text extractors and
 * image OCR (Gemini vision when high-precision is enabled, else Tesseract).
 * Higher priority first.
 */
export function defaultOcrProviders(env: NodeJS.ProcessEnv = process.env): OcrProvider[] {
  return [new DocumentAiOcrProvider(env), new LocalDocumentOcrProvider(env)];
}

/**
 * Pick the first available provider from the priority list. Throws if none can run.
 * Pass a custom list (e.g. in tests) to override the default strategy.
 */
export function selectOcrProvider(providers: OcrProvider[] = defaultOcrProviders()): OcrProvider {
  const provider = providers.find((candidate) => candidate.isAvailable());
  if (!provider) {
    throw new Error('No OCR provider is available');
  }
  return provider;
}
