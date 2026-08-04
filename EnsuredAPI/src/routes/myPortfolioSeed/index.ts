import { FastifyPluginAsync } from 'fastify';
import { seedMyPortfolioSchema } from './schemas';
import { seedMyPortfolioHandler } from './handlers';

export const myPortfolioSeedRoute: FastifyPluginAsync = async (app) => {
  app.post('/seed/my-portfolio', { schema: seedMyPortfolioSchema }, seedMyPortfolioHandler);
};
