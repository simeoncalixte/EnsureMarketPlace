import fastify from 'fastify';
import jwt from 'jsonwebtoken';
import { initTestDb, truncateTables } from '../helpers/db';
import { Organization, User } from '../../src/db/models/identity.models';
import { authRoute } from '../../src/routes/auth';

describe('GET /api/auth/me', () => {
  let app: ReturnType<typeof fastify>;

  beforeAll(async () => {
    await initTestDb();
    app = fastify();
    app.register(authRoute, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateTables('users', 'organizations');
  });

  it('returns user details when provided a valid impersonation token', async () => {
    const org = await Organization.create({ name: 'Test Org', type: 'investor_fund' });
    const user = await User.create({ email: 'alice@example.com', passwordHash: 'x', firstName: 'Alice', lastName: 'Example', role: 'investor', organizationId: org.id });

    // Create a JWT directly (avoid loading the impersonation route)
    const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);

    // Call auth/me with the token
    const res = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { Authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    expect(body.id).toBe(user.id);
    expect(body.email).toBe('alice@example.com');
    expect(body.firstName).toBe('Alice');
    expect(body.lastName).toBe('Example');
    expect(body.organizationId).toBe(org.id);
  });
});
