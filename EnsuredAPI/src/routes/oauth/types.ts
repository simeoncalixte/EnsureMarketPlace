import { OrganizationLink, SelfServiceRole } from '../../services/auth/provisioning';

export type OAuthState = {
  purpose: 'oauth_state';
  provider: string;
  returnTo: string;
  role: SelfServiceRole | null;
  organization: OrganizationLink | null;
};

export type StartQuery = {
  role?: string;
  redirect?: string;
  invitationCode?: string;
  legalName?: string;
  country?: string;
};

export type CallbackQuery = {
  state?: string;
  code?: string;
  error?: string;
  sim_email?: string;
  sim_name?: string;
};
