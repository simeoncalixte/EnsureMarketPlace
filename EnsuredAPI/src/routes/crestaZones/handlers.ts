import { FastifyReply, FastifyRequest } from 'fastify';
import { QueryTypes } from 'sequelize';
import { CrestaZone } from '../../db/models';
import { getSequelize } from '../../db/config/database';
import { CrestaLevel } from '../../db/models/cresta.models';
import {
  getCrestaImportState,
  startCrestaImportInBackground,
  stopCrestaImport,
} from '../../db/cresta-import-runner';

const MAX_FEATURES = 20000;

/**
 * Serves real CRESTA zones as a GeoJSON FeatureCollection. Each zone renders as a rectangle Polygon
 * from its bounding box (`bbox`), falling back to a centroid Point if no bbox is present.
 *
 * `/cresta-zones` defaults to the `state_province` layer (~thousands of zones — safe to render at
 * once). Pass `?iso3=XXX` to get a single country's zones (incl. the much larger `city` layer), and
 * `?level=city|state_province` to filter.
 */
export async function listCrestaZonesHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = (request.query ?? {}) as { iso3?: string; level?: string; limit?: string };

  const where: Record<string, unknown> = {};
  if (query.iso3) where.countryIso3 = String(query.iso3).toUpperCase();
  if (query.level === 'city' || query.level === 'state_province') {
    where.level = query.level;
  } else if (!query.iso3) {
    // No country filter -> default to the coarse layer so we never ship ~242k city zones at once.
    where.level = 'state_province';
  }

  const limit = Math.min(Math.max(Number(query.limit) || MAX_FEATURES, 1), MAX_FEATURES);
  const zones = await CrestaZone.findAll({ where, order: [['crestaId', 'ASC']], limit });

  const features = zones.map((zone) => {
    const bbox = zone.bbox as { sw?: { lat: number; lng: number }; ne?: { lat: number; lng: number } } | null;
    let geometry: unknown = zone.geometry ?? null;
    if (!geometry && bbox?.sw && bbox?.ne) {
      const { sw, ne } = bbox;
      geometry = {
        type: 'Polygon',
        coordinates: [[[sw.lng, sw.lat], [ne.lng, sw.lat], [ne.lng, ne.lat], [sw.lng, ne.lat], [sw.lng, sw.lat]]],
      };
    }
    if (!geometry && zone.latitude != null && zone.longitude != null) {
      geometry = { type: 'Point', coordinates: [Number(zone.longitude), Number(zone.latitude)] };
    }
    return {
      type: 'Feature' as const,
      id: zone.crestaId,
      geometry,
      properties: {
        code: zone.crestaId,
        name: zone.name,
        countryName: zone.name, // kept for the existing popup/label field
        countryIso3: zone.countryIso3,
        level: zone.level,
        release: zone.release,
      },
    };
  });

  return reply.send({ type: 'FeatureCollection', features });
}

// Per-country import progress (status + counts), sourced from crestaImportProgress.
export async function crestaCatalogHandler(_request: FastifyRequest, reply: FastifyReply) {
  const sequelize = getSequelize();
  const rows = await sequelize.query<{
    countryIso3: string;
    level: string;
    status: string;
    imported: number;
    totalElements: number | null;
  }>(
    `SELECT "countryIso3", "level", "status", "imported", "totalElements"
     FROM "crestaImportProgress" ORDER BY "countryIso3", "level"`,
    { type: QueryTypes.SELECT },
  );

  const summary = await sequelize.query<{ status: string; count: string }>(
    `SELECT status, count(*)::text AS count FROM "crestaImportProgress" GROUP BY status`,
    { type: QueryTypes.SELECT },
  );

  return reply.send({
    release: 2019,
    byStatus: Object.fromEntries(summary.map((s) => [s.status, Number(s.count)])),
    import: getCrestaImportState(),
    targets: rows,
  });
}

// Start the resumable, throttled CRESTA import as a background job (admin seeding trigger).
// Returns immediately; poll /cresta-zones/catalog for progress + run state.
export async function startCrestaImportHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = (request.body ?? {}) as { only?: string | string[]; level?: string };
  const only = Array.isArray(body.only)
    ? body.only
    : typeof body.only === 'string' && body.only.trim()
      ? body.only.split(',')
      : null;
  const level = body.level === 'city' || body.level === 'state_province' ? (body.level as CrestaLevel) : null;

  const result = startCrestaImportInBackground({ only, level });
  if (!result.started) {
    return reply.code(409).send({ started: false, message: 'A CRESTA import is already running.', state: getCrestaImportState() });
  }
  return reply.send({
    started: true,
    message: `CRESTA import started${only ? ` for ${only.join(', ')}` : ''}${level ? ` (${level})` : ''}. Up to 3 countries in parallel, 1 request / 10s each; resumable.`,
    state: getCrestaImportState(),
  });
}

// Cooperatively stop a running import (it stops at the next page boundary; progress is saved).
export async function stopCrestaImportHandler(_request: FastifyRequest, reply: FastifyReply) {
  const stopped = stopCrestaImport();
  return reply.send({ stopped, message: stopped ? 'Stop requested; finishing current page.' : 'No import is running.' });
}
