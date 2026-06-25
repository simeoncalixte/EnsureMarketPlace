import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import styled from 'styled-components';
import { colors } from '../../xds/colors';
import Button from '../../xds/components/Button';
import PostCard from '../../xds/components/PostCard';
import PostComposer from '../../xds/components/PostComposer';
import CommentThread, { type XdsCommentItem } from '../../xds/components/CommentThread';
import { useAuthMe } from '../../lib/useAuthMe';
import * as socialApi from '../../api/social';

const Page = styled.div`
  display: grid;
  gap: 20px;
  padding: 24px;
  max-width: 720px;
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: 22px;
  color: ${colors.onSurface};
`;

const EmptyState = styled.div`
  padding: 32px;
  text-align: center;
  color: ${colors.onSurfaceVariant};
  font-size: 14px;
`;

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function FeedPage() {
  const navigate = useNavigate();
  const { user } = useAuthMe();
  const [posts, setPosts] = useState<socialApi.FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openComments, setOpenComments] = useState<Record<number, XdsCommentItem[] | 'loading'>>({});

  const load = useCallback(async (nextCursor?: string | null) => {
    const res = await socialApi.getFeed(nextCursor ?? undefined);
    setPosts((prev) => (nextCursor ? [...prev, ...res.posts] : res.posts));
    setCursor(res.nextCursor);
  }, []);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  const publish = async (content: string, visibility: 'public' | 'connections') => {
    setBusy(true);
    try {
      await socialApi.createPost({ content, visibility });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const toggleLike = async (post: socialApi.FeedPost) => {
    // Optimistic flip; reconcile on failure by reloading.
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likedByViewer: !p.likedByViewer, likeCount: p.likeCount + (p.likedByViewer ? -1 : 1) }
          : p,
      ),
    );
    try {
      if (post.likedByViewer) await socialApi.unlikePost(post.id);
      else await socialApi.likePost(post.id);
    } catch {
      await load();
    }
  };

  const loadComments = async (postId: number) => {
    setOpenComments((prev) => ({ ...prev, [postId]: 'loading' }));
    const res = await socialApi.getComments(postId);
    setOpenComments((prev) => ({
      ...prev,
      [postId]: res.comments.map((comment) => ({
        id: comment.id,
        authorName: `${comment.author.firstName ?? ''} ${comment.author.lastName ?? ''}`.trim() || `User ${comment.author.userId}`,
        body: comment.body,
        createdAt: timeAgo(comment.createdAt),
      })),
    }));
  };

  const toggleComments = (postId: number) => {
    if (openComments[postId]) {
      setOpenComments((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    } else {
      void loadComments(postId);
    }
  };

  const addComment = async (post: socialApi.FeedPost, body: string) => {
    await socialApi.addComment(post.id, body);
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, commentCount: p.commentCount + 1 } : p)));
    await loadComments(post.id);
  };

  const deletePost = async (postId: number) => {
    await socialApi.deletePost(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <Page>
      <PageTitle>Feed</PageTitle>
      <PostComposer busy={busy} onSubmit={(content, visibility) => publish(content, visibility)} />

      {posts.length === 0 && <EmptyState>Nothing here yet — share the first update with your network.</EmptyState>}

      {posts.map((post) => {
        const comments = openComments[post.id];
        return (
          <PostCard
            key={post.id}
            authorName={`${post.author.firstName} ${post.author.lastName}`}
            authorHeadline={post.author.headline}
            avatarUrl={post.author.avatarUrl}
            content={post.content}
            createdAt={timeAgo(post.createdAt)}
            likeCount={post.likeCount}
            commentCount={post.commentCount}
            likedByViewer={post.likedByViewer}
            onToggleLike={() => void toggleLike(post)}
            onToggleComments={() => toggleComments(post.id)}
            onAuthorClick={() => navigate(`/profile/${post.author.userId}`)}
            canDelete={user?.id === post.author.userId}
            onDelete={() => void deletePost(post.id)}
          >
            {comments && comments !== 'loading' && (
              <CommentThread comments={comments} onAddComment={(body) => addComment(post, body)} />
            )}
          </PostCard>
        );
      })}

      {cursor && (
        <Button variant="secondary" onClick={() => void load(cursor)}>Load older posts</Button>
      )}
    </Page>
  );
}
