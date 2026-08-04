import { FastifyReply, FastifyRequest } from 'fastify';
import { OrganizationService } from '../../services/OrganizationService';

const service = new OrganizationService();

export async function seedOrganizationsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { extras = 2 } = request.query as { extras?: number };
  const organizations = await service.seed(extras);
  return reply.code(201).send({ count: organizations.length, organizations });
}
