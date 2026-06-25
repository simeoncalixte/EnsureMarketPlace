import { FastifyPluginAsync } from 'fastify';
import { QueryTypes } from 'sequelize';
import { getSequelize } from '../config/database';
import {
  getWorldcitiesImportState,
  startWorldcitiesImportInBackground,
  stopWorldcitiesImport,
} from '../db/worldcities-import-runner';

/**
 * Worldcities seed API (admin trigger).
 *
 * Loads SimpleMaps' worldcities.csv (~1.94M rows) into `stateProvinces` + `cities`. The import is a
 * long-running, streaming, two-pass job, so the trigger is fire-and-forget: POST starts it in the
 * background and returns immediately; poll GET /seed/worldcities/status for run state + live row
 * counts. Idempotent — safe to re-run; existing states/cities are skipped.
 */
export const worldcitiesSeedRoute: FastifyPluginAsync = async (app) => {
  // Run state + current DB counts so the admin panel can show progress.
  app.get('/seed/worldcities/status', async (_request, reply) => {
    const sequelize = getSequelize();
    const counts = await sequelize.query<{ states: string; cities: string }>(
      `SELECT
         (SELECT count(*) FROM "stateProvinces")::text AS states,
         (SELECT count(*) FROM cities)::text AS cities`,
      { type: QueryTypes.SELECT },
    );
    return reply.send({
      import: getWorldcitiesImportState(),
      totals: { states: Number(counts[0]?.states ?? 0), cities: Number(counts[0]?.cities ?? 0) },
    });
  });

  // Start the streaming import as a background job. Returns immediately; poll the status endpoint.
  app.post('/seed/worldcities', async (request, reply) => {
    const body = (request.body ?? {}) as { file?: string };
    const file = typeof body.file === 'string' && body.file.trim() ? body.file.trim() : null;

    const result = startWorldcitiesImportInBackground({ file });
    if (!result.started) {
      return reply.code(409).send({
        started: false,
        message: 'A worldcities import is already running.',
        state: getWorldcitiesImportState(),
      });
    }
    return reply.send({
      started: true,
      message: 'Worldcities import started. Streaming ~1.94M rows into stateProvinces + cities; resumable and idempotent.',
      state: getWorldcitiesImportState(),
    });
  });

  // Cooperatively stop a running import (it stops at the next row/batch boundary; progress is kept).
  app.post('/seed/worldcities/stop', async (_request, reply) => {
    const stopped = stopWorldcitiesImport();
    return reply.send({
      stopped,
      message: stopped ? 'Stop requested; finishing the current batch.' : 'No worldcities import is running.',
    });
  });
};

export default worldcitiesSeedRoute;
