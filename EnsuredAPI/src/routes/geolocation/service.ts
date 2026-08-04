/**
 * Small request-shaping helpers shared by the geolocation handlers.
 */

export function badRequest(message: string): Error {
  const err = new Error(message) as Error & { statusCode?: number; code?: string };
  err.statusCode = 400;
  err.code = 'REQUEST_ERROR';
  return err;
}

export function clampLimit(value: unknown): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(Math.floor(n), 10);
}
