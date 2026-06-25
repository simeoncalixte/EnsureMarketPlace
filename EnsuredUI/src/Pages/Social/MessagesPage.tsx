import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import styled from 'styled-components';
import { colors, withAlpha } from '../../xds/colors';
import { radii } from '../../xds/tokens';
import Button from '../../xds/components/Button';
import Input from '../../xds/components/Input';
import Modal from '../../xds/components/Modal';
import MessageBubble from '../../xds/components/MessageBubble';
import ConversationListItem from '../../xds/components/ConversationListItem';
import { useAuthMe } from '../../lib/useAuthMe';
import { useSocialSocket } from '../../app-sections/SocialSocket';
import * as socialMessagesApi from '../../api/socialMessages';
import { getSubmissions } from '../../api/underwriting';
import { loadSubmissionFiles, type SubmissionFileInfo } from '../../api/pipeline';

const Page = styled.div`
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 0;
  height: calc(100vh - 140px);
  margin: 24px;
  border: 1px solid ${withAlpha(colors.neutral[400], 0.15)};
  border-radius: ${radii.lg}px;
  overflow: hidden;
  background: ${colors.surfaceContainerHigh};
`;

const ListPane = styled.div`
  border-right: 1px solid ${withAlpha(colors.neutral[400], 0.15)};
  overflow-y: auto;
`;

const ListHeader = styled.div`
  padding: 16px;
  font-size: 16px;
  font-weight: 700;
  color: ${colors.onSurface};
  border-bottom: 1px solid ${withAlpha(colors.neutral[400], 0.15)};
`;

const ThreadPane = styled.div`
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-width: 0;
`;

const ThreadHeader = styled.div`
  padding: 14px 20px;
  font-weight: 700;
  color: ${colors.onSurface};
  border-bottom: 1px solid ${withAlpha(colors.neutral[400], 0.15)};
`;

const Scroller = styled.div`
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ComposerRow = styled.div`
  display: flex;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid ${withAlpha(colors.neutral[400], 0.15)};
  align-items: center;
`;

const EmptyState = styled.div`
  padding: 40px;
  text-align: center;
  color: ${colors.onSurfaceVariant};
  font-size: 14px;
`;

const PickerList = styled.div`
  display: grid;
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
`;

const PickerRow = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: ${colors.surfaceContainerHigh};
  border: 1px solid ${withAlpha(colors.neutral[400], 0.18)};
  border-radius: ${radii.md}px;
  color: ${colors.onSurface};
  cursor: pointer;
  text-align: left;
  font-size: 13px;

  &:hover {
    border-color: ${colors.primary};
  }
`;

type BoardSubmission = { id: number; label: string };

function parseBoardSubmissions(payload: unknown): BoardSubmission[] {
  const items = (payload as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is { id: number; values?: Record<string, unknown> } => typeof (item as { id?: unknown })?.id === 'number')
    .map((item) => {
      const values = item.values ?? {};
      const cedent = typeof values.cedent === 'string' ? values.cedent : null;
      const lob = typeof values.lineOfBusiness === 'string' ? values.lineOfBusiness : null;
      return { id: item.id, label: [`#${item.id}`, cedent, lob].filter(Boolean).join(' — ') };
    });
}

function timeShort(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const sameDay = new Date().toDateString() === date.toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const { conversationId: conversationIdParam } = useParams();
  const conversationId = conversationIdParam ? Number(conversationIdParam) : null;
  const { user } = useAuthMe();
  const { subscribe } = useSocialSocket();

  const [conversations, setConversations] = useState<socialMessagesApi.ConversationItem[]>([]);
  const [messages, setMessages] = useState<socialMessagesApi.SocialMessageItem[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSubmissions, setPickerSubmissions] = useState<BoardSubmission[]>([]);
  const [pickerFiles, setPickerFiles] = useState<{ submission: BoardSubmission; files: SubmissionFileInfo[] } | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const refreshConversations = useCallback(async () => {
    const res = await socialMessagesApi.listConversations();
    setConversations(res.conversations);
  }, []);

  const loadThread = useCallback(async (id: number) => {
    const res = await socialMessagesApi.getMessages(id);
    setMessages(res.messages);
    await socialMessagesApi.markConversationRead(id);
  }, []);

  useEffect(() => {
    void refreshConversations().catch(() => undefined);
  }, [refreshConversations]);

  useEffect(() => {
    if (conversationId) void loadThread(conversationId).catch(() => undefined);
    else setMessages([]);
  }, [conversationId, loadThread]);

  // Live delivery: append to the open thread, refresh the sidebar otherwise.
  useEffect(() => {
    return subscribe('message.new', (event) => {
      const message = (event.payload as { message?: socialMessagesApi.SocialMessageItem }).message;
      if (!message) return;
      if (message.conversationId === conversationId) {
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
        void socialMessagesApi.markConversationRead(message.conversationId).catch(() => undefined);
      }
      void refreshConversations().catch(() => undefined);
    });
  }, [subscribe, conversationId, refreshConversations]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [messages]);

  const active = useMemo(
    () => conversations.find((conversation) => conversation.id === conversationId) ?? null,
    [conversations, conversationId],
  );
  const counterpartName = active?.participants[0]
    ? `${active.participants[0].firstName} ${active.participants[0].lastName}`
    : 'Conversation';

  const send = async (input: { kind: socialMessagesApi.MessageKind; body?: string; submissionId?: number; submissionFileId?: number }) => {
    if (!conversationId) return;
    setBusy(true);
    try {
      const res = await socialMessagesApi.sendMessage(conversationId, input);
      setMessages((prev) => [...prev, res.message]);
      setDraft('');
      await refreshConversations();
    } finally {
      setBusy(false);
    }
  };

  const openPicker = async () => {
    setPickerOpen(true);
    setPickerFiles(null);
    try {
      const response = await getSubmissions();
      setPickerSubmissions(parseBoardSubmissions(await response.json()));
    } catch {
      setPickerSubmissions([]);
    }
  };

  const pickFiles = async (submission: BoardSubmission) => {
    const files = await loadSubmissionFiles(submission.id);
    setPickerFiles({ submission, files });
  };

  return (
    <Page>
      <ListPane>
        <ListHeader>Messages</ListHeader>
        {conversations.length === 0 && (
          <EmptyState>No conversations yet. Open one from a connection's profile.</EmptyState>
        )}
        {conversations.map((conversation) => {
          const other = conversation.participants[0];
          const preview =
            conversation.lastMessage?.kind === 'submission_share'
              ? '📋 Shared a submission'
              : conversation.lastMessage?.kind === 'attachment'
                ? '📎 Shared a file'
                : conversation.lastMessage?.body ?? 'New conversation';
          return (
            <ConversationListItem
              key={conversation.id}
              name={other ? `${other.firstName} ${other.lastName}` : `Conversation ${conversation.id}`}
              avatarUrl={other?.avatarUrl}
              lastMessagePreview={preview}
              lastMessageAt={timeShort(conversation.lastMessageAt)}
              unreadCount={conversation.unreadCount}
              active={conversation.id === conversationId}
              onClick={() => navigate(`/messages/${conversation.id}`)}
            />
          );
        })}
      </ListPane>

      <ThreadPane>
        {conversationId ? (
          <>
            <ThreadHeader>{counterpartName}</ThreadHeader>
            <Scroller ref={scrollerRef}>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  mine={message.senderId === user?.id}
                  kind={message.kind}
                  body={message.body}
                  senderName={message.senderId === user?.id ? null : counterpartName}
                  createdAt={timeShort(message.createdAt)}
                  submissionLabel={message.submissionId ? `Submission #${message.submissionId}` : null}
                  attachmentName={message.submissionFileId ? `File #${message.submissionFileId}` : null}
                  attachmentUrl={
                    message.submissionFileId ? `/api/pipeline/processes/files/${message.submissionFileId}/content` : null
                  }
                  externalProvider={message.externalProvider}
                  onOpenSubmission={
                    message.submissionId ? () => navigate(`/messages/${conversationId}`) : undefined
                  }
                />
              ))}
            </Scroller>
            <ComposerRow>
              <Button variant="secondary" onClick={() => void openPicker()} aria-label="Attach a submission">
                + Attach
              </Button>
              <Input
                placeholder="Write a message…"
                value={draft}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' && draft.trim() && !busy) void send({ kind: 'text', body: draft.trim() });
                }}
              />
              <Button
                variant="primary"
                disabled={!draft.trim() || busy}
                onClick={() => void send({ kind: 'text', body: draft.trim() })}
              >
                Send
              </Button>
            </ComposerRow>
          </>
        ) : (
          <EmptyState>Select a conversation to start messaging.</EmptyState>
        )}
      </ThreadPane>

      {pickerOpen && (
        <Modal open title="Share a submission" onClose={() => setPickerOpen(false)}>
          {!pickerFiles ? (
            <PickerList>
              {pickerSubmissions.length === 0 && <EmptyState>No submissions available to share.</EmptyState>}
              {pickerSubmissions.map((submission) => (
                <PickerRow key={submission.id} onClick={() => void pickFiles(submission)}>
                  <span>{submission.label}</span>
                  <Button
                    variant="primary"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setPickerOpen(false);
                      void send({ kind: 'submission_share', submissionId: submission.id, body: draft.trim() || undefined });
                    }}
                  >
                    Share submission
                  </Button>
                </PickerRow>
              ))}
            </PickerList>
          ) : (
            <PickerList>
              <Button variant="secondary" onClick={() => setPickerFiles(null)}>← Back to submissions</Button>
              {pickerFiles.files.length === 0 && <EmptyState>This submission has no files.</EmptyState>}
              {pickerFiles.files.map((file) => (
                <PickerRow
                  key={file.id}
                  onClick={() => {
                    setPickerOpen(false);
                    void send({ kind: 'attachment', submissionFileId: file.id, body: draft.trim() || undefined });
                  }}
                >
                  <span>📎 {file.fileName}</span>
                  <span>{file.fileSize ? `${Math.round(file.fileSize / 1024)} KB` : ''}</span>
                </PickerRow>
              ))}
            </PickerList>
          )}
        </Modal>
      )}
    </Page>
  );
}
