# `oauth` route

Social sign-up / sign-in (Google, Microsoft) via the OAuth authorization-code
flow, with a simulated-consent fallback when no provider credentials are
configured. Owns minting the signed `state`, exchanging the code for identity
claims, and provisioning-or-signing-in the resulting user.

## Endpoints

| Method & path                          | Purpose                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `GET /auth/oauth/:provider/start`      | Pack role/org into a signed `state` and redirect to the provider (or serve the simulated page).  |
| `GET /auth/oauth/:provider/callback`   | Exchange the code for claims, provision/sign-in, redirect back with the token in the URL fragment. |

An existing account with the provider's email is signed in rather than rejected.

## Files

| File          | Concern                                                                       |
| ------------- | ----------------------------------------------------------------------------- |
| `index.ts`    | Fastify plugin wiring + public exports.                                       |
| `handlers.ts` | The `start` and `callback` request handlers.                                  |
| `service.ts`  | State signing/verification, redirect-target hardening, org/return-to helpers. |
| `types.ts`    | Local `OAuthState`, `StartQuery`, `CallbackQuery` types.                       |
| `oauth.test.ts` | Simulated-provider integration coverage of the start + callback flow.       |

## Related

- `../../auth/oauthProviders` — provider config, authorize-URL builder, code exchange, simulated consent page.
- `../../auth/provisioning` — `provisionAccount`, `signUserToken`, self-service role list (shared with registration).
- `../../auth/password` — scrypt `hashPassword` for the unusable social-account secret.
- Registered in `../../app.ts` as `oauthRoute` under the `/api` prefix.
