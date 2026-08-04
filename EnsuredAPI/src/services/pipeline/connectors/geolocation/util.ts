/** Shared coercion helpers for the geolocation adapters (mirror the geocoding connectors). */

export function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

export function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
