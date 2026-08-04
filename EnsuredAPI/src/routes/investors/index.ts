import { FastifyPluginAsync } from 'fastify';
import { activeDealsHandler, dashboardHandler, defaultInvestorHandler } from './handlers';
import { activeDealsSchema, dashboardSchema, defaultInvestorSchema } from './schemas';

export const investorsRoute: FastifyPluginAsync = async (app) => {
  app.get('/investors/default', { schema: defaultInvestorSchema }, defaultInvestorHandler);

  app.get('/investors/:investorUserId/dashboard', { schema: dashboardSchema }, dashboardHandler);

  app.get('/investors/:investorUserId/deals/active', { schema: activeDealsSchema }, activeDealsHandler);
};
