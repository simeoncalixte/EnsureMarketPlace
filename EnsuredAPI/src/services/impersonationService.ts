import jwt from 'jsonwebtoken';

export interface ImpersonationTokenPayload {
  userId: number;
  role: string;
  impersonatorId?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_for_impersonation';
const DEFAULT_EXP_SECONDS = 60 * 60; // 1 hour

export function createImpersonationToken(
  user: { id: number; role: string },
  impersonatorId?: number,
  expiresInSeconds = DEFAULT_EXP_SECONDS,
) {
  const payload: ImpersonationTokenPayload = {
    userId: user.id,
    role: user.role,
  };
  if (impersonatorId) payload.impersonatorId = impersonatorId;
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: expiresInSeconds });
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  return { token, expiresAt };
}
