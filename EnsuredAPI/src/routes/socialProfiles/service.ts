import { Op } from 'sequelize';
import { Organization, User } from '../../db/models/identity.models';
import { UserProfile } from '../../db/models/social.models';
import { ProfileSummary } from './types';

export async function profileSummariesFor(users: User[]): Promise<ProfileSummary[]> {
  const userIds = users.map((u) => u.id);
  const orgIds = [...new Set(users.map((u) => u.organizationId).filter((id): id is number => id != null))];
  const [profiles, organizations] = await Promise.all([
    UserProfile.findAll({ where: { userId: { [Op.in]: userIds } } }),
    orgIds.length ? Organization.findAll({ where: { id: { [Op.in]: orgIds } } }) : Promise.resolve([]),
  ]);
  const profileByUser = new Map(profiles.map((p) => [p.userId, p]));
  const orgById = new Map(organizations.map((o) => [o.id, o]));
  return users.map((user) => {
    const profile = profileByUser.get(user.id);
    const org = user.organizationId != null ? orgById.get(user.organizationId) : undefined;
    return {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      headline: profile?.headline ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      organization: org ? { id: org.id, name: org.name, type: org.type } : null,
    };
  });
}
