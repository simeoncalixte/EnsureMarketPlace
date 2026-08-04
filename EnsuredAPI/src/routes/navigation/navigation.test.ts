import fastify from 'fastify';
import jwt from 'jsonwebtoken';
import { initTestDb, truncateTables } from '../../../test/helpers/db';
import { Organization, User } from '../../db/models/identity.models';
import { userRoles } from '../../db/models/constants';
import { navigationRoute } from './index';
import {
  buildNavigationForRole,
  collectNavPaths,
  homePathForRole,
  navigationCatalog,
  type SystemRole,
} from '../../services/navigation/catalog';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

/**
 * Every route the UI router (EnsuredUI/src/AppRoutes.tsx) mounts behind auth.
 * Nav links may only point at one of these — anything else is a dead link. When
 * a real route is added/removed there, update this list to match.
 */
const VALID_UI_ROUTES = [
  '/marketplace',
  '/investors',
  '/claims',
  '/underwriting/submissions',
  '/line-of-business',
  '/admin',
  '/admin/deals/create',
  '/insurer',
  '/insurer/dashboard',
  '/insurer/risk',
  '/insurer/risk/upload',
  '/insurer/risk/history',
  '/insurer/risk/validation',
  '/insurer/portfolio',
  '/insurer/coverage',
  '/insurer/coverage/create',
  '/insurer/coverage/choice-controls',
  '/insurer/coverage/simulate',
  '/insurer/coverage/pricing',
  '/insurer/coverage-active',
  '/insurer/reports',
  '/insurer/pipeline-ingestion',
  '/insurer/pipeline-processes',
  '/insurer/pipeline-flow',
  // Per-submission-type pipeline boards (the parameterized /insurer/pipeline/:routeKey
  // route). One nav entry per submission-type taxonomy code.
  '/insurer/pipeline/new_business',
  '/insurer/pipeline/renewal',
  '/insurer/pipeline/quote_request',
  '/insurer/pipeline/endorsement',
  '/insurer/pipeline/cancellation',
  '/insurer/pipeline/claim',
  '/insurer/pipeline/audit',
  '/insurer/pipeline/treaty_reinsurance',
  '/insurer/pipeline/facultative_reinsurance',
  '/insurer/pipeline/inquiry',
  '/insurer/settings',
  '/insurer/claims',
  '/governance/capacity',
  '/governance/authority',
  '/governance/referrals',
  '/governance/rules-engine',
  '/governance/simulation',
  '/governance/audit',
  '/network',
  '/feed',
  '/messages',
];

describe('navigation catalog', () => {
  it('defines a non-empty tree for every system role', () => {
    for (const role of userRoles) {
      const items = buildNavigationForRole(role);
      expect(items.length).toBeGreaterThan(0);
    }
  });

  it('every nav path maps to a real route in the UI router', () => {
    for (const role of userRoles) {
      for (const path of collectNavPaths(navigationCatalog[role as SystemRole])) {
        expect(VALID_UI_ROUTES).toContain(path);
      }
    }
  });

  it('uses absolute paths and non-empty labels for every node', () => {
    for (const role of userRoles) {
      const walk = (nodes: ReturnType<typeof buildNavigationForRole>) => {
        for (const node of nodes) {
          expect(node.id.startsWith('/')).toBe(true);
          expect(node.label.trim().length).toBeGreaterThan(0);
          if (node.subItems) walk(node.subItems);
        }
      };
      walk(buildNavigationForRole(role));
    }
  });

  it('returns a defensive copy so callers cannot mutate the shared catalog', () => {
    const first = buildNavigationForRole('insurer');
    first[0].label = 'mutated';
    const second = buildNavigationForRole('insurer');
    expect(second[0].label).not.toBe('mutated');
  });

  it('falls back to the least-privileged investor tree for an unknown role', () => {
    expect(buildNavigationForRole('intruder')).toEqual(buildNavigationForRole('investor'));
    expect(homePathForRole('intruder')).toBe('/marketplace');
  });

  it('gives each role a distinct landing route', () => {
    expect(homePathForRole('insurer')).toBe('/insurer');
    expect(homePathForRole('investor')).toBe('/investors');
    expect(homePathForRole('analyst')).toBe('/underwriting/submissions');
    expect(homePathForRole('admin')).toBe('/admin');
  });
});

describe('GET /api/navigation', () => {
  let app: ReturnType<typeof fastify>;

  beforeAll(async () => {
    await initTestDb();
    app = fastify();
    app.register(navigationRoute, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateTables('users', 'organizations');
  });

  async function makeUser(role: SystemRole) {
    const org = await Organization.create({ name: `${role} Org`, type: 'insurer' });
    return User.create({
      email: `${role}@example.com`,
      passwordHash: 'x',
      firstName: 'Test',
      lastName: 'User',
      role,
      organizationId: org.id,
    });
  }

  it('rejects requests with no Authorization header', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/navigation' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/navigation',
      headers: { Authorization: 'Bearer not-a-real-token' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns the insurer navigation tree for an insurer session', async () => {
    const user = await makeUser('insurer');
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);

    const res = await app.inject({
      method: 'GET',
      url: '/api/navigation',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.role).toBe('insurer');
    expect(body.home).toBe('/insurer');
    expect(body.items).toEqual(buildNavigationForRole('insurer'));
    // Insurer-only structuring entry is present...
    const ids = collectNavPaths(body.items);
    expect(ids).toContain('/insurer/coverage/create');
  });

  it('returns role-distinct trees: an analyst never sees admin or settings links', async () => {
    const user = await makeUser('analyst');
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);

    const res = await app.inject({
      method: 'GET',
      url: '/api/navigation',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const ids = collectNavPaths(JSON.parse(res.payload).items);
    expect(ids).not.toContain('/admin');
    expect(ids).not.toContain('/insurer/settings');
    expect(ids).toContain('/underwriting/submissions');
  });

  it('surfaces the admin console only for an admin session', async () => {
    const user = await makeUser('admin');
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);

    const res = await app.inject({
      method: 'GET',
      url: '/api/navigation',
      headers: { Authorization: `Bearer ${token}` },
    });

    const ids = collectNavPaths(JSON.parse(res.payload).items);
    expect(ids).toContain('/admin');
    expect(ids).toContain('/admin/deals/create');
  });
});
