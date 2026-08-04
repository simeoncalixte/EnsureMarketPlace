import jwt from 'jsonwebtoken';
import { buildApp } from '../../app';
import { truncateTables } from '../../../test/helpers/db';
import { Organization, User } from '../../db/models/identity.models';
import { DashboardLayout } from '../../db/models/dashboardLayout.models';
import { Submission } from '../../db/models/underwriting.models';
import { metricPresets, platformDefault } from '../../services/dashboards/platformDefaults';
import { validateMetricDefinition } from '../../services/dashboards/metrics';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';
const SURFACE = 'insurer-analytics';

const token = (userId: number) => jwt.sign({ userId }, JWT_SECRET);
const auth = (userId: number) => ({ authorization: `Bearer ${token(userId)}` });

/** A minimal valid layout for the insurer-analytics surface. */
const validLayout = () => ({
  surfaceKey: SURFACE,
  version: 1,
  items: [{ widgetKey: 'kpi-annual-gwp', x: 0, y: 0, w: 3, h: 2 }],
});

describe('dashboards route — three-tier cascade', () => {
  let app: ReturnType<typeof buildApp>;
  let orgId: number;
  let adminId: number;
  let memberId: number;

  beforeAll(async () => {
    // buildApp() initialises all models via getSequelize(). We sync only the
    // three tables this route touches (in FK order) rather than the full model
    // set — the route never queries the others, and a repo-wide PageTemplate
    // index-name collision currently breaks `sync({ force: true })` over every
    // model at once.
    app = buildApp();
    await app.ready();
    await Organization.sync({ force: true });
    await User.sync({ force: true });
    await DashboardLayout.sync({ force: true });
    await Submission.sync({ force: true });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateTables('dashboard_layouts', 'submissions', 'users', 'organizations');
    const org = await Organization.create({ name: 'Pinnacle Re', type: 'insurer' });
    orgId = org.id;
    const admin = await User.create({
      organizationId: orgId,
      email: 'admin@pinnacle.test',
      passwordHash: 'x',
      role: 'admin',
      firstName: 'Ada',
      lastName: 'Admin',
    });
    adminId = admin.id;
    const member = await User.create({
      organizationId: orgId,
      email: 'member@pinnacle.test',
      passwordHash: 'x',
      role: 'analyst',
      firstName: 'Mel',
      lastName: 'Member',
    });
    memberId = member.id;
  });

  it('resolves to the platform default when no overrides exist', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboards/${SURFACE}/layout`,
      headers: auth(memberId),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.source).toBe('platform');
    expect(body.effective.items).toHaveLength(platformDefault(SURFACE).items.length);
    expect(Array.isArray(body.catalog)).toBe(true);
  });

  it('user override wins over platform', async () => {
    const put = await app.inject({
      method: 'PUT',
      url: `/api/dashboards/${SURFACE}/layout`,
      headers: auth(memberId),
      payload: { layout: validLayout() },
    });
    expect(put.statusCode).toBe(200);

    const res = await app.inject({
      method: 'GET',
      url: `/api/dashboards/${SURFACE}/layout`,
      headers: auth(memberId),
    });
    const body = JSON.parse(res.payload);
    expect(body.source).toBe('user');
    expect(body.effective.items).toHaveLength(1);
  });

  it('org override wins over platform, and reset of the user layout falls back to org', async () => {
    // Admin sets the org default.
    const orgPut = await app.inject({
      method: 'PUT',
      url: `/api/organizations/${orgId}/dashboards/${SURFACE}/layout`,
      headers: auth(adminId),
      payload: { layout: validLayout() },
    });
    expect(orgPut.statusCode).toBe(200);

    // A member with no personal layout inherits the org default.
    let res = await app.inject({
      method: 'GET',
      url: `/api/dashboards/${SURFACE}/layout`,
      headers: auth(memberId),
    });
    expect(JSON.parse(res.payload).source).toBe('org');

    // Member personalizes, then resets — should fall back to org, not platform.
    await app.inject({
      method: 'PUT',
      url: `/api/dashboards/${SURFACE}/layout`,
      headers: auth(memberId),
      payload: { layout: { ...validLayout(), items: [{ widgetKey: 'kpi-solvency', x: 0, y: 0, w: 3, h: 2 }] } },
    });
    res = await app.inject({
      method: 'GET',
      url: `/api/dashboards/${SURFACE}/layout`,
      headers: auth(memberId),
    });
    expect(JSON.parse(res.payload).source).toBe('user');

    const del = await app.inject({
      method: 'DELETE',
      url: `/api/dashboards/${SURFACE}/layout`,
      headers: auth(memberId),
    });
    expect(del.statusCode).toBe(200);
    expect(JSON.parse(del.payload).source).toBe('org');
  });

  it('rejects a non-admin editing the org tier with 403', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/organizations/${orgId}/dashboards/${SURFACE}/layout`,
      headers: auth(memberId),
      payload: { layout: validLayout() },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.payload).error).toBe('admin_required');
  });

  it('rejects unknown widget keys with 400', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/dashboards/${SURFACE}/layout`,
      headers: auth(memberId),
      payload: { layout: { surfaceKey: SURFACE, version: 1, items: [{ widgetKey: 'not-a-widget', x: 0, y: 0, w: 2, h: 2 }] } },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe('invalid_widget_keys');
    expect(body.widgetKeys).toContain('not-a-widget');
  });

  it('round-trips valid per-widget settings and rejects invalid ones', async () => {
    // Valid: a known setting in range + the universal title rename.
    const ok = await app.inject({
      method: 'PUT',
      url: `/api/dashboards/${SURFACE}/layout`,
      headers: auth(memberId),
      payload: {
        layout: {
          surfaceKey: SURFACE,
          version: 1,
          items: [
            { widgetKey: 'chart-loss-ratio-trend', x: 0, y: 0, w: 6, h: 6, settings: { monthsBack: 6, showRefLine: true, title: 'My Loss Trend' } },
          ],
        },
      },
    });
    expect(ok.statusCode).toBe(200);
    const get = await app.inject({ method: 'GET', url: `/api/dashboards/${SURFACE}/layout`, headers: auth(memberId) });
    const item = JSON.parse(get.payload).effective.items[0];
    expect(item.settings).toEqual({ monthsBack: 6, showRefLine: true, title: 'My Loss Trend' });

    // Out-of-range number → 400.
    const bad = await app.inject({
      method: 'PUT',
      url: `/api/dashboards/${SURFACE}/layout`,
      headers: auth(memberId),
      payload: {
        layout: {
          surfaceKey: SURFACE,
          version: 1,
          items: [{ widgetKey: 'chart-loss-ratio-trend', x: 0, y: 0, w: 6, h: 6, settings: { monthsBack: 99 } }],
        },
      },
    });
    expect(bad.statusCode).toBe(400);
    expect(JSON.parse(bad.payload).error).toBe('invalid_widget_settings');

    // Unknown setting key → 400.
    const unknown = await app.inject({
      method: 'PUT',
      url: `/api/dashboards/${SURFACE}/layout`,
      headers: auth(memberId),
      payload: {
        layout: {
          surfaceKey: SURFACE,
          version: 1,
          items: [{ widgetKey: 'chart-loss-ratio-trend', x: 0, y: 0, w: 6, h: 6, settings: { bogus: 1 } }],
        },
      },
    });
    expect(unknown.statusCode).toBe(400);
  });

  describe('custom metrics (live, org-scoped)', () => {
    beforeEach(async () => {
      // A second org whose submissions must never leak into this org's metrics.
      const otherOrg = await Organization.create({ name: 'Other Co', type: 'insurer' });
      await Submission.bulkCreate([
        { organizationId: orgId, status: 'submitted' },
        { organizationId: orgId, status: 'submitted' },
        { organizationId: orgId, status: 'draft' },
        { organizationId: otherOrg.id, status: 'submitted' },
      ] as any);
    });

    const evaluate = (definition: unknown) =>
      app.inject({
        method: 'POST',
        url: '/api/dashboards/metrics/evaluate',
        headers: auth(memberId),
        payload: { definition },
      });

    it('computes a live scalar from terms + formula, org-scoped', async () => {
      const res = await evaluate({
        terms: [{ name: 'A', modelKey: 'submission', fn: 'count' }],
        formula: 'A',
        viz: 'kpi',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.kind).toBe('scalar');
      expect(body.value).toBe(3); // only this org's 3 submissions
    });

    it('computes a live grouped series', async () => {
      const res = await evaluate({
        terms: [{ name: 'A', modelKey: 'submission', fn: 'count' }],
        formula: 'A',
        groupBy: { kind: 'category', modelKey: 'submission', fieldPath: 'submission.status' },
        viz: 'bar',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.kind).toBe('series');
      const byGroup = Object.fromEntries(body.points.map((p: any) => [p.group, p.value]));
      expect(byGroup).toEqual({ draft: 1, submitted: 2 });
    });

    it('rejects an unknown attribute with 400', async () => {
      const res = await evaluate({
        terms: [{ name: 'A', modelKey: 'submission', fn: 'sum', fieldPath: 'submission.not_a_field' }],
        formula: 'A',
        viz: 'kpi',
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.payload).error).toBe('invalid_metric');
    });

    it('every predefined preset validates against the catalog', () => {
      for (const preset of metricPresets()) {
        expect({ id: preset.id, issues: validateMetricDefinition(orgId, preset.definition) }).toEqual({
          id: preset.id,
          issues: [],
        });
      }
    });

    it.each(['insurer-analytics', 'marketplace'])(
      'the %s platform default (preset widgets) round-trips through save',
      async (surface) => {
        const res = await app.inject({
          method: 'PUT',
          url: `/api/dashboards/${surface}/layout`,
          headers: auth(memberId),
          payload: { layout: platformDefault(surface as any) },
        });
        expect(res.statusCode).toBe(200);
      },
    );

    it('saves a custom-metric widget instance and rejects a bad definition', async () => {
      const goodLayout = {
        surfaceKey: SURFACE,
        version: 1,
        items: [
          {
            widgetKey: 'custom-metric:abc123',
            x: 0,
            y: 0,
            w: 4,
            h: 6,
            settings: {
              title: 'Submissions',
              definition: { terms: [{ name: 'A', modelKey: 'submission', fn: 'count' }], formula: 'A', viz: 'kpi' },
            },
          },
        ],
      };
      const ok = await app.inject({
        method: 'PUT',
        url: `/api/dashboards/${SURFACE}/layout`,
        headers: auth(memberId),
        payload: { layout: goodLayout },
      });
      expect(ok.statusCode).toBe(200);

      const bad = await app.inject({
        method: 'PUT',
        url: `/api/dashboards/${SURFACE}/layout`,
        headers: auth(memberId),
        payload: {
          layout: {
            ...goodLayout,
            items: [{ ...goodLayout.items[0], settings: { definition: { terms: [], formula: '', viz: 'kpi' } } }],
          },
        },
      });
      expect(bad.statusCode).toBe(400);
      expect(JSON.parse(bad.payload).error).toBe('invalid_widget_settings');
    });
  });

  it('returns 404 for an unknown surface and 401 without a token', async () => {
    const unknown = await app.inject({
      method: 'GET',
      url: '/api/dashboards/not-a-surface/layout',
      headers: auth(memberId),
    });
    expect(unknown.statusCode).toBe(404);

    const noAuth = await app.inject({ method: 'GET', url: `/api/dashboards/${SURFACE}/layout` });
    expect(noAuth.statusCode).toBe(401);
  });
});
