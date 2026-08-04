import { FastifyPluginAsync } from 'fastify';
import { callbackHandler, startHandler } from './handlers';
import { CallbackQuery, StartQuery } from './types';

/**
 * Social sign-up / sign-in (Google, Microsoft) — authorization-code flow.
 *
 *   GET /auth/oauth/:provider/start     browser entry point; carries the chosen
 *                                       role + optional org in the query, packs
 *                                       them into a signed `state`, and redirects
 *                                       to the provider (or serves the simulated
 *                                       consent page when unconfigured).
 *   GET /auth/oauth/:provider/callback  provider redirect target; exchanges the
 *                                       code for identity claims, provisions or
 *                                       signs in the user, and redirects back to
 *                                       the web app with the token in the URL
 *                                       FRAGMENT (fragments never reach server
 *                                       logs or Referer headers).
 *
 * An existing account with the provider's email is signed in rather than
 * rejected — "Register with Google" on an existing email is a sign-in intent,
 * and a duplicate-account error would leak nothing useful anyway since the
 * provider has already verified the address belongs to the requester.
 *
 * See ./README.md for the concern map.
 */
export const oauthRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { provider: string }; Querystring: StartQuery }>(
    '/auth/oauth/:provider/start',
    startHandler,
  );

  app.get<{ Params: { provider: string }; Querystring: CallbackQuery }>(
    '/auth/oauth/:provider/callback',
    callbackHandler,
  );
};

export default oauthRoute;
