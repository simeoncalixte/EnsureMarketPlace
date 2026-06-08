/* eslint-env jest */
import { GmailClient } from './gmail';
import { MailboxCredentials } from './types';

function freshCreds(overrides: Partial<MailboxCredentials> = {}): MailboxCredentials {
  return {
    provider: 'google',
    clientId: 'gid',
    clientSecret: 'sec',
    refreshToken: 'rt',
    accessToken: 'cached-token',
    accessTokenExpiresAt: Date.now() + 3_600_000, // valid -> no refresh
    ...overrides,
  };
}

/** Route a fetch mock by URL substring. Returns a Response-like with text(). */
function routeFetch(routes: Array<{ match: string; body: any; status?: number }>) {
  const fn = jest.fn(async (url: string) => {
    const route = routes.find((r) => url.includes(r.match));
    if (!route) throw new Error(`no mock for ${url}`);
    const status = route.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: 'x',
      headers: { get: () => null },
      text: async () => (typeof route.body === 'string' ? route.body : JSON.stringify(route.body)),
    } as any;
  });
  (global as any).fetch = fn;
  return fn;
}

const b64url = (s: string) => Buffer.from(s, 'utf8').toString('base64url');

describe('GmailClient', () => {
  afterEach(() => delete (global as any).fetch);

  test('first-run list uses messages.list and returns profile historyId as cursor', async () => {
    routeFetch([
      { match: '/messages?', body: { messages: [{ id: 'm2' }, { id: 'm1' }] } },
      { match: '/profile', body: { emailAddress: 'a@b.com', historyId: '500' } },
    ]);
    const client = new GmailClient(freshCreds());
    const res = await client.listNewMessages(null, 10);
    // newest-first reversed to ascending
    expect(res.messageIds).toEqual(['m1', 'm2']);
    expect(res.nextCursor).toBe('500');
  });

  test('incremental list uses history.list with startHistoryId', async () => {
    const fn = routeFetch([
      { match: '/history?', body: { history: [{ messagesAdded: [{ message: { id: 'm9' } }] }], historyId: '600' } },
    ]);
    const client = new GmailClient(freshCreds());
    const res = await client.listNewMessages('500', 10);
    expect(res.messageIds).toEqual(['m9']);
    expect(res.nextCursor).toBe('600');
    expect(String((fn.mock.calls[0] as any)[0])).toContain('startHistoryId=500');
  });

  test('expired historyId (404) falls back to a full list', async () => {
    routeFetch([
      { match: '/history?', body: { error: 'gone' }, status: 404 },
      { match: '/messages?', body: { messages: [{ id: 'm1' }] } },
      { match: '/profile', body: { historyId: '700' } },
    ]);
    const client = new GmailClient(freshCreds());
    const res = await client.listNewMessages('1', 10);
    expect(res.messageIds).toEqual(['m1']);
    expect(res.nextCursor).toBe('700');
  });

  test('getMessage decodes base64url body + attachment to standard base64', async () => {
    routeFetch([
      {
        match: '/messages/m1?format=full',
        body: {
          id: 'm1',
          internalDate: '1700000000000',
          payload: {
            mimeType: 'multipart/mixed',
            headers: [
              { name: 'From', value: 'sender@x.com' },
              { name: 'To', value: 'a@b.com, c@d.com' },
              { name: 'Subject', value: 'Hello' },
            ],
            parts: [
              { mimeType: 'text/plain', body: { data: b64url('plain body') } },
              { mimeType: 'application/pdf', filename: 'doc.pdf', body: { attachmentId: 'att1', size: 10 } },
            ],
          },
        },
      },
      { match: '/attachments/att1', body: { data: b64url('PDFDATA'), size: 7 } },
    ]);
    const client = new GmailClient(freshCreds());
    const msg = await client.getMessage('m1');
    expect(msg.from).toBe('sender@x.com');
    expect(msg.to).toEqual(['a@b.com', 'c@d.com']);
    expect(msg.subject).toBe('Hello');
    expect(msg.bodyText).toBe('plain body');
    expect(msg.attachments).toHaveLength(1);
    expect(msg.attachments[0].fileName).toBe('doc.pdf');
    // standard base64 decodes back to the original bytes
    expect(Buffer.from(msg.attachments[0].contentBase64, 'base64').toString('utf8')).toBe('PDFDATA');
  });

  test('markProcessed is a no-op unless write is allowed', async () => {
    const fn = routeFetch([{ match: '/modify', body: {} }]);
    const ro = new GmailClient(freshCreds({ allowWrite: false }));
    await ro.markProcessed('m1');
    expect(fn).not.toHaveBeenCalled();

    const rw = new GmailClient(freshCreds({ allowWrite: true }));
    await rw.markProcessed('m1');
    expect(fn).toHaveBeenCalled();
  });
});
