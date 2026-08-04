import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { User } from '../../db/models/identity.models';
import {
  invalidWidgetKeys,
  invalidWidgetSettings,
  isSurfaceKey,
  SurfaceKey,
} from '../../services/dashboards/platformDefaults';
import { evaluateMetric, MetricError } from '../../services/dashboards/metrics';
import {
  resetOrgLayout,
  resetUserLayout,
  resolveLayout,
  saveOrgLayout,
  saveUserLayout,
} from '../../services/dashboards/service';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

/**
 * Resolve the authenticated user from the Bearer token. On failure it sends the
 * appropriate 4xx envelope and returns null, so the handler can early-out with
 * `if (!user) return reply;` (same convention as the navigation route).
 */
async function resolveUser(request: FastifyRequest, reply: FastifyReply): Promise<User | null> {
  const authHeader =
    (request.headers.authorization as string) || (request.headers.Authorization as string) || undefined;
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    reply.code(401).send({ error: 'missing_authorization' });
    return null;
  }
  try {
    const payload = jwt.verify(match[1], JWT_SECRET) as { userId?: unknown; id?: unknown };
    const userId = Number(payload?.userId ?? payload?.id ?? NaN);
    if (!Number.isFinite(userId)) {
      reply.code(401).send({ error: 'invalid_token_payload' });
      return null;
    }
    const user = await User.findByPk(userId);
    if (!user) {
      reply.code(404).send({ error: 'user_not_found' });
      return null;
    }
    return user;
  } catch {
    reply.code(401).send({ error: 'invalid_token' });
    return null;
  }
}

const surfaceParam = (req: FastifyRequest): string => String((req.params as any).surfaceKey);
const orgParam = (req: FastifyRequest): number => Number((req.params as any).id);
const layoutBody = (req: FastifyRequest) => (req.body as any)?.layout ?? req.body;

/**
 * Validate a candidate layout's widget keys and per-widget settings against the
 * surface catalog. On failure it sends the 400 envelope and returns the reply
 * (so callers `return invalid;`); on success returns null.
 */
function validateLayout(
  surfaceKey: SurfaceKey,
  layout: any,
  reply: FastifyReply,
  organizationId: number | null,
): FastifyReply | null {
  const badKeys = invalidWidgetKeys(surfaceKey, layout);
  if (badKeys.length > 0) return reply.code(400).send({ error: 'invalid_widget_keys', widgetKeys: badKeys });
  const badSettings = invalidWidgetSettings(surfaceKey, layout, organizationId);
  if (badSettings.length > 0) return reply.code(400).send({ error: 'invalid_widget_settings', issues: badSettings });
  return null;
}

/**
 * Configurable Home dashboards API (registered under `/api`).
 *
 * The cascade is server-authoritative: a saved layout may only reference widget
 * keys the surface's catalog declares. The org tier is admin-only and verifies
 * the caller's token org matches the path org.
 */
export const dashboardsRoute: FastifyPluginAsync = async (app) => {
  // ── Resolve the effective layout for the current user, with editor context ──
  app.get('/dashboards/:surfaceKey/layout', async (req, reply) => {
    const surfaceKey = surfaceParam(req);
    if (!isSurfaceKey(surfaceKey)) return reply.code(404).send({ error: 'unknown_surface' });
    const user = await resolveUser(req, reply);
    if (!user) return reply;
    const resolved = await resolveLayout(surfaceKey as SurfaceKey, user.organizationId ?? null, user.id);
    return reply.send(resolved);
  });

  // ── Evaluate a custom metric against live, org-scoped data ──
  app.post('/dashboards/metrics/evaluate', async (req, reply) => {
    const user = await resolveUser(req, reply);
    if (!user) return reply;
    if (user.organizationId == null) return reply.code(400).send({ error: 'no_organization' });
    const definition = (req.body as any)?.definition ?? req.body;
    try {
      const result = await evaluateMetric(user.organizationId, definition);
      return reply.send(result);
    } catch (err) {
      if (err instanceof MetricError) return reply.code(400).send({ error: 'invalid_metric', issues: err.issues });
      throw err;
    }
  });

  // ── Save the current user's layout ──
  app.put('/dashboards/:surfaceKey/layout', async (req, reply) => {
    const surfaceKey = surfaceParam(req);
    if (!isSurfaceKey(surfaceKey)) return reply.code(404).send({ error: 'unknown_surface' });
    const user = await resolveUser(req, reply);
    if (!user) return reply;
    const layout = layoutBody(req);
    const invalid = validateLayout(surfaceKey as SurfaceKey, layout, reply, user.organizationId ?? null);
    if (invalid) return invalid;
    const saved = await saveUserLayout(surfaceKey as SurfaceKey, user.organizationId ?? null, user.id, layout);
    return reply.send({ surfaceKey, source: 'user', effective: saved });
  });

  // ── Reset the current user's layout (fall back to org/platform) ──
  app.delete('/dashboards/:surfaceKey/layout', async (req, reply) => {
    const surfaceKey = surfaceParam(req);
    if (!isSurfaceKey(surfaceKey)) return reply.code(404).send({ error: 'unknown_surface' });
    const user = await resolveUser(req, reply);
    if (!user) return reply;
    await resetUserLayout(surfaceKey as SurfaceKey, user.organizationId ?? null, user.id);
    const resolved = await resolveLayout(surfaceKey as SurfaceKey, user.organizationId ?? null, user.id);
    return reply.send(resolved);
  });

  // ── Save an organization's layout (admin-only) ──
  app.put('/organizations/:id/dashboards/:surfaceKey/layout', async (req, reply) => {
    const surfaceKey = surfaceParam(req);
    if (!isSurfaceKey(surfaceKey)) return reply.code(404).send({ error: 'unknown_surface' });
    const user = await resolveUser(req, reply);
    if (!user) return reply;
    const pathOrg = orgParam(req);
    if (user.role !== 'admin') return reply.code(403).send({ error: 'admin_required' });
    if (user.organizationId != null && user.organizationId !== pathOrg) {
      return reply.code(403).send({ error: 'org_mismatch' });
    }
    const layout = layoutBody(req);
    const invalid = validateLayout(surfaceKey as SurfaceKey, layout, reply, pathOrg);
    if (invalid) return invalid;
    const saved = await saveOrgLayout(surfaceKey as SurfaceKey, pathOrg, layout);
    return reply.send({ surfaceKey, source: 'org', effective: saved });
  });

  // ── Reset an organization's layout (admin-only) ──
  app.delete('/organizations/:id/dashboards/:surfaceKey/layout', async (req, reply) => {
    const surfaceKey = surfaceParam(req);
    if (!isSurfaceKey(surfaceKey)) return reply.code(404).send({ error: 'unknown_surface' });
    const user = await resolveUser(req, reply);
    if (!user) return reply;
    const pathOrg = orgParam(req);
    if (user.role !== 'admin') return reply.code(403).send({ error: 'admin_required' });
    if (user.organizationId != null && user.organizationId !== pathOrg) {
      return reply.code(403).send({ error: 'org_mismatch' });
    }
    await resetOrgLayout(surfaceKey as SurfaceKey, pathOrg);
    return reply.code(204).send();
  });
};

export default dashboardsRoute;
