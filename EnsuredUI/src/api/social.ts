// Social network: profiles, connections, people directory, feed.
import { deleteJson, getJson, postJson, putJson } from './client';

export interface ProfileSummary {
  userId: number;
  firstName: string;
  lastName: string;
  role: string;
  headline: string | null;
  avatarUrl: string | null;
  organization: { id: number; name: string; type: string } | null;
}

export type ConnectionStatus = 'none' | 'pending_outgoing' | 'pending_incoming' | 'connected' | 'blocked' | 'self';

export interface SocialProfile extends ProfileSummary {
  bio: string | null;
  location: string | null;
  connectionCount: number;
  connectionStatus: ConnectionStatus;
  connectionId: number | null;
}

export interface ConnectionListItem {
  id: number;
  status: string;
  direction: 'incoming' | 'outgoing';
  createdAt: string;
  respondedAt: string | null;
  user: ProfileSummary;
}

export interface FeedPost {
  id: number;
  author: ProfileSummary;
  content: string;
  visibility: 'public' | 'connections';
  attachments: Record<string, unknown>[];
  likeCount: number;
  commentCount: number;
  likedByViewer: boolean;
  createdAt: string;
}

export interface PostCommentItem {
  id: number;
  author: ProfileSummary;
  body: string;
  createdAt: string;
}

export function getProfile(userId: number) {
  return getJson<{ ok: boolean; profile: SocialProfile }>(`/api/social/profiles/${userId}`);
}

export function updateMyProfile(input: { headline?: string; bio?: string; avatarUrl?: string; location?: string }) {
  return putJson<{ ok: boolean }>(`/api/social/profiles/me`, input);
}

export function searchPeople(params: { search?: string; cursor?: string | null } = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.cursor) query.set('cursor', params.cursor);
  return getJson<{ ok: boolean; people: ProfileSummary[]; nextCursor: string | null }>(
    `/api/social/people${query.size ? `?${query}` : ''}`,
  );
}

export function getCoworkers(userId: number) {
  return getJson<{ ok: boolean; coworkers: ProfileSummary[] }>(`/api/social/profiles/${userId}/coworkers`);
}

export function requestConnection(addresseeId: number) {
  return postJson<{ ok: boolean; connection: { id: number } }>(`/api/social/connections`, { addresseeId });
}

export function acceptConnection(connectionId: number) {
  return postJson<{ ok: boolean }>(`/api/social/connections/${connectionId}/accept`);
}

export function declineConnection(connectionId: number) {
  return postJson<{ ok: boolean }>(`/api/social/connections/${connectionId}/decline`);
}

export function removeConnection(connectionId: number) {
  return deleteJson<{ ok: boolean }>(`/api/social/connections/${connectionId}`);
}

export function listConnections(status: 'accepted' | 'pending_incoming' | 'pending_outgoing') {
  return getJson<{ ok: boolean; connections: ConnectionListItem[] }>(`/api/social/connections?status=${status}`);
}

export function getConnectionCounts() {
  return getJson<{ ok: boolean; counts: { accepted: number; pendingIncoming: number } }>(
    `/api/social/connections/counts`,
  );
}

export function getFeed(cursor?: string | null) {
  return getJson<{ ok: boolean; posts: FeedPost[]; nextCursor: string | null }>(
    `/api/social/feed${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
  );
}

export function createPost(input: { content: string; visibility: 'public' | 'connections' }) {
  return postJson<{ ok: boolean; post: FeedPost }>(`/api/social/posts`, input);
}

export function deletePost(postId: number) {
  return deleteJson<{ ok: boolean }>(`/api/social/posts/${postId}`);
}

export function likePost(postId: number) {
  return postJson<{ ok: boolean }>(`/api/social/posts/${postId}/like`);
}

export function unlikePost(postId: number) {
  return deleteJson<{ ok: boolean }>(`/api/social/posts/${postId}/like`);
}

export function getComments(postId: number) {
  return getJson<{ ok: boolean; comments: PostCommentItem[] }>(`/api/social/posts/${postId}/comments`);
}

export function addComment(postId: number, body: string) {
  return postJson<{ ok: boolean; comment: { id: number } }>(`/api/social/posts/${postId}/comments`, { body });
}
