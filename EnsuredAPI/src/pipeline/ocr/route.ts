import { FastifyPluginAsync } from 'fastify';
import { OcrService } from './service';

export const ocrRoute: FastifyPluginAsync = async (app) => {
  app.get('/pipeline/ocr/health', async () => ({ status: 'ok', service: 'ocr' }));

  app.post('/pipeline/ocr/process', { schema: { description: 'Run OCR and layout extraction', body: { type: 'object' }, response: { 200: { type: 'object', additionalProperties: true } } } }, async (request) => {
    const svc = new OcrService();
    return svc.process(request.body);
  });
};
