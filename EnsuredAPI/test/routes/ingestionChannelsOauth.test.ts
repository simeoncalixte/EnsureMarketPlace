import { buildApp } from '../../src/app';
import { initTestDb } from '../helpers/db';
import { IngestionChannel, Submission } from '../../src/db/models';
import { IngestionService } from '../../src/pipeline/ingestion/service';
import { encodeState } from '../../src/pipeline/connectors/email';

jest.setTimeout(60000);

describe('email channel OAuth + inbound submission linkage', () => {
  let app: ReturnType<typeof buildApp>;

  beforeAll(async () => {
    await initTestDb();
    process.env.OAUTH_REDIRECT_BASE_URL = 'https://api.test';
    app = buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await app.close();
    delete (global as any).fetch;
  });

  async function createEmailChannel() {
    return IngestionChannel.create({
      organizationId: null,
      type: 'gmail',
      label: 'Submissions Inbox',
      enabled: true,
      status: 'idle',
      meta: null,
      config: { provider: 'google', mailbox: 'submissions@x.com', oauth: { clientId: 'gid', clientSecret: 'sec' } },
    } as any);
  }

  it('oauth/start returns a consent URL carrying the client id and state', async () => {
    const channel = await createEmailChannel();
    const res = await app.inject({ method: 'GET', url: `/api/ingestion-channels/${channel.get('id')}/oauth/start` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload) as { ok: boolean; url: string };
    expect(body.ok).toBe(true);
    expect(body.url).toContain('accounts.google.com');
    expect(body.url).toContain('client_id=gid');
    expect(body.url).toContain('state=');
    expect(body.url).toContain('access_type=offline');
  });

  it('oauth/callback exchanges the code and persists the refresh token', async () => {
    const channel = await createEmailChannel();
    const channelId = Number(channel.get('id'));

    // Stub the provider token endpoint.
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify({ access_token: 'at', refresh_token: 'persisted-rt', expires_in: 3600 }),
    }));

    const state = encodeState({ channelId, nonce: `c${channelId}`, ts: Date.now() });
    const res = await app.inject({
      method: 'GET',
      url: `/api/ingestion-channels/oauth/callback?code=authcode&state=${encodeURIComponent(state)}`,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toMatchObject({ ok: true, channelId, status: 'active' });

    const reloaded = await IngestionChannel.findByPk(channelId);
    const cfg = reloaded!.get('config') as Record<string, any>;
    expect(cfg.oauth.refreshToken).toBe('persisted-rt');
    expect(reloaded!.get('status')).toBe('active');
  });

  it('oauth/callback rejects an invalid state', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/ingestion-channels/oauth/callback?code=x&state=not-base64-json',
    });
    expect(res.statusCode).toBe(400);
  });

  it('createSubmissionFromAmqpPayload still defaults to amqp and now links the channel', async () => {
    const channel = await createEmailChannel();
    const svc = new IngestionService();

    // Default call (no opts): preserves legacy transport, sets ingestionChannelId.
    const legacy = await svc.createSubmissionFromAmqpPayload(channel, { files: [] });
    expect(legacy.get('transport')).toBe('amqp');
    expect(legacy.get('source')).toBe('gmail'); // source derives from channel.type
    expect(legacy.get('ingestionChannelId')).toBe(Number(channel.get('id')));

    // Inbound email call: overrides transport/source and links the channel.
    const inbound = await svc.createSubmissionFromAmqpPayload(
      channel,
      { _transport: 'email', files: [{ fileName: 'body.txt', fileType: 'text/plain', contentBase64: Buffer.from('hi').toString('base64') }] },
      { transport: 'email', source: 'gmail', ingestionChannelId: Number(channel.get('id')) },
    );
    expect(inbound.get('transport')).toBe('email');
    expect(inbound.get('ingestionChannelId')).toBe(Number(channel.get('id')));

    // The channel-submissions endpoint can now see them.
    const subs = await Submission.findAll({ where: { ingestionChannelId: Number(channel.get('id')) } });
    expect(subs.length).toBe(2);
  });
});
