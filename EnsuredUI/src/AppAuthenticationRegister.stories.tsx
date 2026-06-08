import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, waitFor, within } from '@storybook/test'
import { Route, Routes } from 'react-router'
import { reactRouterParameters } from 'storybook-addon-remix-react-router'
import AccountAccess from './Pages/Registration/AccountAccess'
import CapitalProfile from './Pages/Registration/CapitalProfile'
import KYCVerification from './Pages/Registration/KYCVerification'
import OrganizationStructure from './Pages/Registration/OrganizationStructure'
import RoleSelection from './Pages/Registration/RoleSelection'
import SubscriptionPlan from './Pages/Registration/SubscriptionPlan'

const StorySurface: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ background: '#071129', minHeight: '100vh' }}>{children}</div>
)

const RegistrationFlowApp = () => (
  <Routes>
    <Route path="/auth/register" element={<StorySurface><RoleSelection /></StorySurface>} />
    <Route path="/auth/register/kyc" element={<StorySurface><KYCVerification /></StorySurface>} />
    <Route path="/auth/register/organization-structure" element={<StorySurface><OrganizationStructure /></StorySurface>} />
    <Route path="/auth/register/account-access" element={<StorySurface><AccountAccess /></StorySurface>} />
    <Route path="/auth/register/capital-profile" element={<StorySurface><CapitalProfile /></StorySurface>} />
    <Route path="/auth/register/subscription" element={<StorySurface><SubscriptionPlan /></StorySurface>} />
  </Routes>
)

const meta: Meta<typeof RegistrationFlowApp> = {
  title: 'App/Authentication/Register',
  component: RegistrationFlowApp,
  parameters: {
    layout: 'fullscreen',
    reactRouter: reactRouterParameters({
      location: {
        path: '/auth/register',
      },
      routing: {
        path: '/',
        useStoryElement: true,
        children: [{ path: '*' }],
      },
    }),
  },
}

export default meta

type Story = StoryObj<typeof RegistrationFlowApp>

async function makeFixtureFile(fileName: string, type: string): Promise<File> {
  const fixturePathMap: Record<string, URL> = {
    'government-id.txt': new URL('./Pages/Registration/fixtures/government-id.txt', import.meta.url),
    'proof-of-address.txt': new URL('./Pages/Registration/fixtures/proof-of-address.txt', import.meta.url),
    'compliance-packet.txt': new URL('./Pages/Registration/fixtures/compliance-packet.txt', import.meta.url),
  };

  const url = fixturePathMap[fileName] ?? fixturePathMap['compliance-packet.txt'];
  const content = await fetch(url).then((response) => response.text());
  return new File([content], fileName, { type });
}

type RegistrationApproach = 'invitation-code' | 'request-access' | 'business-details'
type AccountAccessMethod = 'organization-email' | 'username-password' | 'social'
type SocialProvider = 'gmail' | 'facebook' | 'microsoft'

const socialProviderLabel: Record<SocialProvider, string> = {
  gmail: 'Gmail',
  facebook: 'Facebook',
  microsoft: 'Microsoft',
}

function makeUniqueSeed(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

function configureRegistrationApiBase(): void {
  if (typeof window !== 'undefined') {
    const runtimeWindow = window as Window & { __VITE_API_BASE?: string }
    runtimeWindow.__VITE_API_BASE = 'http://localhost:3001'
  }
}

function seedRegistrationSessionForFlow(options: {
  selectedRole: 'institutional' | 'insurer' | 'underwriter' | 'claims' | 'broker' | 'admin'
  registrationApproach: RegistrationApproach
  accountMethod: AccountAccessMethod
  socialProvider?: SocialProvider
  uniqueSeed: string
}): void {
  if (typeof window === 'undefined') {
    return
  }

  const session = {
    selectedRole: options.selectedRole,
    currentStep: 'kyc',
    registrationApproach: options.registrationApproach,
    accountMethod: options.accountMethod,
    socialProvider: options.socialProvider,
    organizationName: options.registrationApproach === 'business-details' ? `Atlantic Risk Holdings LLC ${options.uniqueSeed}` : null,
    organizationReference:
      options.registrationApproach === 'invitation-code'
        ? `ORG-84A1-3XQ7-${options.uniqueSeed}`
        : `ATLAS-RISK-COLLECTIVE-${options.uniqueSeed}`,
    organizationEmail: options.accountMethod === 'organization-email' ? `registration+${options.uniqueSeed}@atlas-risk.test` : null,
    username: options.accountMethod === 'username-password' ? `atlantic.admin.${options.uniqueSeed.replace(/[^a-zA-Z0-9]/g, '')}` : null,
    businessDetails: options.registrationApproach === 'business-details'
      ? {
          legalName: `Atlantic Risk Holdings LLC ${options.uniqueSeed}`,
          registrationNumber: 'ARH-2026-001',
          registeredAddress: '101 Harbor View, New York, NY 10001, USA',
        }
      : null,
    updatedAt: new Date().toISOString(),
  }

  window.localStorage.setItem('registrationSession', JSON.stringify(session))
}

async function expectBackendRegistrationRecorded(): Promise<void> {
  if (typeof window === 'undefined') {
    return
  }

  await waitFor(() => {
    const session = JSON.parse(window.localStorage.getItem('registrationSession') ?? '{}') as {
      backendRegistrationId?: string
      backendUserId?: number
      backendPersistedAt?: string
    }

    expect(session.backendRegistrationId).toEqual(expect.any(String))
    expect(session.backendUserId).toEqual(expect.any(Number))
    expect(session.backendPersistedAt).toEqual(expect.any(String))
  }, { timeout: 10000 })
}

async function completeSubscriptionPayment(
  canvas: ReturnType<typeof within>,
  options: { isFreePlan: boolean },
): Promise<void> {
  await expect(
    await canvas.findByRole('heading', { name: /activate your membership/i }, { timeout: 15000 }),
  ).toBeInTheDocument()

  if (!options.isFreePlan) {
    // Wait for the plan to load (the card form only renders once a paid plan resolves),
    // then submit Stripe's canonical test card 4242 4242 4242 4242.
    await userEvent.type(await canvas.findByLabelText(/card number/i, {}, { timeout: 15000 }), '4242424242424242')
    await userEvent.type(await canvas.findByLabelText(/name on card/i), 'Morgan Riskwell')
    await userEvent.type(await canvas.findByLabelText(/expiry/i), '04/27')
    await userEvent.type(await canvas.findByLabelText(/cvc/i), '123')
  }

  await userEvent.click(await canvas.findByRole('button', { name: /activate membership/i }))

  // The backend (simulated Stripe in CI, real Stripe when keyed) confirms the charge.
  await expect(await canvas.findByText(/payment received/i, {}, { timeout: 15000 })).toBeInTheDocument()
  await expect(await canvas.findByText(/subscription active/i)).toBeInTheDocument()
}

async function completeKycForm(canvas: ReturnType<typeof within>): Promise<void> {
  const uniqueSeed = makeUniqueSeed()
  await userEvent.type(await canvas.findByLabelText(/legal full name/i), `Morgan Riskwell ${uniqueSeed.slice(-6)}`);
  await userEvent.type(await canvas.findByLabelText(/date of birth/i), '1986-04-19');
  await userEvent.type(await canvas.findByLabelText(/nationality \/ citizenship/i), 'United States');
  await userEvent.type(await canvas.findByLabelText(/residential address/i), '101 Harbor View, New York, NY 10001, USA');
  await userEvent.type(await canvas.findByLabelText(/phone number/i), '+1 555 010 3344');
  const uniqueEmail = `morgan.riskwell+${uniqueSeed}@sovereignre.test`
  await userEvent.type(await canvas.findByLabelText(/email address/i), uniqueEmail);

  const uploadInputs = await canvas.findAllByLabelText(/^upload /i);
  const fixtureFiles = await Promise.all([
    makeFixtureFile('government-id.txt', 'text/plain'),
    makeFixtureFile('proof-of-address.txt', 'text/plain'),
    makeFixtureFile('compliance-packet.txt', 'text/plain'),
  ]);

  for (let index = 0; index < uploadInputs.length; index += 1) {
    const fixture = fixtureFiles[index % fixtureFiles.length];
    await userEvent.upload(uploadInputs[index] as HTMLInputElement, fixture);
  }

  await userEvent.click(await canvas.findByRole('button', { name: /start camera|camera verified/i }));
  await userEvent.click(await canvas.findByRole('button', { name: /proceed to capital profiling/i }));
}

async function completeOrganizationStructure(canvas: ReturnType<typeof within>, approach: RegistrationApproach): Promise<void> {
  await expect(
    await canvas.findByRole('heading', { name: /organization structure/i }, { timeout: 10000 }),
  ).toBeInTheDocument();

  if (approach === 'invitation-code') {
    await userEvent.click(await canvas.findByRole('button', { name: /use invitation code/i }));
    await userEvent.type(await canvas.findByLabelText(/^invitation code$/i), 'ORG-84A1-3XQ7');
    await userEvent.click(await canvas.findByRole('button', { name: /link organization/i }));
  }

  if (approach === 'request-access') {
    await userEvent.click(await canvas.findByRole('button', { name: /request access to an open organization/i }));
    await userEvent.click(await canvas.findByRole('button', { name: /atlas risk collective/i }));
  }

  if (approach === 'business-details') {
    await userEvent.click(await canvas.findByRole('button', { name: /register with business details/i }));
    await userEvent.type(await canvas.findByLabelText(/business legal name/i), 'Atlantic Risk Holdings LLC');
    await userEvent.type(await canvas.findByLabelText(/registration number/i), 'ARH-2026-001');
    await userEvent.type(await canvas.findByLabelText(/registered business address/i), '101 Harbor View, New York, NY 10001, USA');
    await userEvent.type(await canvas.findByLabelText(/business contact email/i), 'ops@atlanticrisk.test');
  }

  await userEvent.click(await canvas.findByRole('button', { name: /continue to account access/i }));
  await expect(await canvas.findByRole('heading', { name: /account access/i })).toBeInTheDocument();
}

async function completeAccountAccess(
  canvas: ReturnType<typeof within>,
  method: AccountAccessMethod,
  socialProvider: SocialProvider = 'gmail',
): Promise<string> {
  await expect(
    await canvas.findByRole('heading', { name: /account access/i }, { timeout: 10000 }),
  ).toBeInTheDocument();

  if (method === 'organization-email') {
    const organizationEmail = 'registration@atlas-risk.test';
    await userEvent.click(await canvas.findByRole('button', { name: /connect organization email/i }));
    await userEvent.type(await canvas.findByLabelText(/organization email address/i), organizationEmail);
    await userEvent.click(await canvas.findByRole('button', { name: /connect email and continue/i }));
    return organizationEmail;
  }

  if (method === 'social') {
    await userEvent.click(await canvas.findByRole('button', { name: /sign up with gmail, facebook, or microsoft/i }));
    await userEvent.click(await canvas.findByRole('button', { name: new RegExp(`sign up with ${socialProvider}`, 'i') }));
    await userEvent.click(await canvas.findByRole('button', { name: new RegExp(`continue with ${socialProvider}`, 'i') }));
    return socialProviderLabel[socialProvider];
  }

  const username = 'atlantic.admin';
  await userEvent.click(await canvas.findByRole('button', { name: /sign up with username and password/i }));
  await userEvent.type(await canvas.findByLabelText(/^username$/i), username);
  await userEvent.type(await canvas.findByLabelText(/^password$/i), 'password123');
  await userEvent.type(await canvas.findByLabelText(/confirm password/i), 'password123');
  await userEvent.click(await canvas.findByRole('button', { name: /create account and continue/i }));
  return username;
}

async function expectCapitalProfileApproach(
  canvas: ReturnType<typeof within>,
  approach: RegistrationApproach,
  accountMethod: AccountAccessMethod,
  accountValue: string,
  socialProvider?: SocialProvider,
): Promise<void> {
  const expectedLabel =
    approach === 'invitation-code'
      ? /linked by invitation code/i
      : approach === 'request-access'
        ? /requested access/i
        : /business details saved/i;

  await expect(
    await canvas.findByRole('heading', { name: /capital profile/i }, { timeout: 10000 }),
  ).toBeInTheDocument();
  await expect(await canvas.findByText(expectedLabel)).toBeInTheDocument();
  if (accountMethod === 'social') {
    await expect(await canvas.findByText(/social sign-up/i)).toBeInTheDocument();
    if (socialProvider) {
      await expect(await canvas.findByText(socialProviderLabel[socialProvider])).toBeInTheDocument();
    }
  }
  await expect(
    await canvas.findByText(
      accountMethod === 'organization-email'
        ? /connected organization email/i
        : accountMethod === 'social'
          ? /social sign-up/i
          : /username\/password account/i,
    ),
  ).toBeInTheDocument();
  await expect(await canvas.findByText(accountValue)).toBeInTheDocument();
}

// Drives role selection → KYC and stops once the backend has recorded the user,
// leaving the flow parked on the subscription paywall (the next step).
async function runRegisterToSubscription(
  canvasElement: HTMLElement,
  selectedRole: 'institutional' | 'insurer' | 'underwriter' | 'claims' | 'broker' | 'admin',
  roleHeading: RegExp,
  approach: RegistrationApproach,
  accountMethodOverride?: AccountAccessMethod,
  socialProvider: SocialProvider = 'gmail',
): Promise<ReturnType<typeof within>> {
  const canvas = within(canvasElement);
  configureRegistrationApiBase()
  const uniqueSeed = makeUniqueSeed()
  const accountMethod: AccountAccessMethod = accountMethodOverride ?? (approach === 'business-details' ? 'username-password' : 'organization-email')
  seedRegistrationSessionForFlow({
    selectedRole,
    registrationApproach: approach,
    accountMethod,
    socialProvider: accountMethod === 'social' ? socialProvider : undefined,
    uniqueSeed,
  })

  await expect(await canvas.findByRole('heading', { name: /define your role in the capital stack/i })).toBeInTheDocument();

  await userEvent.click(await canvas.findByRole('heading', { name: roleHeading }));
  await userEvent.click(await canvas.findByRole('button', { name: /continue/i }));

  await expect(
    await canvas.findByRole('heading', { name: /identity verification/i }, { timeout: 10000 }),
  ).toBeInTheDocument();
  await expect(await canvas.findByText(/to ensure the integrity of the sovereign re ecosystem/i)).toBeInTheDocument();

  await completeKycForm(canvas);
  await expectBackendRegistrationRecorded()
  return canvas
}

async function runRegisterSelectionFlow(
  canvasElement: HTMLElement,
  selectedRole: 'institutional' | 'insurer' | 'underwriter' | 'claims' | 'broker' | 'admin',
  roleHeading: RegExp,
  approach: RegistrationApproach,
  accountMethodOverride?: AccountAccessMethod,
  socialProvider: SocialProvider = 'gmail',
): Promise<void> {
  const canvas = await runRegisterToSubscription(
    canvasElement,
    selectedRole,
    roleHeading,
    approach,
    accountMethodOverride,
    socialProvider,
  )

  // Registration now ends at the subscription paywall — submit the membership fee.
  await completeSubscriptionPayment(canvas, { isFreePlan: selectedRole === 'admin' })
}

export const Default: Story = {
  render: () => <RegistrationFlowApp />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', { name: /define your role in the capital stack/i })).toBeInTheDocument();
  },
};

export const SelectUnderwriterAndContinue: Story = {
  ...Default,
  name: 'Register as "Underwriter" via Invitation Code',
  play: async ({ canvasElement }) => {
    await runRegisterSelectionFlow(canvasElement, 'underwriter', /underwriter/i, 'invitation-code');
  },
};

export const SelectInstitutionalInvestorAndContinue: Story = {
  ...Default,
  name: 'Register as "Institutional Investor" with Business Details',
  play: async ({ canvasElement }) => {
    await runRegisterSelectionFlow(canvasElement, 'institutional', /institutional investor/i, 'business-details');
  },
};

export const SelectInsurerAndContinue: Story = {
  ...Default,
  name: 'Register as "Insurer / MGA" via Request Access',
  play: async ({ canvasElement }) => {
    await runRegisterSelectionFlow(canvasElement, 'insurer', /insurer \/ mga/i, 'request-access');
  },
};

export const SelectInsurerAndContinueViaMicrosoft: Story = {
  ...Default,
  name: 'Register as "Insurer / MGA" via Microsoft Social Sign-Up',
  play: async ({ canvasElement }) => {
    await runRegisterSelectionFlow(canvasElement, 'insurer', /insurer \/ mga/i, 'request-access', 'social', 'microsoft');
  },
};

export const SelectClaimsAndContinue: Story = {
  ...Default,
  name: 'Register as "Claims Handler" via Request Access',
  play: async ({ canvasElement }) => {
    await runRegisterSelectionFlow(canvasElement, 'claims', /claims handler/i, 'request-access');
  },
};

export const SelectBrokerAndContinue: Story = {
  ...Default,
  name: 'Register as "Broker / Distribution" via Invitation Code',
  play: async ({ canvasElement }) => {
    await runRegisterSelectionFlow(canvasElement, 'broker', /broker \/ distribution/i, 'invitation-code');
  },
};

export const SelectAdminAndContinue: Story = {
  ...Default,
  name: 'Register as "Platform Admin" with Business Details',
  play: async ({ canvasElement }) => {
    await runRegisterSelectionFlow(canvasElement, 'admin', /platform admin/i, 'business-details');
  },
};

export const SubscriptionPaymentDeclinedThenRetried: Story = {
  ...Default,
  name: 'Subscription Payment — Declined Card, Then Successful Retry',
  play: async ({ canvasElement }) => {
    const canvas = await runRegisterToSubscription(
      canvasElement,
      'institutional',
      /institutional investor/i,
      'business-details',
    );

    await expect(
      await canvas.findByRole('heading', { name: /activate your membership/i }, { timeout: 15000 }),
    ).toBeInTheDocument();

    // First attempt with Stripe's decline test card 4000 0000 0000 0002 → rejected.
    await userEvent.type(await canvas.findByLabelText(/card number/i, {}, { timeout: 15000 }), '4000000000000002');
    await userEvent.type(await canvas.findByLabelText(/name on card/i), 'Morgan Riskwell');
    await userEvent.type(await canvas.findByLabelText(/expiry/i), '04/27');
    await userEvent.type(await canvas.findByLabelText(/cvc/i), '123');
    await userEvent.click(await canvas.findByRole('button', { name: /activate membership/i }));

    await expect(await canvas.findByText(/declined/i, {}, { timeout: 15000 })).toBeInTheDocument();

    // Retry with the good test card → subscription activates.
    const cardNumberInput = (await canvas.findByLabelText(/card number/i)) as HTMLInputElement;
    await userEvent.clear(cardNumberInput);
    await userEvent.type(cardNumberInput, '4242424242424242');
    await userEvent.click(await canvas.findByRole('button', { name: /activate membership/i }));

    await expect(await canvas.findByText(/payment received/i, {}, { timeout: 15000 })).toBeInTheDocument();
  },
};