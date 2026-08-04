/* eslint-env jest */
import { MicrosoftGraphClient } from './microsoft';
import { MailboxCredentials } from './types';

function freshCreds(overrides: Partial<MailboxCredentials> = {}): MailboxCredentials {
  return {
    provider: 'microsoft',
    clientId: 'mid',
    clientSecret: 'sec',
    refreshToken: 'rt',
    tenantId: 'common',
    accessToken: 'cached-token',
    accessTokenExpiresAt: Date.now() + 3_600_000,
    ...overrides,
  };
}

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

describe('MicrosoftGraphClient', () => {
  afterEach(() => delete (global as any).fetch);

  test('first delta walk stores the deltaLink as cursor', async () => {
    routeFetch([
      {
        match: 'messages/delta',
        body: { value: [{ id: 'g1' }], '@odata.deltaLink': 'https://graph/delta-next?token=abc' },
      },
    ]);
    const client = new MicrosoftGraphClient(freshCreds());
    const res = await client.listNewMessages(null, 10);
    expect(res.messageIds).toEqual(['g1']);
    expect(res.nextCursor).toBe('https://graph/delta-next?token=abc');
  });

  test('incremental list fetches the stored deltaLink URL', async () => {
    const fn = routeFetch([
      { match: 'delta-next', body: { value: [{ id: 'g2' }], '@odata.deltaLink': 'https://graph/delta-2' } },
    ]);
    const client = new MicrosoftGraphClient(freshCreds());
    const res = await client.listNewMessages('https://graph/delta-next?token=abc', 10);
    expect(res.messageIds).toEqual(['g2']);
    expect(res.nextCursor).toBe('https://graph/delta-2');
    expect(String((fn.mock.calls[0] as any)[0])).toContain('delta-next');
  });

  test('expired delta token (410) restarts a fresh delta walk', async () => {
    routeFetch([
      { match: 'stale-delta', body: { error: { code: 'SyncStateNotFound' } }, status: 410 },
      { match: 'messages/delta', body: { value: [{ id: 'g3' }], '@odata.deltaLink': 'https://graph/fresh' } },
    ]);
    const client = new MicrosoftGraphClient(freshCreds());
    const res = await client.listNewMessages('https://graph/stale-delta', 10);
    expect(res.messageIds).toEqual(['g3']);
    expect(res.nextCursor).toBe('https://graph/fresh');
  });

  test('getMessage maps fileAttachment.contentBytes and html body', async () => {
    const contentBytes = Buffer.from('GRAPHDATA', 'utf8').toString('base64');
    routeFetch([
      {
        match: '/messages/g1?$select',
        body: {
          id: 'g1',
          subject: 'Quote',
          from: { emailAddress: { address: 'broker@x.com' } },
          toRecipients: [{ emailAddress: { address: 'a@b.com' } }],
          receivedDateTime: '2026-01-02T03:04:05Z',
          body: { contentType: 'html', content: '<p>hi</p>' },
          hasAttachments: true,
        },
      },
      {
        match: '/messages/g1/attachments',
        body: {
          value: [
            { '@odata.type': '#microsoft.graph.fileAttachment', id: 'a1', name: 'sov.xlsx', contentType: 'application/xlsx', size: 9, contentBytes },
            { '@odata.type': '#microsoft.graph.itemAttachment', id: 'a2', name: 'ignored.msg' },
          ],
        },
      },
    ]);
    const client = new MicrosoftGraphClient(freshCreds());
    const msg = await client.getMessage('g1');
    expect(msg.from).toBe('broker@x.com');
    expect(msg.to).toEqual(['a@b.com']);
    expect(msg.bodyHtml).toBe('<p>hi</p>');
    expect(msg.bodyText).toBeNull();
    // itemAttachment skipped, fileAttachment kept
    expect(msg.attachments).toHaveLength(1);
    expect(msg.attachments[0].fileName).toBe('sov.xlsx');
    expect(Buffer.from(msg.attachments[0].contentBase64, 'base64').toString('utf8')).toBe('GRAPHDATA');
  });

  test('markProcessed PATCHes isRead only when write is allowed', async () => {
    const fn = routeFetch([{ match: '/messages/g1', body: {} }]);
    await new MicrosoftGraphClient(freshCreds({ allowWrite: false })).markProcessed('g1');
    expect(fn).not.toHaveBeenCalled();
    await new MicrosoftGraphClient(freshCreds({ allowWrite: true })).markProcessed('g1');
    expect(fn).toHaveBeenCalled();
    expect((fn.mock.calls[0] as any)[1].method).toBe('PATCH');
  });
});
