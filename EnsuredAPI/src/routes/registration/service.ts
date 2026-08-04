import { OrganizationLink, SelfServiceRole } from '../../services/auth/provisioning';

export type AccountAccessMethod = 'organization-email' | 'username-password' | 'social';
export type SocialProvider = 'gmail' | 'google' | 'facebook' | 'microsoft';

export type OrganizationInput = {
  invitationCode?: string | null;
  legalName?: string | null;
  country?: string | null;
};

export type RegistrationPayload = {
  selectedRole: SelfServiceRole | 'admin';
  email?: string | null;
  password?: string | null;
  fullName?: string | null;
  accountMethod?: AccountAccessMethod | null;
  socialProvider?: SocialProvider | null;
  organization?: OrganizationInput | null;
  // --- legacy fields tolerated for back-compat; never required, never the
  //     vehicle for collect-then-discard PII. ---
  emailAddress?: string | null;
  organizationName?: string | null;
  organizationReference?: string | null;
  businessDetails?: Record<string, unknown> | null;
};

export const MIN_PASSWORD_LENGTH = 8;

export function resolveEmail(payload: RegistrationPayload): string | null {
  const email = (payload.email ?? payload.emailAddress ?? '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function resolveOrganization(payload: RegistrationPayload): OrganizationLink | null {
  const org = payload.organization ?? {};
  const invitationCode = (org.invitationCode ?? payload.organizationReference ?? '').trim() || null;
  const legalName =
    (org.legalName
      ?? payload.organizationName
      ?? (typeof payload.businessDetails?.legalName === 'string' ? payload.businessDetails.legalName : '')
      ?? '').trim();
  const country = (org.country ?? '').trim() || null;

  if (invitationCode) {
    // Joining an existing org by code — the code is the org reference.
    return { name: `Organization ${invitationCode}`, country, invitationCode };
  }
  if (legalName) {
    return { name: legalName, country, invitationCode: null };
  }
  return null;
}
