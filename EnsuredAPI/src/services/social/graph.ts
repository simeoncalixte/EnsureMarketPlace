import { Op } from 'sequelize';
import { Connection } from '../../db/models/social.models';

export type PairStatus = 'none' | 'pending_outgoing' | 'pending_incoming' | 'connected' | 'blocked';

/** The connection row between two users regardless of who initiated it. */
export async function findPairConnection(userA: number, userB: number): Promise<Connection | null> {
  return Connection.findOne({
    where: {
      [Op.or]: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    },
  });
}

/** Connection status from the viewer's perspective. */
export function pairStatusFor(viewerId: number, connection: Connection | null): PairStatus {
  if (!connection || connection.status === 'declined') return 'none';
  if (connection.status === 'blocked') return 'blocked';
  if (connection.status === 'accepted') return 'connected';
  return connection.requesterId === viewerId ? 'pending_outgoing' : 'pending_incoming';
}

export async function countAcceptedConnections(userId: number): Promise<number> {
  return Connection.count({
    where: {
      status: 'accepted',
      [Op.or]: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });
}

/** Ids of every user the given user is connected with (accepted only). */
export async function acceptedConnectionUserIds(userId: number): Promise<number[]> {
  const rows = await Connection.findAll({
    where: {
      status: 'accepted',
      [Op.or]: [{ requesterId: userId }, { addresseeId: userId }],
    },
    attributes: ['requesterId', 'addresseeId'],
  });
  return rows.map((row) => (row.requesterId === userId ? row.addresseeId : row.requesterId));
}

export async function areConnected(userA: number, userB: number): Promise<boolean> {
  const connection = await findPairConnection(userA, userB);
  return connection?.status === 'accepted';
}
