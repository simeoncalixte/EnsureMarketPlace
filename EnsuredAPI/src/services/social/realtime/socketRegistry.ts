/**
 * Per-user websocket registry. Decoupled from the route layer so domain code
 * (messages, connections, notifications) can fire events without knowing
 * whether anyone is listening — broadcasting to a user with no open sockets
 * is a silent no-op, which also keeps everything inert under tests.
 */

export type SocialEventType =
  | 'message.new'
  | 'notification.new'
  | 'connection.requested'
  | 'connection.accepted';

export interface SocialEvent {
  type: SocialEventType;
  payload: Record<string, unknown>;
}

interface SocketLike {
  readyState: number;
  send(data: string): void;
}

const OPEN = 1;
const socketsByUser = new Map<number, Set<SocketLike>>();

export function registerSocket(userId: number, socket: SocketLike): void {
  let set = socketsByUser.get(userId);
  if (!set) {
    set = new Set();
    socketsByUser.set(userId, set);
  }
  set.add(socket);
}

export function unregisterSocket(userId: number, socket: SocketLike): void {
  const set = socketsByUser.get(userId);
  if (!set) return;
  set.delete(socket);
  if (set.size === 0) socketsByUser.delete(userId);
}

export function broadcastToUser(userId: number, event: SocialEvent): void {
  const set = socketsByUser.get(userId);
  if (!set) return;
  const data = JSON.stringify(event);
  for (const socket of set) {
    if (socket.readyState === OPEN) {
      try {
        socket.send(data);
      } catch {
        // A dying socket must never break the domain operation that emitted the event.
      }
    }
  }
}

export function connectedUserIds(): number[] {
  return [...socketsByUser.keys()];
}

export function hasOpenSocket(userId: number): boolean {
  const set = socketsByUser.get(userId);
  if (!set) return false;
  for (const socket of set) {
    if (socket.readyState === OPEN) return true;
  }
  return false;
}
