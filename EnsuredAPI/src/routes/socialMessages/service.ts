import { Op } from 'sequelize';
import {
  ConversationParticipant,
  SocialMessage,
  SubmissionShare,
} from '../../db/models/social.models';
import { Submission } from '../../db/models/underwriting.models';

export const MAX_MESSAGE_LENGTH = 8000;

/** True when the user may read the submission: same tenant or an explicit share grant. */
export async function canAccessSubmission(userId: number, organizationId: number | null, submission: Submission): Promise<boolean> {
  if (submission.organizationId == null) return true;
  if (organizationId != null && submission.organizationId === organizationId) return true;
  const share = await SubmissionShare.findOne({ where: { submissionId: submission.id, grantedToUserId: userId } });
  return share != null;
}

export async function participantOrNull(conversationId: number, userId: number): Promise<ConversationParticipant | null> {
  return ConversationParticipant.findOne({ where: { conversationId, userId } });
}

export async function otherParticipantIds(conversationId: number, userId: number): Promise<number[]> {
  const others = await ConversationParticipant.findAll({
    where: { conversationId, userId: { [Op.ne]: userId } },
  });
  return others.map((p) => p.userId);
}

export function serializeMessage(message: SocialMessage) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    kind: message.kind,
    body: message.body,
    submissionId: message.submissionId,
    submissionFileId: message.submissionFileId,
    externalProvider: message.externalProvider,
    createdAt: message.createdAt,
  };
}
