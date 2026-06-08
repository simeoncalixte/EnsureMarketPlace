/* eslint-env jest */
// Keep the real credentials/cursor seam (operates on the fake channel below);
// only stub the network-touching mailbox client factory.
jest.mock('../connectors/email', () => {
  const actual = jest.requireActual('../connectors/email');
  return { ...actual, getMailboxClient: jest.fn() };
});

import { EmailStrategy } from '../strategies';
import { getMailboxClient, ReauthRequiredError } from '../connectors/email';
import { IngestionService } from './service';

/** Minimal IngestionChannel stand-in backed by an in-memory config object. */
function makeChannel(config: Record<string, any>) {
  let cfg: Record<string, any> = { provider: 'google', ...config };
  let status = 'active';
  return {
    get(key: string) {
      if (key === 'config') return cfg;
      if (key === 'type') return 'gmail';
      if (key === 'id') return 7;
      if (key === 'enabled') return true;
      if (key === 'status') return status;
      return null;
    },
    async update(values: Record<string, any>) {
      if (values.config) cfg = values.config;
      if (values.status) status = values.status;
    },
    // test accessors
    _config: () => cfg,
    _status: () => status,
  } as any;
}

function stubClient(overrides: Partial<Record<string, any>> = {}) {
  return {
    provider: 'google',
    getAccessToken: jest.fn(async () => 'tok'),
    listNewMessages: jest.fn(async () => ({ messageIds: ['m1', 'm2'], nextCursor: 'h-200' })),
    getMessage: jest.fn(async (id: string) => ({
      id,
      from: 'broker@x.com',
      to: ['a@b.com'],
      subject: 'Submission',
      receivedAt: new Date(0),
      bodyText: 'hello body',
      bodyHtml: null,
      attachments: [{ fileName: 'sov.pdf', mimeType: 'application/pdf', contentBase64: 'AAAA' }],
    })),
    markProcessed: jest.fn(async () => {}),
    verifyConnection: jest.fn(async () => ({ ok: true })),
    ...overrides,
  };
}

describe('EmailStrategy.ensureSubmissions', () => {
  let createSpy: jest.SpyInstance;

  beforeEach(() => {
    createSpy = jest
      .spyOn(IngestionService.prototype, 'createSubmissionFromAmqpPayload')
      .mockResolvedValue({ id: 101 } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('maps messages to submissions, advances cursor, records processed ids', async () => {
    (getMailboxClient as jest.Mock).mockReturnValue(stubClient());
    const channel = makeChannel({ oauth: { refreshToken: 'rt', clientId: 'g', clientSecret: 's' } });

    const created = await new EmailStrategy().ensureSubmissions(channel, 10);

    expect(created).toBe(2);
    // First file is the email body; attachment follows.
    const [, payload, opts] = createSpy.mock.calls[0];
    expect(payload.files[0]).toMatchObject({ fileName: 'body.txt', fileType: 'text/plain' });
    expect(payload.files[1].fileName).toBe('sov.pdf');
    expect(payload.email).toMatchObject({ subject: 'Submission', messageId: 'm1' });
    expect(opts).toEqual({ transport: 'email', source: 'gmail', ingestionChannelId: 7 });
    // Cursor advanced + dedup ring populated.
    expect(channel._config().cursor.gmailHistoryId).toBe('h-200');
    expect(channel._config().processedMessageIds).toEqual(['m1', 'm2']);
  });

  test('skips already-processed message ids', async () => {
    (getMailboxClient as jest.Mock).mockReturnValue(stubClient());
    const channel = makeChannel({
      oauth: { refreshToken: 'rt', clientId: 'g', clientSecret: 's' },
      processedMessageIds: ['m1'],
    });

    const created = await new EmailStrategy().ensureSubmissions(channel, 10);

    expect(created).toBe(1);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy.mock.calls[0][1].email.messageId).toBe('m2');
  });

  test('bails out without authorization', async () => {
    (getMailboxClient as jest.Mock).mockReturnValue(stubClient());
    const channel = makeChannel({ oauth: {} });
    const created = await new EmailStrategy().ensureSubmissions(channel, 10);
    expect(created).toBe(0);
    expect(createSpy).not.toHaveBeenCalled();
  });

  test('does not advance cursor when a message hard-fails', async () => {
    const client = stubClient({
      getMessage: jest.fn(async () => {
        throw new Error('network blip');
      }),
    });
    (getMailboxClient as jest.Mock).mockReturnValue(client);
    const channel = makeChannel({ oauth: { refreshToken: 'rt', clientId: 'g', clientSecret: 's' } });

    const created = await new EmailStrategy().ensureSubmissions(channel, 10);
    expect(created).toBe(0);
    expect(channel._config().cursor).toBeUndefined();
  });

  test('marks channel reauth_required on ReauthRequiredError during listing', async () => {
    const client = stubClient({
      listNewMessages: jest.fn(async () => {
        throw new ReauthRequiredError('revoked');
      }),
    });
    (getMailboxClient as jest.Mock).mockReturnValue(client);
    const channel = makeChannel({ oauth: { refreshToken: 'rt', clientId: 'g', clientSecret: 's' } });

    const created = await new EmailStrategy().ensureSubmissions(channel, 10);
    expect(created).toBe(0);
    expect(channel._status()).toBe('reauth_required');
  });
});
