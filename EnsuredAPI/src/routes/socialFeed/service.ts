import { Op } from 'sequelize';
import { User } from '../../db/models/identity.models';
import { Post, PostComment, PostLike } from '../../db/models/social.models';
import { profileSummariesFor } from '../socialProfiles';

export const MAX_POST_LENGTH = 4000;

/** Keyset cursor: `${createdAtMs}|${id}` of the last item on the previous page. */
export function parseCursor(raw: string | undefined): { createdAt: Date; id: number } | null {
  if (!raw) return null;
  const [ms, id] = raw.split('|').map(Number);
  if (!Number.isFinite(ms) || !Number.isFinite(id)) return null;
  return { createdAt: new Date(ms), id };
}

export async function decoratePosts(posts: Post[], viewerId: number) {
  const postIds = posts.map((p) => p.id);
  const authorIds = [...new Set(posts.map((p) => p.authorId))];
  const [authors, likes, likeCounts, commentCounts] = await Promise.all([
    authorIds.length ? User.findAll({ where: { id: { [Op.in]: authorIds } } }) : [],
    postIds.length ? PostLike.findAll({ where: { postId: { [Op.in]: postIds }, userId: viewerId } }) : [],
    postIds.length
      ? PostLike.findAll({
          where: { postId: { [Op.in]: postIds } },
          attributes: ['postId', [PostLike.sequelize!.fn('COUNT', '*'), 'count']],
          group: ['postId'],
          raw: true,
        })
      : [],
    postIds.length
      ? PostComment.findAll({
          where: { postId: { [Op.in]: postIds } },
          attributes: ['postId', [PostComment.sequelize!.fn('COUNT', '*'), 'count']],
          group: ['postId'],
          raw: true,
        })
      : [],
  ]);

  const summaries = await profileSummariesFor(authors as User[]);
  const authorByUser = new Map(summaries.map((s) => [s.userId, s]));
  const likedPostIds = new Set((likes as PostLike[]).map((l) => l.postId));
  const likeCountByPost = new Map((likeCounts as unknown as { postId: number; count: string }[]).map((r) => [r.postId, Number(r.count)]));
  const commentCountByPost = new Map(
    (commentCounts as unknown as { postId: number; count: string }[]).map((r) => [r.postId, Number(r.count)]),
  );

  return posts.map((post) => ({
    id: post.id,
    author: authorByUser.get(post.authorId) ?? { userId: post.authorId },
    content: post.content,
    visibility: post.visibility,
    attachments: post.attachmentsJson ?? [],
    likeCount: likeCountByPost.get(post.id) ?? 0,
    commentCount: commentCountByPost.get(post.id) ?? 0,
    likedByViewer: likedPostIds.has(post.id),
    createdAt: post.createdAt,
  }));
}
