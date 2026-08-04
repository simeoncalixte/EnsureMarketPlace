import jwt from 'jsonwebtoken';
import { FastifyInstance } from 'fastify';
import WebSocket from 'ws';
import { buildApp } from '../../src/app';
import { User } from '../../src/db/models';
import { broadcastToUser, hasOpenSocket } from '../../src/services/social/realtime/socketRegistry';
import { initTestDb, truncateTables } from '../helpers/db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

jest.setTimeout(120000);

describe('social websocket', () => {
  let app: FastifyInstance;
  let baseUrl: string;
  let user: User;

  beforeAll(async () => {
    await initTestDb();
    app = buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address();
    if (typeof address === 'string' || !address) throw new Error('no address');
    baseUrl = `ws://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateTables('users');
    user = await User.create({ email: 'ws@test.com', passwordHash: 'x', role: 'insurer', firstName: 'W', lastName: 'S' });
  });

  it('rejects a connection without a valid token', async () => {
    const socket = new WebSocket(`${baseUrl}/api/social/ws?token=garbage`);
    const code = await new Promise<number>((resolve) => {
      socket.on('close', (closeCode) => resolve(closeCode));
      socket.on('error', () => undefined);
    });
    expect(code).toBe(4401);
  });

  it('delivers broadcastToUser events to an authenticated socket', async () => {
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    const socket = new WebSocket(`${baseUrl}/api/social/ws?token=${token}`);
    await new Promise<void>((resolve, reject) => {
      socket.on('open', () => resolve());
      socket.on('error', reject);
    });
    // Registration happens in the same tick as the upgrade handler; poll briefly.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(hasOpenSocket(user.id)).toBe(true);

    const received = new Promise<{ type: string; payload: Record<string, unknown> }>((resolve) => {
      socket.on('message', (data) => resolve(JSON.parse(String(data))));
    });
    broadcastToUser(user.id, { type: 'message.new', payload: { hello: 'world' } });

    const event = await received;
    expect(event.type).toBe('message.new');
    expect(event.payload).toEqual({ hello: 'world' });

    socket.close();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(hasOpenSocket(user.id)).toBe(false);
  });
});
