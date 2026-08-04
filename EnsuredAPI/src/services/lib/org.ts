import jwt from 'jsonwebtoken';
import { User } from '../../db/models/identity.models';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';

export async function resolveOrganizationIdFromRequest(request: any): Promise<number | null> {
  const authHeader = (request.headers?.authorization as string) || (request.headers?.Authorization as string) || undefined;
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1];
  try {
    const payload: any = jwt.verify(token, JWT_SECRET);
    const userId = payload?.userId ?? payload?.id ?? null;
    if (!userId) return null;
    const user = await User.findByPk(Number(userId));
    if (!user) return null;
    return (user.organizationId ?? null) as number | null;
  } catch (err) {
    return null;
  }
}

/** Resolve the authenticated user's id from the request's Bearer JWT (no DB lookup). */
export function resolveUserIdFromRequest(request: any): number | null {
  const authHeader = (request.headers?.authorization as string) || (request.headers?.Authorization as string) || undefined;
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const payload: any = jwt.verify(m[1], JWT_SECRET);
    const userId = payload?.userId ?? payload?.id ?? null;
    return userId ? Number(userId) : null;
  } catch (err) {
    return null;
  }
}
