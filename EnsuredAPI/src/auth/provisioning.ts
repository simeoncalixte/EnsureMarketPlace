import jwt from 'jsonwebtoken';
import { getSequelize } from '../config/database';
import { InvestorProfile, Organization, Subscription, User } from '../db/models';
import { getPlanForRole } from '../billing/plans';

/**
 * Account provisioning shared by every signup entry point.
 *
 * `POST /registration/complete` (email + password) and the OAuth callback
 * (Google / Microsoft) both end in the same place: a User, an optional
 * Organization link, an investor profile when applicable, and a trialing
 * Subscription — all in one transaction. This module owns that sequence so the
 * two entry points cannot drift apart (see ../routes/registration.ts for the
 * onboarding philosophy: acquire first, defer compliance and payment).
 */

export type SelfServiceRole = 'institutional' | 'insurer' | 'underwriter' | 'claims' | 'broker';

/** Roles a member of the public may self-register as — `admin` is excluded by design (#35). */
export const SELF_SERVICE_ROLES: readonly SelfServiceRole[] = [
  'institutional',
  'insurer',
  'underwriter',
  'claims',
  'broker',
];

export const roleMap: Record<SelfServiceRole, 'investor' | 'insurer' | 'analyst'> = {
  institutional: 'investor',
  insurer: 'insurer',
  underwriter: 'analyst',
  claims: 'analyst',
  broker: 'analyst',
};

export const organizationTypeByRole: Record<SelfServiceRole, 'investor_fund' | 'insurer'> = {
  institutional: 'investor_fund',
  insurer: 'insurer',
  underwriter: 'insurer',
  claims: 'insurer',
  broker: 'insurer',
};

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';
const TRIAL_DAYS = 14;

export function splitFullName(fullName: string | null | undefined, emailLocal: string): { firstName: string; lastName: string } {
  const parts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: emailLocal || 'New', lastName: 'Member' };
  if (parts.length === 1) return { firstName: parts[0], lastName: 'Member' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function signUserToken(user: User): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
    },
    JWT_SECRET,
  );
}

export type OrganizationLink = {
  name: string;
  country: string | null;
  invitationCode: string | null;
};

export type ProvisionInput = {
  role: SelfServiceRole;
  /** Already normalized (trimmed, lowercased) and validated by the caller. */
  email: string;
  /** A real scrypt hash — for social accounts, a hash of a random unusable secret. */
  passwordHash: string;
  fullName?: string | null;
  organization?: OrganizationLink | null;
};

export type ProvisionResult = {
  user: User;
  investorProfileId: number | null;
  trial: { planCode: string; status: string; currentPeriodEnd: Date } | null;
};

export async function provisionAccount(input: ProvisionInput): Promise<ProvisionResult> {
  const { role, email, passwordHash, fullName, organization: org } = input;

  const sequelize = getSequelize();
  return sequelize.transaction(async (transaction) => {
    let organizationId: number | null = null;
    if (org) {
      let organization = await Organization.findOne({ where: { name: org.name }, transaction });
      if (!organization) {
        organization = await Organization.create(
          {
            name: org.name,
            type: organizationTypeByRole[role],
            // Onboarding metadata lives here (no dedicated column); keeps
            // "legal name + country" persisted instead of collected-and-dropped.
            submissionBoardConfig: org.country || org.invitationCode
              ? { onboarding: { country: org.country, invitationCode: org.invitationCode } }
              : null,
          },
          { transaction },
        );
      }
      organizationId = organization.id;
    }

    const emailLocal = email.split('@')[0];
    const { firstName, lastName } = splitFullName(fullName, emailLocal);
    const createdUser = await User.create(
      {
        organizationId,
        email,
        passwordHash,
        role: roleMap[role],
        firstName,
        lastName,
        isActive: true,
      },
      { transaction },
    );

    // Investors get a profile with KYC PENDING — verification is deferred to the
    // transaction gate (deploy-capital), not demanded at signup.
    let investorProfileId: number | null = null;
    if (roleMap[role] === 'investor') {
      const investorProfile = await InvestorProfile.create(
        {
          userId: createdUser.id,
          accreditationStatus: 'pending',
          kycStatus: 'pending',
          riskPreferences: null,
        },
        { transaction },
      );
      investorProfileId = investorProfile.id;
    }

    // --- #40: start a trial instead of charging up front --------------------
    let trial: { planCode: string; status: string; currentPeriodEnd: Date } | null = null;
    const plan = getPlanForRole(role);
    if (plan) {
      const currentPeriodEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      await Subscription.create(
        {
          userId: createdUser.id,
          organizationId,
          planCode: plan.code,
          role,
          billingInterval: 'monthly',
          amountCents: plan.pricing.monthly,
          currency: plan.currency,
          status: 'trialing',
          provider: 'simulated',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          currentPeriodEnd,
        },
        { transaction },
      );
      trial = { planCode: plan.code, status: 'trialing', currentPeriodEnd };
    }

    return { user: createdUser, investorProfileId, trial };
  });
}
