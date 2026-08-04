import { FastifyReply, FastifyRequest } from 'fastify';
import { InvestorDealsService, InvestorNotFoundError } from '../../services/InvestorDealsService';

const service = new InvestorDealsService();

export async function defaultInvestorHandler(_request: FastifyRequest, reply: FastifyReply) {
  const investor = await service.getDefaultInvestor();
  if (!investor) {
    return reply.code(404).send({ error: 'no_investor_found' });
  }

  return reply.code(200).send(investor);
}

export async function dashboardHandler(request: FastifyRequest, reply: FastifyReply) {
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
}

export async function activeDealsHandler(request: FastifyRequest, reply: FastifyReply) {
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
}
