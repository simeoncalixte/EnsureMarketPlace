import { FastifyReply, FastifyRequest } from 'fastify';
import { Organization } from '../../db/models/identity.models';
import { CapacityDefinitionSeedService } from '../../services/CapacityDefinitionSeedService';

const service = new CapacityDefinitionSeedService();

export async function seedCapacityDefinitionsHandler(request: FastifyRequest, reply: FastifyReply) {
  const { organizationId, archetype, overwrite = true } = (request.body ?? {}) as {
    organizationId?: number;
    archetype?: string;
    overwrite?: boolean;
  };

  const anyOrg = await Organization.findOne();
  if (!anyOrg) {
    return reply
      .code(422)
      .send({ error: 'No organizations found. Call POST /seed/organizations first.' });
  }

  try {
    const result = await service.seed({ organizationId, archetype, overwrite });
    const created = result.outcomes.filter((o) => o.action === 'created').length;
    const updated = result.outcomes.filter((o) => o.action === 'updated').length;
    const skipped = result.outcomes.filter((o) => o.action === 'skipped').length;
    return reply.code(201).send({
      count: result.count,
      message: `Applied ${result.count} capacity definition(s): ${created} created, ${updated} updated, ${skipped} skipped (one active per org).`,
      outcomes: result.outcomes,
    });
  } catch (err: any) {
    if (typeof err?.message === 'string' && err.message.startsWith('unknown_archetype:')) {
      return reply.code(400).send({ error: err.message });
    }
    throw err;
  }
}
