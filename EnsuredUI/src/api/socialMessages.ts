// Social network: direct conversations, messages, and external messaging integrations.
import { deleteJson, getJson, postJson } from './client';
import type { ProfileSummary } from './social';

export type MessageKind = 'text' | 'submission_share' | 'attachment';

export interface SocialMessageItem {
  id: number;
  conversationId: number;
  senderId: number;
  kind: MessageKind;
  body: string | null;
  submissionId: number | null;
  submissionFileId: number | null;
  externalProvider: 'whatsapp' | 'telegram' | null;
  createdAt: string;
}

export interface ConversationItem {
  id: number;
  kind: 'direct';
  lastMessageAt: string | null;
  participants: ProfileSummary[];
  lastMessage: SocialMessageItem | null;
  unreadCount: number;
}

export interface MessagingIntegration {
  id: number;
  provider: 'whatsapp' | 'telegram';
  verified: boolean;
  verifiedAt: string | null;
  verificationCode: string | null;
  simulated: boolean;
  display: { username: string | null; phoneMasked: string | null };
  createdAt: string;
}

export interface SharedSubmission {
  id: number;
  status: string;
  source: string | null;
  receivedAt: string | null;
  files: { id: number; fileName: string; fileType: string | null; fileSize: number | null; contentUrl: string }[];
}

export function listConversations() {
  return getJson<{ ok: boolean; conversations: ConversationItem[] }>(`/api/social/conversations`);
}

export function openConversation(userId: number) {
  return postJson<{ ok: boolean; conversation: { id: number } }>(`/api/social/conversations`, { userId });
}

export function getMessages(conversationId: number, cursor?: string | null) {
  return getJson<{ ok: boolean; messages: SocialMessageItem[]; nextCursor: string | null }>(
    `/api/social/conversations/${conversationId}/messages${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
  );
}

export function sendMessage(
  conversationId: number,
  input: { kind: MessageKind; body?: string; submissionId?: number; submissionFileId?: number },
) {
  return postJson<{ ok: boolean; message: SocialMessageItem }>(
    `/api/social/conversations/${conversationId}/messages`,
    input,
  );
}

export function markConversationRead(conversationId: number) {
  return postJson<{ ok: boolean }>(`/api/social/conversations/${conversationId}/read`);
}

export function getSharedSubmission(submissionId: number) {
  return getJson<{ ok: boolean; submission: SharedSubmission }>(`/api/social/shared-submissions/${submissionId}`);
}

export function listIntegrations() {
  return getJson<{ ok: boolean; integrations: MessagingIntegration[] }>(`/api/social/integrations`);
}

export function connectIntegration(input: { provider: 'whatsapp' | 'telegram'; phoneE164?: string }) {
  return postJson<{ ok: boolean; integration: MessagingIntegration }>(`/api/social/integrations`, input);
}

export function disconnectIntegration(integrationId: number) {
  return deleteJson<{ ok: boolean }>(`/api/social/integrations/${integrationId}`);
}
