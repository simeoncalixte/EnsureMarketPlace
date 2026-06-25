import crypto from 'crypto';
import { Op } from 'sequelize';
import { Organization, User } from '../db/models/identity.models';

/**
 * Distribution partners are reused Organization / User rows:
 *   - a partner organization is an Organization with `type='partner'`
 *   - a partner contact is a User with `role='partner'`
 * Both are created as unclaimed "stubs" by another org (the creator), carry a
 * `claimToken`, and become claimed (`claimedAt` set) when the real partner joins.
 *
 * Because org ids and user ids can collide, a partner is addressed by an opaque
 * prefixed value: `org:<id>` or `user:<id>`. That string is what the Distribution
 * approved/restricted lists store.
 */

export type PartnerKind = 'organization' | 'user';

export type PartnerItem = {
  value: string; // 'org:<id>' | 'user:<id>'
  label: string;
  kind: PartnerKind;
  claimed: boolean;
};

export type CreatePartnerInput = {
  kind: PartnerKind;
  name: string;
  email?: string;
};

function newToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Partner', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function orgLabel(o: Organization): string {
  return `${o.name} (Partner Org)${o.claimedAt ? ' — claimed' : ''}`;
}

function userLabel(u: User): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email;
  return `${name} (Partner)${u.claimedAt ? ' — claimed' : ''}`;
}

export class PartnerService {
  /** Combined list of partner orgs + users created by `organizationId`. */
  async list(organizationId: number): Promise<PartnerItem[]> {
    const [orgs, users] = await Promise.all([
      Organization.findAll({
        where: { type: 'partner', createdByOrganizationId: organizationId },
        order: [['name', 'ASC']],
      }),
      User.findAll({
        where: { role: 'partner', createdByOrganizationId: organizationId },
        order: [['firstName', 'ASC'], ['lastName', 'ASC']],
      }),
    ]);

    return [
      ...orgs.map((o) => ({
        value: `org:${o.id}`,
        label: orgLabel(o),
        kind: 'organization' as const,
        claimed: o.claimedAt != null,
      })),
      ...users.map((u) => ({
        value: `user:${u.id}`,
        label: userLabel(u),
        kind: 'user' as const,
        claimed: u.claimedAt != null,
      })),
    ];
  }

  /** Create a partner stub (org or user) with default info + a claim token. */
  async create(organizationId: number, input: CreatePartnerInput): Promise<PartnerItem> {
    const name = input.name.trim();
    if (!name) throw new Error('name_required');
    const claimToken = newToken();

    if (input.kind === 'organization') {
      const org = await Organization.create({
        name,
        type: 'partner',
        submissionBoardConfig: null,
        claimToken,
        claimedAt: null,
        createdByOrganizationId: organizationId,
      });
      return { value: `org:${org.id}`, label: orgLabel(org), kind: 'organization', claimed: false };
    }

    const { firstName, lastName } = splitName(name);
    // Placeholder email when none given — unique via the claim token, since the
    // stub can't authenticate until claimed (empty password hash, inactive).
    const email = input.email?.trim() || `partner+${claimToken.slice(0, 16)}@unclaimed.local`;
    const user = await User.create({
      organizationId: null,
      email,
      passwordHash: '',
      role: 'partner',
      firstName,
      lastName,
      isActive: false,
      claimToken,
      claimedAt: null,
      createdByOrganizationId: organizationId,
    });
    return { value: `user:${user.id}`, label: userLabel(user), kind: 'user', claimed: false };
  }

  /** Remove a partner stub the given org created. */
  async remove(organizationId: number, value: string): Promise<void> {
    const parsed = parsePartnerValue(value);
    if (!parsed) throw new Error('invalid_partner_value');
    if (parsed.kind === 'organization') {
      await Organization.destroy({ where: { id: parsed.id, type: 'partner', createdByOrganizationId: organizationId } });
    } else {
      await User.destroy({ where: { id: parsed.id, role: 'partner', createdByOrganizationId: organizationId } });
    }
  }

  /**
   * Claim a partner stub by token. Foundation-only: marks the account claimed and
   * returns a summary. Wiring the claimant's identity (password, login) is a
   * deferred follow-up.
   */
  async claim(token: string): Promise<{ kind: PartnerKind; id: number; name: string } | null> {
    const t = token.trim();
    if (!t) return null;
    const now = new Date();

    const org = await Organization.findOne({ where: { claimToken: t, type: 'partner', claimedAt: { [Op.is]: null } } });
    if (org) {
      org.claimedAt = now;
      await org.save();
      return { kind: 'organization', id: org.id, name: org.name };
    }

    const user = await User.findOne({ where: { claimToken: t, role: 'partner', claimedAt: { [Op.is]: null } } });
    if (user) {
      user.claimedAt = now;
      await user.save();
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email;
      return { kind: 'user', id: user.id, name };
    }

    return null;
  }
}

export function parsePartnerValue(value: string): { kind: PartnerKind; id: number } | null {
  const m = /^(org|user):(\d+)$/.exec(value.trim());
  if (!m) return null;
  return { kind: m[1] === 'org' ? 'organization' : 'user', id: Number(m[2]) };
}

export const partnerService = new PartnerService();
