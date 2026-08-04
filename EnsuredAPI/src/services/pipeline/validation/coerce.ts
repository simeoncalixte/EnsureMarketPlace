// Pure coercion/normalization helpers shared across the validation stage and
// the appetite engine. No I/O, no side effects — safe to unit test in isolation
// and to compose freely.

/** Treat any value as a plain record; non-objects collapse to `{}`. */
export function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
}

/** Trim to a non-empty string, or null when blank/absent. */
export function asText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

/** Parse a finite number, or null when not numeric. */
export function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/** Lowercased, trimmed, de-blanked string list (non-arrays → []). */
export function toList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim().toLowerCase()).filter((item) => item.length > 0);
}

/**
 * Returns the first candidate that is present and non-blank, preserving the
 * caller's precedence order. Unlike `??`, it also skips empty/whitespace
 * strings so a blank earlier source falls through to a populated later one.
 */
export function firstNonEmpty(...values: unknown[]): unknown {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim().length === 0) continue;
    return value;
  }
  return undefined;
}
