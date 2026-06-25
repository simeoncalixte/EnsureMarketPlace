import { Op } from 'sequelize';
import { User } from '../../db/models/identity.models';
import { SocialMessage, UserMessagingIntegration } from '../../db/models/social.models';
import { selectMessagingProvider } from './providers/selectMessagingProvider';

export interface DeliverParams {
  message: SocialMessage;
  sender: Pick<User, 'firstName' | 'lastName'>;
  recipientIds: number[];
}

export type DeliverOutcome =
  | { ok: true; deliveries: { userId: number; provider: string; externalMessageId: string }[] }
  | { ok: false; error: string };

function destinationFor(integration: UserMessagingIntegration): string | null {
  const config = integration.configJson ?? {};
  if (integration.provider === 'telegram') {
    const chatId = (config as { chatId?: unknown }).chatId;
    return chatId == null ? null : String(chatId);
  }
  const phone = (config as { phoneE164?: unknown }).phoneE164;
  return phone == null ? null : String(phone);
}

function renderText(message: SocialMessage, sender: DeliverParams['sender']): string {
  // Prefix with the sender so a reply received out-of-band still has context.
  const from = `${sender.firstName} ${sender.lastName}`;
  if (message.kind === 'submission_share') {
    return `${from} shared submission #${message.submissionId} with you on Ensured.${message.body ? `\n${message.body}` : ''}`;
  }
  if (message.kind === 'attachment') {
    return `${from} shared a file with you on Ensured.${message.body ? `\n${message.body}` : ''}`;
  }
  return `${from}: ${message.body ?? ''}`;
}

/**
 * Mirror an in-app message to each recipient's verified external channel.
 * Never throws — callers fire-and-forget; failures are reported in the result
 * (and logged by the caller if it cares). Recipients without a verified
 * integration are simply skipped.
 */
export async function deliverMessageExternally(params: DeliverParams): Promise<DeliverOutcome> {
  try {
    const integrations = await UserMessagingIntegration.findAll({
      where: { userId: { [Op.in]: params.recipientIds }, verified: true },
    });
    const deliveries: { userId: number; provider: string; externalMessageId: string }[] = [];
    for (const integration of integrations) {
      const destination = destinationFor(integration);
      if (!destination) continue;
      const provider = selectMessagingProvider(integration.provider);
      const result = await provider.sendMessage({
        destination,
        text: renderText(params.message, params.sender),
      });
      if (result.ok) {
        deliveries.push({ userId: integration.userId, provider: provider.name, externalMessageId: result.externalMessageId });
      }
    }
    return { ok: true, deliveries };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'external_delivery_failed' };
  }
}
