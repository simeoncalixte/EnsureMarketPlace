import jwt from 'jsonwebtoken';
import request from 'supertest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { User } from '../../src/db/models';
import { initTestDb, truncateTables } from '../helpers/db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

function tokenFor(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET);
}

async function createUser(email: string): Promise<User> {
  return User.create({
    email,
    passwordHash: 'x',
    role: 'insurer',
    firstName: email.split('@')[0],
    lastName: 'Test',
  });
}

jest.setTimeout(60000);

describe('social connections lifecycle', () => {
  let app: FastifyInstance;
  let alice: User;
  let bob: User;

  beforeAll(async () => {
    await initTestDb();
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateTables('connections', 'notifications', 'users');
    alice = await createUser('alice@example.com');
    bob = await createUser('bob@example.com');
  });

  it('request → accept makes both sides connected', async () => {
    const create = await request(app.server)
      .post('/api/social/connections')
      .set('Authorization', `Bearer ${tokenFor(alice.id)}`)
      .send({ addresseeId: bob.id });
    expect(create.status).toBe(201);
    expect(create.body.connection.status).toBe('pending');

    const accept = await request(app.server)
      .post(`/api/social/connections/${create.body.connection.id}/accept`)
      .set('Authorization', `Bearer ${tokenFor(bob.id)}`);
    expect(accept.status).toBe(200);
    expect(accept.body.connection.status).toBe('accepted');

    const profile = await request(app.server)
      .get(`/api/social/profiles/${bob.id}`)
      .set('Authorization', `Bearer ${tokenFor(alice.id)}`);
    expect(profile.status).toBe(200);
    expect(profile.body.profile.connectionStatus).toBe('connected');
    expect(profile.body.profile.connectionCount).toBe(1);
  });

  it('rejects a duplicate request in either direction with 409', async () => {
    await request(app.server)
      .post('/api/social/connections')
      .set('Authorization', `Bearer ${tokenFor(alice.id)}`)
      .send({ addresseeId: bob.id });

    const dupSame = await request(app.server)
      .post('/api/social/connections')
      .set('Authorization', `Bearer ${tokenFor(alice.id)}`)
      .send({ addresseeId: bob.id });
    expect(dupSame.status).toBe(409);

    const dupReverse = await request(app.server)
      .post('/api/social/connections')
      .set('Authorization', `Bearer ${tokenFor(bob.id)}`)
      .send({ addresseeId: alice.id });
    expect(dupReverse.status).toBe(409);
  });

  it('only the addressee can accept', async () => {
    const create = await request(app.server)
      .post('/api/social/connections')
      .set('Authorization', `Bearer ${tokenFor(alice.id)}`)
      .send({ addresseeId: bob.id });

    const selfAccept = await request(app.server)
      .post(`/api/social/connections/${create.body.connection.id}/accept`)
      .set('Authorization', `Bearer ${tokenFor(alice.id)}`);
    expect(selfAccept.status).toBe(403);
  });

  it('a declined request can be re-initiated by either side', async () => {
    const create = await request(app.server)
      .post('/api/social/connections')
      .set('Authorization', `Bearer ${tokenFor(alice.id)}`)
      .send({ addresseeId: bob.id });

    await request(app.server)
      .post(`/api/social/connections/${create.body.connection.id}/decline`)
      .set('Authorization', `Bearer ${tokenFor(bob.id)}`);

    const retry = await request(app.server)
      .post('/api/social/connections')
      .set('Authorization', `Bearer ${tokenFor(bob.id)}`)
      .send({ addresseeId: alice.id });
    expect(retry.status).toBe(201);
    expect(retry.body.connection.status).toBe('pending');
    expect(retry.body.connection.requesterId).toBe(bob.id);
  });

  it('lists pending invitations for the addressee and counts them', async () => {
    await request(app.server)
      .post('/api/social/connections')
      .set('Authorization', `Bearer ${tokenFor(alice.id)}`)
      .send({ addresseeId: bob.id });

    const incoming = await request(app.server)
      .get('/api/social/connections?status=pending_incoming')
      .set('Authorization', `Bearer ${tokenFor(bob.id)}`);
    expect(incoming.status).toBe(200);
    expect(incoming.body.connections).toHaveLength(1);
    expect(incoming.body.connections[0].user.userId).toBe(alice.id);

    const counts = await request(app.server)
      .get('/api/social/connections/counts')
      .set('Authorization', `Bearer ${tokenFor(bob.id)}`);
    expect(counts.body.counts).toEqual({ accepted: 0, pendingIncoming: 1 });
  });
});
