import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { reactRouterParameters } from 'storybook-addon-remix-react-router';
import AppRoutes from './AppRoutes';
import { button, click, link, play, role, seeHeading, seePressed } from './test-helpers/play';

// These stories run inside the *real* application routing (AppRoutes), starting
// at "/", so the landing page renders exactly as it does in production
// (PublicAppShell → TopBarNav + LandingPage). Each story clicks one of the
// landing page's relative entry points and asserts it lands on the real
// destination page — /auth/register (Onboarding, "Create your workspace") or
// /auth/login (the sign-in prompt, "Secure Access").
//
// Every `play` is composed from the shared step vocabulary in
// ./test-helpers/play, so adding another landing entry point is a one-liner.
const appRouting = {
  path: '/',
  useStoryElement: true,
  children: [{ path: '*' }],
};

// The destination pages the landing entry points lead to, by their heading.
const REGISTER_HEADING = /create your workspace/i; // Onboarding (/auth/register)
const LOGIN_HEADING = /secure access/i; // AuthPromptPage (/auth/login)

const meta: Meta<typeof AppRoutes> = {
  title: 'App/Landing/Navigation',
  component: AppRoutes,
  parameters: {
    layout: 'fullscreen',
    reactRouter: reactRouterParameters({
      location: { path: '/' },
      routing: appRouting,
    }),
  },
};

export default meta;

type Story = StoryObj<typeof AppRoutes>;

const base: Story = {
  render: () => <AppRoutes />,
};

// "Create your workspace" / "Sign in" appear as buttons in both the hero and the
// closing section; the hero one is first in DOM order (the default match).
export const HeroCreateWorkspaceToRegister: Story = {
  ...base,
  name: 'Hero "Create your workspace" → Register',
  play: play(click(button(/create your workspace/i)), seeHeading(REGISTER_HEADING)),
};

export const HeroSignInToLogin: Story = {
  ...base,
  name: 'Hero "Sign in" → Login',
  play: play(click(button(/^sign in$/i)), seeHeading(LOGIN_HEADING)),
};

// The top navigation bar exposes "Register" / "Sign in" as links (the in-page
// CTAs are buttons), and the top nav is first in the DOM.
export const TopNavRegisterToRegister: Story = {
  ...base,
  name: 'Top nav "Register" → Register',
  play: play(click(link(/^register$/i)), seeHeading(REGISTER_HEADING)),
};

export const TopNavSignInToLogin: Story = {
  ...base,
  name: 'Top nav "Sign in" → Login',
  // The footer also has a "Sign in" link, but the top nav's is first in the DOM.
  play: play(click(link(/^sign in$/i)), seeHeading(LOGIN_HEADING)),
};

// The footer entry points are react-router Links (client-side navigation), like
// the hero/closing CTAs and the top nav, so they actually route within the SPA.
export const FooterCreateWorkspaceToRegister: Story = {
  ...base,
  name: 'Footer "Create your workspace" → Register',
  // "Create your workspace" is a link only in the footer (in-page CTAs are buttons).
  play: play(click(link(/create your workspace/i)), seeHeading(REGISTER_HEADING)),
};

export const FooterSignInToLogin: Story = {
  ...base,
  name: 'Footer "Sign in" → Login',
  // The footer "Sign in" link is the last "Sign in" link in the DOM (the top nav has the first).
  play: play(click(link(/^sign in$/i, 'last')), seeHeading(LOGIN_HEADING)),
};

// "Pick your side of the desk" — each role card (a role="button" SelectionCard)
// must carry the chosen role into registration via `?role=`, so the matching
// role tile arrives pre-selected (aria-pressed="true") on the Onboarding page.
// Each story: click the landing role card → land on registration → assert the
// corresponding Onboarding role tile is already selected.
export const RoleCardInsurerPreselectsInsurer: Story = {
  ...base,
  name: 'Role card "Insurers & MGAs" → Register (Insurer preselected)',
  play: play(
    click(role('button', /insurers & mgas/i)),
    seeHeading(REGISTER_HEADING),
    seePressed(/insurer \/ mga/i),
  ),
};

export const RoleCardBrokerPreselectsBroker: Story = {
  ...base,
  name: 'Role card "Brokers" → Register (Broker preselected)',
  play: play(
    click(role('button', /brokers/i)),
    seeHeading(REGISTER_HEADING),
    seePressed(/^broker\b/i),
  ),
};

export const RoleCardUnderwriterPreselectsUnderwriter: Story = {
  ...base,
  name: 'Role card "Underwriters" → Register (Underwriter preselected)',
  play: play(
    click(role('button', /underwriters/i)),
    seeHeading(REGISTER_HEADING),
    seePressed(/underwriter/i),
  ),
};

// The landing page labels capital providers "investor"; Onboarding calls the
// role "institutional". This verifies that alias is mapped on the way in.
export const RoleCardCapitalProviderPreselectsInstitutional: Story = {
  ...base,
  name: 'Role card "Capital providers" → Register (Capital provider preselected)',
  play: play(
    click(role('button', /capital providers/i)),
    seeHeading(REGISTER_HEADING),
    seePressed(/capital provider/i),
  ),
};
