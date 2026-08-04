import { FastifyReply, FastifyRequest } from 'fastify';
import { getActiveEvents, type PerilCode } from '../../services/ActiveEventsService';
import { getFaultLines } from '../../services/FaultLinesService';
import { perilCodes } from '../../db/models/constants';

/**
 * `/risk-layers/active-events` aggregates live catastrophe feeds (USGS earthquakes, NOAA NHC
 * cyclones) into a single GeoJSON FeatureCollection. Each feature carries a normalised `severity`
 * (0–100) and categorical `severityLevel` so the map can colour events consistently across perils.
 */
export async function activeEventsHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = (request.query ?? {}) as { perils?: string; minMag?: string; fresh?: string };

  const perils = query.perils
    ? (query.perils
        .split(',')
        .map((p) => p.trim().toLowerCase())
        .filter((p) => (perilCodes as readonly string[]).includes(p)) as PerilCode[])
    : undefined;

  const minMag = query.minMag != null && query.minMag !== '' ? Number(query.minMag) : undefined;
  const fresh = query.fresh === 'true' || query.fresh === '1';

  const data = await getActiveEvents({
    perils,
    minMag: Number.isFinite(minMag) ? minMag : undefined,
    fresh,
  });

  // Short cache lifetime mirrors the service TTL; lets browsers/CDNs reuse the poll briefly.
  reply.header('cache-control', 'public, max-age=120');
  return reply.send(data);
}

// Active fault lines (GEM Global Active Faults) — a static seismic-hazard overlay. Lines are
// coloured by net slip rate so high-strain faults read as higher risk. Large but effectively
// static, so it is cached aggressively both in-process and at the browser/CDN.
export async function faultLinesHandler(request: FastifyRequest, reply: FastifyReply) {
  const query = (request.query ?? {}) as { fresh?: string };
  const fresh = query.fresh === 'true' || query.fresh === '1';

  const data = await getFaultLines({ fresh });

  reply.header('cache-control', 'public, max-age=86400');
  return reply.send(data);
}
