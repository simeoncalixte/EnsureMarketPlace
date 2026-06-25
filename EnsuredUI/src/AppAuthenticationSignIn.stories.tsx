import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { reactRouterParameters } from 'storybook-addon-remix-react-router';
import AppRoutes from './AppRoutes';
import { getApiBase } from './lib/api';

const appRouting = {
  path: '/',
  useStoryElement: true,
  children: [{ path: '*' }],
};

const meta: Meta<typeof AppRoutes> = {
  title: 'App/Authentication/SignIn',
  component: AppRoutes,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof AppRoutes>;

/**
 * Stub `window.fetch` so the unauthenticated backend contract is honoured without
 * a live server: `/auth/me` answers 401 (so `HomeRoute`/`SignInRoute` render their
 * signed-out view instead of redirecting to the workspace), and `/auth/login`
 * answers 401 `invalid_credentials`. The auth token is also cleared so a token left
 * in `localStorage` by another story can't flip the session to "authenticated"
 * (which would redirect to `/marketplace` and hide the sign-in entry points).
 */
const withMockedAuthFetch = (Story: React.FC) => {
  // Clear synchronously, before `useAuthMe`'s effect reads the token on mount.
  window.localStorage.removeItem('authToken');

  const original = window.fetch;
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : (input as Request).url);
    if (url.includes('/api/auth/login')) {
      return new Response(JSON.stringify({ error: 'invalid_credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('/api/auth/me')) {
      return new Response(JSON.stringify({ error: 'missing_authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return original(input as any, init);
  }) as typeof window.fetch;

  React.useEffect(() => () => { window.fetch = original; }, []);

  return <Story />;
};

export const Default: Story = {
  decorators: [(StoryFn) => withMockedAuthFetch(StoryFn as React.FC)],
  render: () => <AppRoutes />,
  parameters: {
    reactRouter: reactRouterParameters({
      location: {
        path: '/',
      },
      routing: appRouting,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Unauthenticated (/auth/me → 401), so `/` renders the landing page. It exposes
    // more than one "Sign in" link (top-nav action + footer), so target the first —
    // any of them takes the visitor to the secure-access form.
    const [signIn] = await canvas.findAllByRole('link', { name: /sign in/i });
    await userEvent.click(signIn);

    await expect(await canvas.findByRole('heading', { name: /secure access/i })).toBeInTheDocument();
  },
};

/**
 * Happy path — a freshly registered account signs in successfully.
 *
 * Unlike the mocked stories above, this one talks to the **live API**
 * (`VITE_API_BASE`, default http://localhost:3001) and therefore needs the
 * backend + database running. The play function first provisions a real account
 * with a plain `fetch` to the lean onboarding endpoint the UI itself posts to
 * (`/api/registration/complete`), using a unique email so the story is
 * re-runnable without colliding on `email_already_registered`. It then discards
 * the token that registration issued and drives the sign-in form, proving the
 * credentials authenticate end to end.
 */
export const ValidCredentials: Story = {
  render: () => <AppRoutes />,
  parameters: {
    reactRouter: reactRouterParameters({
      location: {
        path: '/auth/login',
      },
      routing: appRouting,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // A unique account per run — register straight against the API.
    const email = `storybook.signin.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
    const password = 'Storybook!234';

    const registration = await fetch(`${getApiBase()}/api/registration/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selectedRole: 'underwriter',
        email,
        password,
        accountMethod: 'username-password',
        organization: { legalName: 'Storybook Test Co', country: 'US' },
      }),
    });
    await expect(registration.status).toBe(201);

    // Registration hands back a token, but we want to prove the *sign-in form*
    // authenticates — start from a clean, signed-out slate.
    window.localStorage.removeItem('authToken');

    // The sign-in form is shown (no token → /auth/me 401).
    await expect(await canvas.findByRole('heading', { name: /secure access/i })).toBeInTheDocument();

    // Enter the credentials we just registered.
    await userEvent.type(await canvas.findByLabelText(/account identity/i), email);
    await userEvent.type(await canvas.findByLabelText(/access key/i), password);

    await userEvent.click(await canvas.findByRole('button', { name: /initialize session/i }));

    // On success the form saves the token and navigates into the workspace, unmounting
    // the sign-in screen. (On failure `login()` keeps the form mounted and raises the
    // error alert, so the heading disappearing is the unambiguous success signal.)
    await waitFor(() => expect(canvas.queryByRole('heading', { name: /secure access/i })).not.toBeInTheDocument());
    await expect(canvas.queryByRole('alert', { name: /invalid credentials/i })).not.toBeInTheDocument();
  },
};

export const InvalidCredentials: Story = {
  decorators: [(StoryFn) => withMockedAuthFetch(StoryFn as React.FC)],
  render: () => <AppRoutes />,
  parameters: {
    reactRouter: reactRouterParameters({
      location: {
        path: '/auth/login',
      },
      routing: appRouting,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The sign-in form is shown (unauthenticated /auth/me → 401).
    await expect(await canvas.findByRole('heading', { name: /secure access/i })).toBeInTheDocument();

    // Enter credentials the backend will reject.
    await userEvent.type(await canvas.findByLabelText(/account identity/i), 'wrong@example.com');
    await userEvent.type(await canvas.findByLabelText(/access key/i), 'badpassword');

    await userEvent.click(await canvas.findByRole('button', { name: /initialize session/i }));

    // The 401 surfaces as a user-facing alert, not a silent failure.
    const alert = await canvas.findByRole('alert');
    await expect(alert).toHaveTextContent(/invalid credentials/i);
  },
};
