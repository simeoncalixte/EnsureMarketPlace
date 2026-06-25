import { FastifyPluginAsync } from 'fastify';
import { Op } from 'sequelize';
import { Notification, User } from '../db/models/identity.models';
import { Connection } from '../db/models/social.models';
import { findPairConnection } from '../social/graph';
import { broadcastToUser } from '../social/realtime/socketRegistry';
import { profileSummariesFor } from './socialProfiles';
import { resolveUser } from './helpers/resolveUser';

export const socialConnectionsRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { addresseeId?: number } }>('/social/connections', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const addresseeId = Number(request.body?.addresseeId);
    if (!Number.isFinite(addresseeId) || addresseeId === user.id) {
      return reply.code(400).send({ ok: false, error: 'invalid_addressee' });
    }
    const addressee = await User.findByPk(addresseeId);
    if (!addressee || !addressee.isActive) {
      return reply.code(404).send({ ok: false, error: 'addressee_not_found' });
    }

    const existing = await findPairConnection(user.id, addresseeId);
    if (existing && existing.status !== 'declined') {
      return reply.code(409).send({ ok: false, error: 'connection_already_exists', status: existing.status });
    }
    // A previously declined pair may try again — reuse the row, re-initiated by the current user.
    const connection = existing
      ? await existing.update({ requesterId: user.id, addresseeId, status: 'pending', respondedAt: null })
      : await Connection.create({ requesterId: user.id, addresseeId });

    await Notification.create({
      userId: addresseeId,
      type: 'connection_request',
      message: `${user.firstName} ${user.lastName} wants to connect with you.`,
      readAt: null,
    });
    broadcastToUser(addresseeId, { type: 'connection.requested', payload: { connectionId: connection.id, fromUserId: user.id } });

    return reply.code(201).send({ ok: true, connection });
  });

  app.post<{ Params: { id: string } }>('/social/connections/:id/accept', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const connection = await Connection.findByPk(Number(request.params.id));
    if (!connection) return reply.code(404).send({ ok: false, error: 'connection_not_found' });
    if (connection.addresseeId !== user.id) return reply.code(403).send({ ok: false, error: 'not_addressee' });
    if (connection.status !== 'pending') return reply.code(409).send({ ok: false, error: 'not_pending' });

    await connection.update({ status: 'accepted', respondedAt: new Date() });

    await Notification.create({
      userId: connection.requesterId,
      type: 'connection_accepted',
      message: `${user.firstName} ${user.lastName} accepted your connection request.`,
      readAt: null,
    });
    broadcastToUser(connection.requesterId, {
      type: 'connection.accepted',
      payload: { connectionId: connection.id, byUserId: user.id },
    });

    return reply.send({ ok: true, connection });
  });

  app.post<{ Params: { id: string } }>('/social/connections/:id/decline', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const connection = await Connection.findByPk(Number(request.params.id));
    if (!connection) return reply.code(404).send({ ok: false, error: 'connection_not_found' });
    if (connection.addresseeId !== user.id) return reply.code(403).send({ ok: false, error: 'not_addressee' });
    if (connection.status !== 'pending') return reply.code(409).send({ ok: false, error: 'not_pending' });

    await connection.update({ status: 'declined', respondedAt: new Date() });
    return reply.send({ ok: true, connection });
  });

  app.delete<{ Params: { id: string } }>('/social/connections/:id', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const connection = await Connection.findByPk(Number(request.params.id));
    if (!connection) return reply.code(404).send({ ok: false, error: 'connection_not_found' });
    if (connection.requesterId !== user.id && connection.addresseeId !== user.id) {
      return reply.code(403).send({ ok: false, error: 'not_participant' });
    }

    await connection.destroy();
    return reply.send({ ok: true });
  });

  app.get<{ Querystring: { status?: string } }>('/social/connections', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const status = request.query.status ?? 'accepted';
    let where;
    if (status === 'pending_incoming') {
      where = { status: 'pending', addresseeId: user.id };
    } else if (status === 'pending_outgoing') {
      where = { status: 'pending', requesterId: user.id };
    } else if (status === 'accepted') {
      where = { status: 'accepted', [Op.or]: [{ requesterId: user.id }, { addresseeId: user.id }] };
    } else {
      return reply.code(400).send({ ok: false, error: 'invalid_status_filter' });
    }

    const connections = await Connection.findAll({ where, order: [['updatedAt', 'DESC']], limit: 200 });
    const otherIds = connections.map((c) => (c.requesterId === user.id ? c.addresseeId : c.requesterId));
    const users = otherIds.length ? await User.findAll({ where: { id: { [Op.in]: otherIds } } }) : [];
    const summaries = await profileSummariesFor(users);
    const summaryByUser = new Map(summaries.map((s) => [s.userId, s]));

    return reply.send({
      ok: true,
      connections: connections.map((c) => {
        const otherUserId = c.requesterId === user.id ? c.addresseeId : c.requesterId;
        return {
          id: c.id,
          status: c.status,
          direction: c.requesterId === user.id ? 'outgoing' : 'incoming',
          createdAt: c.createdAt,
          respondedAt: c.respondedAt,
          user: summaryByUser.get(otherUserId) ?? { userId: otherUserId },
        };
      }),
    });
  });

  app.get('/social/connections/counts', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const [accepted, pendingIncoming] = await Promise.all([
      Connection.count({ where: { status: 'accepted', [Op.or]: [{ requesterId: user.id }, { addresseeId: user.id }] } }),
      Connection.count({ where: { status: 'pending', addresseeId: user.id } }),
    ]);
    return reply.send({ ok: true, counts: { accepted, pendingIncoming } });
  });
};
