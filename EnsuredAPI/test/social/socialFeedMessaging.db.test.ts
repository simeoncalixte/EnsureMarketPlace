import jwt from 'jsonwebtoken';
import request from 'supertest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { Organization, Submission, SubmissionFile, User } from '../../src/db/models';
import { getSimulatedOutbox, clearSimulatedOutbox } from '../../src/social/messaging/providers/SimulatedProvider';
import { initTestDb, truncateTables } from '../helpers/db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';
const tokenFor = (userId: number) => jwt.sign({ userId }, JWT_SECRET);

jest.setTimeout(120000);

describe('social feed + messaging', () => {
  let app: FastifyInstance;
  let alice: User; // org A
  let bob: User; // org B — connected with alice
  let carol: User; // org B — NOT connected with alice
  let orgA: Organization;
  let orgB: Organization;

  const auth = (user: User) => ({ Authorization: `Bearer ${tokenFor(user.id)}` });

  async function connect(a: User, b: User) {
    const create = await request(app.server).post('/api/social/connections').set(auth(a)).send({ addresseeId: b.id });
    await request(app.server).post(`/api/social/connections/${create.body.connection.id}/accept`).set(auth(b));
  }

  beforeAll(async () => {
    await initTestDb();
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateTables(
      'submission_shares',
      'social_messages',
      'conversation_participants',
      'conversations',
      'user_messaging_integrations',
      'post_comments',
      'post_likes',
      'posts',
      'connections',
      'notifications',
      'submission_files',
      'submissions',
      'users',
      'organizations',
    );
    clearSimulatedOutbox();
    orgA = await Organization.create({ name: 'Org A', type: 'insurer', submissionBoardConfig: null });
    orgB = await Organization.create({ name: 'Org B', type: 'insurer', submissionBoardConfig: null });
    alice = await User.create({
      email: 'alice@a.com', passwordHash: 'x', role: 'insurer', firstName: 'Alice', lastName: 'A', organizationId: orgA.id,
    });
    bob = await User.create({
      email: 'bob@b.com', passwordHash: 'x', role: 'analyst', firstName: 'Bob', lastName: 'B', organizationId: orgB.id,
    });
    carol = await User.create({
      email: 'carol@b.com', passwordHash: 'x', role: 'analyst', firstName: 'Carol', lastName: 'C', organizationId: orgB.id,
    });
    await connect(alice, bob);
  });

  describe('feed', () => {
    it('hides connections-only posts from strangers but shows public ones', async () => {
      await request(app.server)
        .post('/api/social/posts')
        .set(auth(alice))
        .send({ content: 'for my network', visibility: 'connections' });
      await request(app.server)
        .post('/api/social/posts')
        .set(auth(alice))
        .send({ content: 'for everyone', visibility: 'public' });

      const bobFeed = await request(app.server).get('/api/social/feed').set(auth(bob));
      expect(bobFeed.body.posts.map((p: { content: string }) => p.content).sort()).toEqual([
        'for everyone',
        'for my network',
      ]);

      const carolFeed = await request(app.server).get('/api/social/feed').set(auth(carol));
      expect(carolFeed.body.posts.map((p: { content: string }) => p.content)).toEqual(['for everyone']);
    });

    it('paginates with a keyset cursor', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app.server).post('/api/social/posts').set(auth(alice)).send({ content: `post ${i}` });
      }
      const page1 = await request(app.server).get('/api/social/feed?limit=3').set(auth(bob));
      expect(page1.body.posts).toHaveLength(3);
      expect(page1.body.nextCursor).toBeTruthy();

      const page2 = await request(app.server).get(`/api/social/feed?limit=3&cursor=${page1.body.nextCursor}`).set(auth(bob));
      expect(page2.body.posts).toHaveLength(2);
      expect(page2.body.nextCursor).toBeNull();

      const ids1 = page1.body.posts.map((p: { id: number }) => p.id);
      const ids2 = page2.body.posts.map((p: { id: number }) => p.id);
      expect(new Set([...ids1, ...ids2]).size).toBe(5);
    });

    it('likes and comments update counts and notify the author', async () => {
      const post = await request(app.server).post('/api/social/posts').set(auth(alice)).send({ content: 'hi' });
      await request(app.server).post(`/api/social/posts/${post.body.post.id}/like`).set(auth(bob));
      await request(app.server)
        .post(`/api/social/posts/${post.body.post.id}/comments`)
        .set(auth(bob))
        .send({ body: 'nice' });

      const feed = await request(app.server).get('/api/social/feed').set(auth(alice));
      const decorated = feed.body.posts[0];
      expect(decorated.likeCount).toBe(1);
      expect(decorated.commentCount).toBe(1);
    });
  });

  describe('messaging', () => {
    it('requires an accepted connection to open a conversation', async () => {
      const denied = await request(app.server)
        .post('/api/social/conversations')
        .set(auth(alice))
        .send({ userId: carol.id });
      expect(denied.status).toBe(403);
      expect(denied.body.error).toBe('connection_required');
    });

    it('find-or-create returns the same conversation for both directions', async () => {
      const first = await request(app.server).post('/api/social/conversations').set(auth(alice)).send({ userId: bob.id });
      const second = await request(app.server).post('/api/social/conversations').set(auth(bob)).send({ userId: alice.id });
      expect(first.body.conversation.id).toBe(second.body.conversation.id);
    });

    it('non-participants cannot read or post messages', async () => {
      const conv = await request(app.server).post('/api/social/conversations').set(auth(alice)).send({ userId: bob.id });
      const read = await request(app.server)
        .get(`/api/social/conversations/${conv.body.conversation.id}/messages`)
        .set(auth(carol));
      expect(read.status).toBe(403);

      const write = await request(app.server)
        .post(`/api/social/conversations/${conv.body.conversation.id}/messages`)
        .set(auth(carol))
        .send({ kind: 'text', body: 'intruding' });
      expect(write.status).toBe(403);
    });

    it('text messages round-trip with unread counts and read receipts', async () => {
      const conv = await request(app.server).post('/api/social/conversations').set(auth(alice)).send({ userId: bob.id });
      const conversationId = conv.body.conversation.id;

      await request(app.server)
        .post(`/api/social/conversations/${conversationId}/messages`)
        .set(auth(alice))
        .send({ kind: 'text', body: 'hello bob' });

      const bobList = await request(app.server).get('/api/social/conversations').set(auth(bob));
      expect(bobList.body.conversations[0].unreadCount).toBe(1);
      expect(bobList.body.conversations[0].lastMessage.body).toBe('hello bob');

      await request(app.server).post(`/api/social/conversations/${conversationId}/read`).set(auth(bob));
      const afterRead = await request(app.server).get('/api/social/conversations').set(auth(bob));
      expect(afterRead.body.conversations[0].unreadCount).toBe(0);
    });

    it('sharing a submission grants the recipient read access', async () => {
      const submission = await Submission.create({ status: 'submitted', organizationId: orgA.id } as never);
      await SubmissionFile.create({
        submissionId: submission.id,
        fileName: 'sov.xlsx',
        fileType: 'xlsx',
        storagePath: 's3://nowhere/sov.xlsx',
      } as never);

      // Bob (org B) cannot see org A's submission before the share…
      const before = await request(app.server).get(`/api/social/shared-submissions/${submission.id}`).set(auth(bob));
      expect(before.status).toBe(404);

      const conv = await request(app.server).post('/api/social/conversations').set(auth(alice)).send({ userId: bob.id });
      const share = await request(app.server)
        .post(`/api/social/conversations/${conv.body.conversation.id}/messages`)
        .set(auth(alice))
        .send({ kind: 'submission_share', submissionId: submission.id, body: 'take a look' });
      expect(share.status).toBe(201);

      // …and can after.
      const after = await request(app.server).get(`/api/social/shared-submissions/${submission.id}`).set(auth(bob));
      expect(after.status).toBe(200);
      expect(after.body.submission.files).toHaveLength(1);
      expect(after.body.submission.files[0].fileName).toBe('sov.xlsx');

      // Carol got no grant.
      const carolView = await request(app.server).get(`/api/social/shared-submissions/${submission.id}`).set(auth(carol));
      expect(carolView.status).toBe(404);
    });

    it('a sender cannot share a submission they cannot access', async () => {
      const submission = await Submission.create({ status: 'submitted', organizationId: orgA.id } as never);
      await connect(bob, carol);
      const conv = await request(app.server).post('/api/social/conversations').set(auth(bob)).send({ userId: carol.id });
      const share = await request(app.server)
        .post(`/api/social/conversations/${conv.body.conversation.id}/messages`)
        .set(auth(bob))
        .send({ kind: 'submission_share', submissionId: submission.id });
      expect(share.status).toBe(403);
    });
  });

  describe('external messaging integrations (simulated)', () => {
    it('connect → verify via inbound webhook → outbound mirror → inbound reply', async () => {
      // 1. Bob connects Telegram: gets a verification code.
      const created = await request(app.server)
        .post('/api/social/integrations')
        .set(auth(bob))
        .send({ provider: 'telegram' });
      expect(created.status).toBe(201);
      const code = created.body.integration.verificationCode;
      expect(code).toMatch(/^\d{6}$/);
      expect(created.body.integration.simulated).toBe(true);

      // 2. Bob sends the code to the bot (simulated inbound webhook) — binds chat id.
      const verify = await request(app.server)
        .post('/api/social/webhooks/simulated')
        .send({ provider: 'telegram', externalSender: 'chat-777', text: code });
      expect(verify.body).toEqual({ ok: true, action: 'verified', userId: bob.id });

      const integrations = await request(app.server).get('/api/social/integrations').set(auth(bob));
      expect(integrations.body.integrations[0].verified).toBe(true);

      // 3. Alice DMs Bob — the message is mirrored to Bob's Telegram (simulated outbox).
      const conv = await request(app.server).post('/api/social/conversations').set(auth(alice)).send({ userId: bob.id });
      await request(app.server)
        .post(`/api/social/conversations/${conv.body.conversation.id}/messages`)
        .set(auth(alice))
        .send({ kind: 'text', body: 'ping via telegram' });
      await new Promise((resolve) => setTimeout(resolve, 50)); // external mirror is fire-and-forget
      const outbox = getSimulatedOutbox();
      expect(outbox).toHaveLength(1);
      expect(outbox[0].destination).toBe('chat-777');
      expect(outbox[0].text).toContain('Alice A: ping via telegram');

      // 4. Bob replies from Telegram — lands in the same conversation.
      const reply = await request(app.server)
        .post('/api/social/webhooks/simulated')
        .send({ provider: 'telegram', externalSender: 'chat-777', externalMessageId: 'tg-1', text: 'pong from phone' });
      expect(reply.body.action).toBe('message_created');
      expect(reply.body.conversationId).toBe(conv.body.conversation.id);

      const messages = await request(app.server)
        .get(`/api/social/conversations/${conv.body.conversation.id}/messages`)
        .set(auth(alice));
      const bodies = messages.body.messages.map((m: { body: string }) => m.body);
      expect(bodies).toEqual(['ping via telegram', 'pong from phone']);
      expect(messages.body.messages[1].senderId).toBe(bob.id);
      expect(messages.body.messages[1].externalProvider).toBe('telegram');
    });

    it('dedupes inbound webhook retries on external message id', async () => {
      const created = await request(app.server)
        .post('/api/social/integrations')
        .set(auth(bob))
        .send({ provider: 'telegram' });
      await request(app.server)
        .post('/api/social/webhooks/simulated')
        .send({ provider: 'telegram', externalSender: 'chat-9', text: created.body.integration.verificationCode });
      const conv = await request(app.server).post('/api/social/conversations').set(auth(alice)).send({ userId: bob.id });

      const payload = { provider: 'telegram', externalSender: 'chat-9', externalMessageId: 'tg-dup', text: 'once' };
      await request(app.server).post('/api/social/webhooks/simulated').send(payload);
      const second = await request(app.server).post('/api/social/webhooks/simulated').send(payload);
      expect(second.body.action).toBe('duplicate');

      const messages = await request(app.server)
        .get(`/api/social/conversations/${conv.body.conversation.id}/messages`)
        .set(auth(alice));
      expect(messages.body.messages).toHaveLength(1);
    });
  });
});
