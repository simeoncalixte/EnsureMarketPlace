import { FastifyPluginAsync } from 'fastify';
import { InvestorDealsService, InvestorNotFoundError } from '../services/InvestorDealsService';

const service = new InvestorDealsService();

export const investorsRoute: FastifyPluginAsync = async (app) => {
  app.get(
    '/investors/default',
    {
      schema: {
        tags: ['Investors'],
        summary: 'Get a default active investor',
        response: {
          200: {
            type: 'object',
            properties: {
              investorUserId: { type: 'integer' },
              investorProfileId: { type: 'integer' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              email: { type: 'string' },
            },
            required: ['investorUserId', 'investorProfileId', 'firstName', 'lastName', 'email'],
          },
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
            required: ['error'],
          },
        },
      },
    },
    async (_request, reply) => {
      const investor = await service.getDefaultInvestor();
      if (!investor) {
        return reply.code(404).send({ error: 'no_investor_found' });
      }

      return reply.code(200).send(investor);
    },
  );

  app.get(
    '/investors/:investorUserId/dashboard',
    {
      schema: {
        tags: ['Investors'],
        summary: 'Load investor dashboard data',
        params: {
          type: 'object',
          properties: {
            investorUserId: { type: 'integer', minimum: 1 },
          },
          required: ['investorUserId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              summary: {
                type: 'object',
                properties: {
                  totalInvested: { type: 'number' },
                  totalAvailable: { type: 'number' },
                  activePositions: { type: 'integer' },
                  availableDeals: { type: 'integer' },
                  blendedIrr: { type: 'number' },
                  projectedAnnualReturn: { type: 'number' },
                  capitalAtRisk: { type: 'number' },
                  liveTranches: { type: 'integer' },
                },
                required: [
                  'totalInvested',
                  'totalAvailable',
                  'activePositions',
                  'availableDeals',
                  'blendedIrr',
                  'projectedAnnualReturn',
                  'capitalAtRisk',
                  'liveTranches',
                ],
              },
              deals: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    investorUserId: { type: 'integer' },
                    investorProfileId: { type: 'integer' },
                    dealId: { type: 'integer' },
                    dealName: { type: 'string' },
                    dealStatus: { type: 'string' },
                    trancheId: { type: 'integer' },
                    trancheName: { type: 'string' },
                    riskLevel: { type: 'string' },
                    expectedReturnPct: { type: 'number' },
                    capitalRequired: { type: 'number' },
                    fundedAmount: { type: 'number' },
                    pendingAmount: { type: 'number' },
                    investorCommittedAmount: { type: 'number' },
                    investorAllocationPct: { type: 'number' },
                    status: { type: 'string', enum: ['active', 'available'] },
                  },
                  required: [
                    'id',
                    'investorUserId',
                    'investorProfileId',
                    'dealId',
                    'dealName',
                    'dealStatus',
                    'trancheId',
                    'trancheName',
                    'riskLevel',
                    'expectedReturnPct',
                    'capitalRequired',
                    'fundedAmount',
                    'pendingAmount',
                    'investorCommittedAmount',
                    'investorAllocationPct',
                    'status',
                  ],
                },
              },
            },
            required: ['summary', 'deals'],
          },
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
            required: ['error'],
          },
        },
      },
    },
    async (request, reply) => {
      const { investorUserId } = request.params as { investorUserId: number };

      try {
        const dashboard = await service.getDashboardForInvestor(investorUserId);
        return reply.code(200).send(dashboard);
      } catch (error) {
        if (error instanceof InvestorNotFoundError) {
          return reply.code(404).send({ error: 'investor_not_found' });
        }

        throw error;
      }
    },
  );

  app.get(
    '/investors/:investorUserId/deals/active',
    {
      schema: {
        tags: ['Investors'],
        summary: 'List active deals applicable to an investor',
        params: {
          type: 'object',
          properties: {
            investorUserId: { type: 'integer', minimum: 1 },
          },
          required: ['investorUserId'],
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                investorUserId: { type: 'integer' },
                investorProfileId: { type: 'integer' },
                dealId: { type: 'integer' },
                dealName: { type: 'string' },
                dealStatus: { type: 'string' },
                trancheId: { type: 'integer' },
                trancheName: { type: 'string' },
                riskLevel: { type: 'string' },
                expectedReturnPct: { type: 'number' },
                capitalRequired: { type: 'number' },
                fundedAmount: { type: 'number' },
                pendingAmount: { type: 'number' },
                investorCommittedAmount: { type: 'number' },
                investorAllocationPct: { type: 'number' },
                status: { type: 'string', enum: ['active', 'available'] },
              },
              required: [
                'id',
                'investorUserId',
                'investorProfileId',
                'dealId',
                'dealName',
                'dealStatus',
                'trancheId',
                'trancheName',
                'riskLevel',
                'expectedReturnPct',
                'capitalRequired',
                'fundedAmount',
                'pendingAmount',
                'investorCommittedAmount',
                'investorAllocationPct',
                'status',
              ],
            },
          },
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
            required: ['error'],
          },
        },
      },
    },
    async (request, reply) => {
      const { investorUserId } = request.params as { investorUserId: number };

      try {
        const deals = await service.listActiveDealsForInvestor(investorUserId);
        return reply.code(200).send(deals);
      } catch (error) {
        if (error instanceof InvestorNotFoundError) {
          return reply.code(404).send({ error: 'investor_not_found' });
        }

        throw error;
      }
    },
  );
};
