import { FastifyPluginAsync } from 'fastify';
import { Op } from 'sequelize';
import { Notification, User } from '../db/models/identity.models';
import { Post, PostComment, PostLike } from '../db/models/social.models';
import { acceptedConnectionUserIds } from '../social/graph';
import { broadcastToUser } from '../social/realtime/socketRegistry';
import { profileSummariesFor } from './socialProfiles';
import { resolveUser } from './helpers/resolveUser';

const MAX_POST_LENGTH = 4000;

/** Keyset cursor: `${createdAtMs}|${id}` of the last item on the previous page. */
function parseCursor(raw: string | undefined): { createdAt: Date; id: number } | null {
  if (!raw) return null;
  const [ms, id] = raw.split('|').map(Number);
  if (!Number.isFinite(ms) || !Number.isFinite(id)) return null;
  return { createdAt: new Date(ms), id };
}

async function decoratePosts(posts: Post[], viewerId: number) {
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

export const socialFeedRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { cursor?: string; limit?: string } }>('/social/feed', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const limit = Math.min(Number(request.query.limit) || 20, 50);
    const cursor = parseCursor(request.query.cursor);
    const connectedIds = await acceptedConnectionUserIds(user.id);

    // Own posts + connections' posts + anything public.
    const visibilityWhere = {
      [Op.or]: [
        { authorId: { [Op.in]: [user.id, ...connectedIds] } },
        { visibility: 'public' },
      ],
    };
    const cursorWhere = cursor
      ? {
          [Op.or]: [
            { createdAt: { [Op.lt]: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { [Op.lt]: cursor.id } },
          ],
        }
      : {};

    const posts = await Post.findAll({
      where: { [Op.and]: [{ deletedAt: null }, visibilityWhere, cursorWhere] },
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: limit + 1,
    });

    const page = posts.slice(0, limit);
    const last = page[page.length - 1];
    return reply.send({
      ok: true,
      posts: await decoratePosts(page, user.id),
      nextCursor: posts.length > limit && last ? `${last.createdAt.getTime()}|${last.id}` : null,
    });
  });

  app.post<{ Body: { content?: string; visibility?: string; attachments?: Record<string, unknown>[] } }>(
    '/social/posts',
    async (request, reply) => {
      const user = await resolveUser(request, reply);
      if (!user) return reply;

      const content = (request.body?.content ?? '').trim();
      if (!content) return reply.code(400).send({ ok: false, error: 'content_required' });
      if (content.length > MAX_POST_LENGTH) return reply.code(400).send({ ok: false, error: 'content_too_long' });

      const visibility = request.body?.visibility === 'connections' ? 'connections' : 'public';
      const post = await Post.create({
        authorId: user.id,
        content,
        visibility,
        attachmentsJson: request.body?.attachments ?? null,
        deletedAt: null,
      });

      const [decorated] = await decoratePosts([post], user.id);
      return reply.code(201).send({ ok: true, post: decorated });
    },
  );

  app.delete<{ Params: { id: string } }>('/social/posts/:id', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const post = await Post.findByPk(Number(request.params.id));
    if (!post || post.deletedAt) return reply.code(404).send({ ok: false, error: 'post_not_found' });
    if (post.authorId !== user.id) return reply.code(403).send({ ok: false, error: 'not_author' });

    await post.update({ deletedAt: new Date() });
    return reply.send({ ok: true });
  });

  /** A post is readable when public, own, or authored by a connection. */
  async function canViewPost(viewerId: number, post: Post): Promise<boolean> {
    if (post.visibility === 'public' || post.authorId === viewerId) return true;
    const connectedIds = await acceptedConnectionUserIds(viewerId);
    return connectedIds.includes(post.authorId);
  }

  app.post<{ Params: { id: string } }>('/social/posts/:id/like', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const post = await Post.findByPk(Number(request.params.id));
    if (!post || post.deletedAt) return reply.code(404).send({ ok: false, error: 'post_not_found' });
    if (!(await canViewPost(user.id, post))) return reply.code(403).send({ ok: false, error: 'not_visible' });

    const [, created] = await PostLike.findOrCreate({ where: { postId: post.id, userId: user.id } });
    if (created && post.authorId !== user.id) {
      await Notification.create({
        userId: post.authorId,
        type: 'post_liked',
        message: `${user.firstName} ${user.lastName} liked your post.`,
        readAt: null,
      });
      broadcastToUser(post.authorId, { type: 'notification.new', payload: { kind: 'post_liked', postId: post.id } });
    }
    return reply.send({ ok: true });
  });

  app.delete<{ Params: { id: string } }>('/social/posts/:id/like', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    await PostLike.destroy({ where: { postId: Number(request.params.id), userId: user.id } });
    return reply.send({ ok: true });
  });

  app.get<{ Params: { id: string } }>('/social/posts/:id/comments', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const post = await Post.findByPk(Number(request.params.id));
    if (!post || post.deletedAt) return reply.code(404).send({ ok: false, error: 'post_not_found' });
    if (!(await canViewPost(user.id, post))) return reply.code(403).send({ ok: false, error: 'not_visible' });

    const comments = await PostComment.findAll({
      where: { postId: post.id },
      order: [['createdAt', 'ASC']],
      limit: 200,
    });
    const authors = comments.length
      ? await User.findAll({ where: { id: { [Op.in]: [...new Set(comments.map((c) => c.authorId))] } } })
      : [];
    const summaries = await profileSummariesFor(authors);
    const authorByUser = new Map(summaries.map((s) => [s.userId, s]));

    return reply.send({
      ok: true,
      comments: comments.map((c) => ({
        id: c.id,
        author: authorByUser.get(c.authorId) ?? { userId: c.authorId },
        body: c.body,
        createdAt: c.createdAt,
      })),
    });
  });

  app.post<{ Params: { id: string }; Body: { body?: string } }>('/social/posts/:id/comments', async (request, reply) => {
    const user = await resolveUser(request, reply);
    if (!user) return reply;

    const post = await Post.findByPk(Number(request.params.id));
    if (!post || post.deletedAt) return reply.code(404).send({ ok: false, error: 'post_not_found' });
    if (!(await canViewPost(user.id, post))) return reply.code(403).send({ ok: false, error: 'not_visible' });

    const body = (request.body?.body ?? '').trim();
    if (!body) return reply.code(400).send({ ok: false, error: 'body_required' });
    if (body.length > MAX_POST_LENGTH) return reply.code(400).send({ ok: false, error: 'body_too_long' });

    const comment = await PostComment.create({ postId: post.id, authorId: user.id, body });
    if (post.authorId !== user.id) {
      await Notification.create({
        userId: post.authorId,
        type: 'post_commented',
        message: `${user.firstName} ${user.lastName} commented on your post.`,
        readAt: null,
      });
      broadcastToUser(post.authorId, { type: 'notification.new', payload: { kind: 'post_commented', postId: post.id } });
    }
    return reply.code(201).send({ ok: true, comment });
  });
};
