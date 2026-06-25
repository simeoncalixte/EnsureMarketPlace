import { FastifyPluginAsync } from 'fastify';
import { Op } from 'sequelize';
import { Organization, User } from '../db/models/identity.models';
import { UserProfile } from '../db/models/social.models';
import { acceptedConnectionUserIds, countAcceptedConnections, findPairConnection, pairStatusFor } from '../social/graph';
import { resolveUser } from './helpers/resolveUser';

/**
 * Public-facing professional identity. Deliberately cross-tenant: the social
 * network exists to connect insurers, reinsurers and brokers ACROSS
 * organizations, so the directory and profiles skip tenant scoping. Anything
 * that touches submissions stays tenant-scoped elsewhere.
 */

export interface ProfileSummary {
  userId: number;
  firstName: string;
  lastName: string;
  role: string;
  headline: string | null;
  avatarUrl: string | null;
  organization: { id: number; name: string; type: string } | null;
}

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

export const socialProfilesRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { userId: string } }>('/social/profiles/:userId', async (request, reply) => {
    const viewer = await resolveUser(request, reply);
    if (!viewer) return reply;

    const userId = Number(request.params.userId);
    const user = Number.isFinite(userId) ? await User.findByPk(userId) : null;
    if (!user || !user.isActive) {
      return reply.code(404).send({ ok: false, error: 'profile_not_found' });
    }

    const [summary] = await profileSummariesFor([user]);
    const [profile, connectionCount, pair] = await Promise.all([
      UserProfile.findOne({ where: { userId: user.id } }),
      countAcceptedConnections(user.id),
      viewer.id === user.id ? Promise.resolve(null) : findPairConnection(viewer.id, user.id),
    ]);

    return reply.send({
      ok: true,
      profile: {
        ...summary,
        bio: profile?.bio ?? null,
        location: profile?.location ?? null,
        connectionCount,
        connectionStatus: viewer.id === user.id ? 'self' : pairStatusFor(viewer.id, pair),
        connectionId: pair?.id ?? null,
      },
    });
  });

  app.put<{ Body: { headline?: string; bio?: string; avatarUrl?: string; location?: string } }>(
    '/social/profiles/me',
    async (request, reply) => {
      const user = await resolveUser(request, reply);
      if (!user) return reply;

      const { headline, bio, avatarUrl, location } = request.body ?? {};
      if (headline != null && headline.length > 160) {
        return reply.code(400).send({ ok: false, error: 'headline_too_long' });
      }

      const [profile] = await UserProfile.findOrCreate({ where: { userId: user.id }, defaults: { userId: user.id } });
      await profile.update({
        ...(headline !== undefined ? { headline } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        ...(location !== undefined ? { location } : {}),
      });

      return reply.send({ ok: true, profile });
    },
  );

  app.get<{ Querystring: { search?: string; cursor?: string; limit?: string } }>(
    '/social/people',
    async (request, reply) => {
      const viewer = await resolveUser(request, reply);
      if (!viewer) return reply;

      const limit = Math.min(Number(request.query.limit) || 25, 100);
      const cursor = Number(request.query.cursor) || 0;
      const search = (request.query.search ?? '').trim();

      const where: Record<string | symbol, unknown> = {
        isActive: true,
        id: cursor ? { [Op.ne]: viewer.id, [Op.gt]: cursor } : { [Op.ne]: viewer.id },
      };
      if (search) {
        where[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const users = await User.findAll({ where, order: [['id', 'ASC']], limit: limit + 1 });
      const page = users.slice(0, limit);
      const people = await profileSummariesFor(page);

      return reply.send({
        ok: true,
        people,
        nextCursor: users.length > limit ? String(page[page.length - 1].id) : null,
      });
    },
  );

  app.get<{ Params: { userId: string } }>('/social/profiles/:userId/coworkers', async (request, reply) => {
    const viewer = await resolveUser(request, reply);
    if (!viewer) return reply;

    const userId = Number(request.params.userId);
    const user = Number.isFinite(userId) ? await User.findByPk(userId) : null;
    if (!user) return reply.code(404).send({ ok: false, error: 'user_not_found' });
    if (user.organizationId == null) return reply.send({ ok: true, coworkers: [] });

    const coworkers = await User.findAll({
      where: { organizationId: user.organizationId, id: { [Op.ne]: user.id }, isActive: true },
      order: [['id', 'ASC']],
      limit: 50,
    });
    return reply.send({ ok: true, coworkers: await profileSummariesFor(coworkers) });
  });

  app.get<{ Params: { userId: string } }>('/social/profiles/:userId/connections', async (request, reply) => {
    const viewer = await resolveUser(request, reply);
    if (!viewer) return reply;

    const userId = Number(request.params.userId);
    if (!Number.isFinite(userId)) return reply.code(400).send({ ok: false, error: 'invalid_user_id' });

    const connectedIds = await acceptedConnectionUserIds(userId);
    if (!connectedIds.length) return reply.send({ ok: true, connections: [] });
    const users = await User.findAll({ where: { id: { [Op.in]: connectedIds }, isActive: true }, limit: 100 });
    return reply.send({ ok: true, connections: await profileSummariesFor(users) });
  });
};
