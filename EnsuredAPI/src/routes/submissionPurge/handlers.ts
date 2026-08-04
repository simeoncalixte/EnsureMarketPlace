import { FastifyReply, FastifyRequest } from 'fastify';
import { SubmissionPurgeService } from '../../services/SubmissionPurgeService';

const service = new SubmissionPurgeService();

export async function purgeSubmissionsHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = (request.body ?? {}) as { confirm?: boolean };
  if (body.confirm !== true) {
    return reply.code(400).send({
      error: 'confirmation_required',
      message: 'Pass { "confirm": true } to remove all submissions and associated data.',
    });
  }

  try {
    const summary = await service.purgeAll();
    return reply.code(200).send({
      ...summary,
      message:
        `Removed ${summary.totalDeleted} record(s) across ${summary.tablesCleared} table(s). ` +
        `Kept ${summary.keptOrganizations} organization(s), ${summary.keptUsers} user(s) and ` +
        `${summary.keptInvestorProfiles} investor profile(s).`,
    });
  } catch (err: any) {
    request.log.error(err);
    return reply.code(500).send({ error: 'purge_failed', message: err?.message ?? String(err) });
  }
}
