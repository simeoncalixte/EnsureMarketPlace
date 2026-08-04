import { FastifyPluginAsync } from 'fastify';
import { registerSocket, unregisterSocket } from '../../services/social/realtime/socketRegistry';
import { verifyTokenUserId } from '../helpers/resolveUser';

const HEARTBEAT_MS = 30_000;

/**
 * Realtime channel for the social network (new messages, notifications,
 * connection events). Browsers cannot set headers on WebSocket upgrades, so
 * the JWT travels as a query param — redacted from logs via the app's logger
 * serializer config. See ./README.md for the concern map.
 */
export const socialSocketRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { token?: string } }>('/social/ws', { websocket: true }, (connection, request) => {
    const socket = (connection as unknown as { socket?: import('ws').WebSocket }).socket ?? (connection as unknown as import('ws').WebSocket);
    const userId = verifyTokenUserId(request.query.token ?? '');
    if (userId == null) {
      socket.close(4401, 'unauthorized');
      return;
    }

    registerSocket(userId, socket);

    const heartbeat = setInterval(() => {
      if (socket.readyState === socket.OPEN) socket.ping();
    }, HEARTBEAT_MS);

    socket.on('close', () => {
      clearInterval(heartbeat);
      unregisterSocket(userId, socket);
    });
    socket.on('error', () => {
      clearInterval(heartbeat);
      unregisterSocket(userId, socket);
    });
  });
};
