import { FastifyPluginAsync } from 'fastify';
import { Op } from 'sequelize';
import { getSequelize } from '../../db/config/database';
import { User } from '../../db/models/identity.models';
import { SubmissionFile } from '../../db/models/ingestion.models';
import { Submission } from '../../db/models/underwriting.models';
import {
  Conversation,
  ConversationParticipant,
  SocialMessage,
  SubmissionShare,
} from '../../db/models/social.models';
import { areConnected } from '../../services/social/graph';
import { deliverMessageExternally } from '../../services/social/messaging/deliverMessage';
import { broadcastToUser } from '../../services/social/realtime/socketRegistry';
import { profileSummariesFor } from '../socialProfiles';
import { resolveUser } from '../helpers/resolveUser';
import {
  MAX_MESSAGE_LENGTH,
  canAccessSubmission,
  otherParticipantIds,
  participantOrNull,
  serializeMessage,
} from './service';

export const socialMessagesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/social/conversations', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const memberships = await ConversationParticipant.findAll({ where: { userId: user.id } });
    const conversationIds = memberships.map((m) => m.conversationId);
    if (!conversationIds.length) return reply.send({ ok: true, conversations: [] });

    const [conversations, allParticipants] = await Promise.all([
      Conversation.findAll({ where: { id: { [Op.in]: conversationIds } }, order: [['lastMessageAt', 'DESC NULLS LAST']] }),
      ConversationParticipant.findAll({ where: { conversationId: { [Op.in]: conversationIds } } }),
    ]);

    const lastMessages = await SocialMessage.findAll({
      where: { conversationId: { [Op.in]: conversationIds } },
      order: [
        ['conversationId', 'ASC'],
        ['createdAt', 'DESC'],
      ],
    });
    const lastByConversation = new Map<number, SocialMessage>();
    for (const message of lastMessages) {
      if (!lastByConversation.has(message.conversationId)) lastByConversation.set(message.conversationId, message);
    }

    const membershipByConversation = new Map(memberships.map((m) => [m.conversationId, m]));
    const otherUserIds = [
      ...new Set(allParticipants.filter((p) => p.userId !== user.id).map((p) => p.userId)),
    ];
    const otherUsers = otherUserIds.length ? await User.findAll({ where: { id: { [Op.in]: otherUserIds } } }) : [];
    const summaries = await profileSummariesFor(otherUsers);
    const summaryByUser = new Map(summaries.map((s) => [s.userId, s]));

    const unreadCounts = await Promise.all(
      conversations.map(async (conversation) => {
        const membership = membershipByConversation.get(conversation.id);
        return SocialMessage.count({
          where: {
            conversationId: conversation.id,
            senderId: { [Op.ne]: user.id },
            ...(membership?.lastReadAt ? { createdAt: { [Op.gt]: membership.lastReadAt } } : {}),
          },
        });
      }),
    );

    return reply.send({
      ok: true,
      conversations: conversations.map((conversation, index) => {
        const others = allParticipants.filter((p) => p.conversationId === conversation.id && p.userId !== user.id);
        const last = lastByConversation.get(conversation.id);
        return {
          id: conversation.id,
          kind: conversation.kind,
          lastMessageAt: conversation.lastMessageAt,
          participants: others.map((p) => summaryByUser.get(p.userId) ?? { userId: p.userId }),
          lastMessage: last ? serializeMessage(last) : null,
          unreadCount: unreadCounts[index],
        };
      }),
    });
  });

  app.post<{ Body: { userId?: number } }>('/social/conversations', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const otherUserId = Number(request.body?.userId);
    if (!Number.isFinite(otherUserId) || otherUserId === user.id) {
      return reply.code(400).send({ ok: false, error: 'invalid_user' });
    }
    const other = await User.findByPk(otherUserId);
    if (!other || !other.isActive) return reply.code(404).send({ ok: false, error: 'user_not_found' });

    // Messaging is a trust feature: only accepted connections can open a thread.
    if (!(await areConnected(user.id, otherUserId))) {
      return reply.code(403).send({ ok: false, error: 'connection_required' });
    }

    // Find an existing direct conversation between exactly these two users.
    const myMemberships = await ConversationParticipant.findAll({ where: { userId: user.id } });
    const candidateIds = myMemberships.map((m) => m.conversationId);
    let conversation: Conversation | null = null;
    if (candidateIds.length) {
      const match = await ConversationParticipant.findOne({
        where: { conversationId: { [Op.in]: candidateIds }, userId: otherUserId },
      });
      if (match) conversation = await Conversation.findByPk(match.conversationId);
    }

    if (!conversation) {
      conversation = await getSequelize().transaction(async (transaction) => {
        const created = await Conversation.create({ kind: 'direct', lastMessageAt: null }, { transaction });
        await ConversationParticipant.bulkCreate(
          [
            { conversationId: created.id, userId: user.id, lastReadAt: null },
            { conversationId: created.id, userId: otherUserId, lastReadAt: null },
          ],
          { transaction },
        );
        return created;
      });
    }

    return reply.code(201).send({ ok: true, conversation: { id: conversation.id, kind: conversation.kind } });
  });

  app.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/social/conversations/:id/messages',
    async (request, reply) => {
      const user = await resolveUser(request, reply);
      if (!user) return reply;

      const conversationId = Number(request.params.id);
      const membership = await participantOrNull(conversationId, user.id);
      if (!membership) return reply.code(403).send({ ok: false, error: 'not_participant' });

      const limit = Math.min(Number(request.query.limit) || 50, 100);
      const beforeId = Number(request.query.cursor) || null;

      const messages = await SocialMessage.findAll({
        where: { conversationId, ...(beforeId ? { id: { [Op.lt]: beforeId } } : {}) },
        order: [['id', 'DESC']],
        limit: limit + 1,
      });
      const page = messages.slice(0, limit);

      return reply.send({
        ok: true,
        messages: page.map(serializeMessage).reverse(),
        nextCursor: messages.length > limit ? String(page[page.length - 1].id) : null,
      });
    },
  );

  app.post<{
    Params: { id: string };
    Body: { kind?: string; body?: string; submissionId?: number; submissionFileId?: number };
  }>('/social/conversations/:id/messages', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const conversationId = Number(request.params.id);
    const membership = await participantOrNull(conversationId, user.id);
    if (!membership) return reply.code(403).send({ ok: false, error: 'not_participant' });

    const kind = request.body?.kind ?? 'text';
    const body = (request.body?.body ?? '').trim() || null;
    if (body && body.length > MAX_MESSAGE_LENGTH) {
      return reply.code(400).send({ ok: false, error: 'body_too_long' });
    }

    let submission: Submission | null = null;
    let submissionFile: SubmissionFile | null = null;

    if (kind === 'text') {
      if (!body) return reply.code(400).send({ ok: false, error: 'body_required' });
    } else if (kind === 'submission_share') {
      submission = await Submission.findByPk(Number(request.body?.submissionId));
      if (!submission) return reply.code(404).send({ ok: false, error: 'submission_not_found' });
      if (!(await canAccessSubmission(user.id, user.organizationId, submission))) {
        return reply.code(403).send({ ok: false, error: 'submission_not_accessible' });
      }
    } else if (kind === 'attachment') {
      submissionFile = await SubmissionFile.findByPk(Number(request.body?.submissionFileId));
      if (!submissionFile) return reply.code(404).send({ ok: false, error: 'file_not_found' });
      submission = submissionFile.submissionId != null ? await Submission.findByPk(submissionFile.submissionId) : null;
      if (!submission || !(await canAccessSubmission(user.id, user.organizationId, submission))) {
        return reply.code(403).send({ ok: false, error: 'file_not_accessible' });
      }
    } else {
      return reply.code(400).send({ ok: false, error: 'invalid_kind' });
    }

    const recipientIds = await otherParticipantIds(conversationId, user.id);

    const message = await getSequelize().transaction(async (transaction) => {
      const created = await SocialMessage.create(
        {
          conversationId,
          senderId: user.id,
          kind: kind as 'text' | 'submission_share' | 'attachment',
          body,
          submissionId: submission?.id ?? null,
          submissionFileId: submissionFile?.id ?? null,
          externalProvider: null,
          externalMessageId: null,
        },
        { transaction },
      );

      // Sharing a submission (or one of its files) grants the recipients
      // read access — recorded as an explicit, auditable grant.
      if (submission) {
        for (const recipientId of recipientIds) {
          await SubmissionShare.findOrCreate({
            where: { submissionId: submission.id, grantedToUserId: recipientId },
            defaults: {
              submissionId: submission.id,
              grantedToUserId: recipientId,
              grantedByUserId: user.id,
              messageId: created.id,
            },
            transaction,
          });
        }
      }

      await Conversation.update(
        { lastMessageAt: created.createdAt },
        { where: { id: conversationId }, transaction },
      );
      return created;
    });

    const serialized = serializeMessage(message);
    for (const recipientId of recipientIds) {
      broadcastToUser(recipientId, { type: 'message.new', payload: { message: serialized } });
    }

    // Mirror to the recipient's external channel (WhatsApp/Telegram) when one
    // is verified. Fire-and-forget: external delivery must never fail the send.
    void deliverMessageExternally({ message, sender: user, recipientIds }).catch(() => undefined);

    return reply.code(201).send({ ok: true, message: serialized });
  });

  app.post<{ Params: { id: string } }>('/social/conversations/:id/read', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const membership = await participantOrNull(Number(request.params.id), user.id);
    if (!membership) return reply.code(403).send({ ok: false, error: 'not_participant' });

    await membership.update({ lastReadAt: new Date() });
    return reply.send({ ok: true });
  });

  /**
   * Read-only view of a submission that was shared with the requesting user.
   * This is the ONLY route that honors SubmissionShare grants — pipeline and
   * underwriting mutation routes remain strictly tenant-scoped.
   */
  app.get<{ Params: { id: string } }>('/social/shared-submissions/:id', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const submission = await Submission.findByPk(Number(request.params.id));
    if (!submission || !(await canAccessSubmission(user.id, user.organizationId, submission))) {
      return reply.code(404).send({ ok: false, error: 'submission_not_found' });
    }

    const files = await SubmissionFile.findAll({ where: { submissionId: submission.id }, order: [['id', 'ASC']] });
    return reply.send({
      ok: true,
      submission: {
        id: submission.id,
        status: submission.status,
        source: submission.source,
        receivedAt: submission.receivedAt,
        files: files.map((file) => ({
          id: file.id,
          fileName: file.get('fileName'),
          fileType: file.get('fileType') ?? null,
          fileSize: file.get('fileSize') ?? null,
          contentUrl: `/api/pipeline/processes/files/${file.id}/content`,
        })),
      },
    });
  });
};
