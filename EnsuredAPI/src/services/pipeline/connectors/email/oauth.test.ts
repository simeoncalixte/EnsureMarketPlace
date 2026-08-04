/* eslint-env jest */
import {
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  encodeState,
  decodeState,
  resolveScopes,
} from './oauth';
import { ReauthRequiredError } from './types';

function mockFetchOnce(status: number, body: any) {
  (global as any).fetch = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'x',
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }));
}

describe('email oauth helpers', () => {
  afterEach(() => {
    delete (global as any).fetch;
  });

  test('buildAuthorizeUrl (google) requests offline access + consent', () => {
    const url = buildAuthorizeUrl({
      provider: 'google',
      clientId: 'gid',
      redirectUri: 'https://app/cb',
      scopes: resolveScopes('google', false),
      state: 'st',
    });
    expect(url).toContain('accounts.google.com');
    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');
    expect(url).toContain('client_id=gid');
    expect(decodeURIComponent(url)).toContain('gmail.readonly');
  });

  test('buildAuthorizeUrl (microsoft) carries tenant + offline_access + Mail.Read', () => {
    const url = buildAuthorizeUrl({
      provider: 'microsoft',
      clientId: 'mid',
      redirectUri: 'https://app/cb',
      scopes: resolveScopes('microsoft', false, undefined, 'mytenant'),
      state: 'st',
      tenantId: 'mytenant',
    });
    expect(url).toContain('login.microsoftonline.com/mytenant/oauth2/v2.0/authorize');
    expect(url).toContain('response_mode=query');
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('offline_access');
    expect(decoded).toContain('Mail.Read');
  });

  test('resolveScopes returns write scopes when allowWrite', () => {
    expect(resolveScopes('google', true).join(' ')).toContain('gmail.modify');
    expect(resolveScopes('microsoft', true).join(' ')).toContain('Mail.ReadWrite');
  });

  test('exchangeCodeForTokens parses tokens', async () => {
    mockFetchOnce(200, { access_token: 'at', refresh_token: 'rt', expires_in: 3599 });
    const res = await exchangeCodeForTokens({
      provider: 'google',
      clientId: 'gid',
      clientSecret: 'sec',
      code: 'code',
      redirectUri: 'https://app/cb',
    });
    expect(res).toEqual({ refreshToken: 'rt', accessToken: 'at', expiresIn: 3599, scope: undefined });
  });

  test('exchangeCodeForTokens maps invalid_grant to ReauthRequiredError', async () => {
    mockFetchOnce(400, { error: 'invalid_grant', error_description: 'expired' });
    await expect(
      exchangeCodeForTokens({ provider: 'google', clientId: 'g', clientSecret: 's', code: 'c', redirectUri: 'r' }),
    ).rejects.toBeInstanceOf(ReauthRequiredError);
  });

  test('refreshAccessToken posts refresh grant and surfaces a rotated token', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify({ access_token: 'at2', expires_in: 1000, refresh_token: 'rotated' }),
    }));
    (global as any).fetch = fetchMock;
    const res = await refreshAccessToken({
      provider: 'microsoft',
      clientId: 'mid',
      clientSecret: 'sec',
      refreshToken: 'old',
      tenantId: 'common',
      scopes: ['offline_access', 'Mail.Read'],
    });
    expect(res.accessToken).toBe('at2');
    expect(res.refreshToken).toBe('rotated');
    const body = String((fetchMock.mock.calls[0] as any)[1].body);
    expect(body).toContain('grant_type=refresh_token');
    expect(body).toContain('refresh_token=old');
  });

  test('state round-trips channelId', () => {
    const state = encodeState({ channelId: 42, nonce: 'c42', ts: 123 });
    expect(decodeState(state)).toEqual({ channelId: 42, nonce: 'c42', ts: 123 });
    expect(decodeState('not-valid')).toBeNull();
  });
});
