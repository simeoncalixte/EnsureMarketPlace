import { Op } from 'sequelize';
import { User } from '../../db/models/identity.models';
import {
  Conversation,
  ConversationParticipant,
  MessagingProviderName,
  SocialMessage,
  UserMessagingIntegration,
} from '../../db/models/social.models';
import { broadcastToUser } from '../realtime/socketRegistry';

export interface InboundMessage {
  provider: MessagingProviderName;
  /** Provider-side sender identity: telegram chat id / whatsapp phone (E.164). */
  externalSender: string;
  externalMessageId: string;
  text: string;
  /** Telegram username, when present — captured at verification time. */
  externalUsername?: string;
}

export type InboundOutcome =
  | { ok: true; action: 'verified'; userId: number }
  | { ok: true; action: 'message_created'; messageId: number; conversationId: number }
  | { ok: true; action: 'duplicate' }
  | { ok: false; error: string };

function matchesDestination(integration: UserMessagingIntegration, externalSender: string): boolean {
  const config = (integration.configJson ?? {}) as { chatId?: unknown; phoneE164?: unknown };
  const stored = integration.provider === 'telegram' ? config.chatId : config.phoneE164;
  return stored != null && String(stored) === externalSender;
}

/**
 * Handle one inbound external message.
 *
 * Two cases:
 *  1. The text matches a pending verification code → bind the external chat to
 *     that integration and mark it verified.
 *  2. A verified integration matches the external sender → create an in-app
 *     message from that user, routed to their most-recently-active
 *     conversation (v1 rule: external replies carry no thread id).
 */
export async function handleInboundMessage(inbound: InboundMessage): Promise<InboundOutcome> {
  const trimmed = inbound.text.trim();

  // Case 1: verification handshake ("user sends the 6-digit code to the bot").
  const codeCandidate = trimmed.match(/^\d{6}$/)?.[0];
  if (codeCandidate) {
    const pending = await UserMessagingIntegration.findOne({
      where: { provider: inbound.provider, verified: false, verificationCode: codeCandidate },
    });
    if (pending) {
      const config = { ...(pending.configJson ?? {}) } as Record<string, unknown>;
      if (inbound.provider === 'telegram') {
        config.chatId = inbound.externalSender;
        if (inbound.externalUsername) config.username = inbound.externalUsername;
      } else {
        config.phoneE164 = inbound.externalSender;
      }
      await pending.update({ configJson: config, verified: true, verifiedAt: new Date(), verificationCode: null });
      broadcastToUser(pending.userId, {
        type: 'notification.new',
        payload: { kind: 'integration_verified', provider: inbound.provider },
      });
      return { ok: true, action: 'verified', userId: pending.userId };
    }
  }

  // Case 2: a regular reply from a bound external chat.
  const integrations = await UserMessagingIntegration.findAll({
    where: { provider: inbound.provider, verified: true },
  });
  const integration = integrations.find((candidate) => matchesDestination(candidate, inbound.externalSender));
  if (!integration) {
    return { ok: false, error: 'unknown_external_sender' };
  }

  const existing = await SocialMessage.findOne({
    where: { externalProvider: inbound.provider, externalMessageId: inbound.externalMessageId },
  });
  if (existing) return { ok: true, action: 'duplicate' };

  const user = await User.findByPk(integration.userId);
  if (!user) return { ok: false, error: 'integration_user_missing' };

  // Most-recently-active conversation (documented v1 limitation: ambiguous for
  // users juggling several threads; outbound messages are sender-prefixed to
  // keep the context clear on the external side).
  const memberships = await ConversationParticipant.findAll({ where: { userId: user.id } });
  if (!memberships.length) return { ok: false, error: 'no_conversation' };
  const conversation = await Conversation.findOne({
    where: { id: { [Op.in]: memberships.map((m) => m.conversationId) } },
    order: [['lastMessageAt', 'DESC NULLS LAST']],
  });
  if (!conversation) return { ok: false, error: 'no_conversation' };

  const message = await SocialMessage.create({
    conversationId: conversation.id,
    senderId: user.id,
    kind: 'text',
    body: trimmed,
    submissionId: null,
    submissionFileId: null,
    externalProvider: inbound.provider,
    externalMessageId: inbound.externalMessageId,
  });
  await conversation.update({ lastMessageAt: message.createdAt });

  const others = await ConversationParticipant.findAll({
    where: { conversationId: conversation.id, userId: { [Op.ne]: user.id } },
  });
  for (const other of others) {
    broadcastToUser(other.userId, {
      type: 'message.new',
      payload: {
        message: {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          kind: message.kind,
          body: message.body,
          submissionId: null,
          submissionFileId: null,
          externalProvider: message.externalProvider,
          createdAt: message.createdAt,
        },
      },
    });
  }

  return { ok: true, action: 'message_created', messageId: message.id, conversationId: conversation.id };
}
