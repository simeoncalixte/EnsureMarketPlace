import { FastifyReply, FastifyRequest } from 'fastify';
import { ReinsuranceSeedOptions, ReinsuranceSeedService } from '../../services/ReinsuranceSeedService';

const service = new ReinsuranceSeedService();

export async function seedReinsuranceHandler(request: FastifyRequest, reply: FastifyReply) {
  const options = (request.body ?? {}) as ReinsuranceSeedOptions;
  const summary = await service.seedAll(options);
  return reply.code(201).send(summary);
}
