import { FastifyPluginAsync } from 'fastify';
import { SubmissionPurgeService } from '../services/SubmissionPurgeService';

const service = new SubmissionPurgeService();

/**
 * Destructive admin reset: removes all submissions and the business data derived
 * from them (pipeline, underwriting, capital markets), keeping organizations,
 * users and their profiles. Guarded by an explicit `{ confirm: true }` so it
 * can't fire by accident.
 */
export const submissionPurgeRoute: FastifyPluginAsync = async (app) => {
  app.post(
    '/seed/purge-submissions',
    {
      schema: {
        description:
          'Remove ALL submissions and associated business data (ingestion/pipeline, underwriting, capital markets). Organizations, users and their profiles are kept. Requires { "confirm": true }.',
        body: {
          type: 'object',
          properties: {
            confirm: { type: 'boolean', description: 'Must be true to perform the purge.' },
          },
        },
        response: {
          200: { type: 'object', additionalProperties: true },
          400: { type: 'object', additionalProperties: true },
          500: { type: 'object', additionalProperties: true },
        },
      },
    },
    async (request, reply) => {
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
    },
  );
};

export default submissionPurgeRoute;
