import { ScrubSignals } from './types';

/** Signature for a scrub provider — the one impure seam for hygiene signals. */
export type ScrubProvider = (address: string | null, domain: string | null) => Promise<ScrubSignals>;

/** Normalize a raw value into a bare domain, or null when it isn't one. (pure) */
export function toDomain(value: unknown): string | null {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return null;
  const sanitized = raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]?.trim();
  if (!sanitized || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(sanitized)) return null;
  return sanitized;
}

/** Heuristic: does this string plausibly look like a street address? (pure) */
export function looksLikeAddress(value: string | null): boolean {
  if (!value) return false;
  const v = value.trim();
  if (v.length < 8) return false;
  return /\d/.test(v) || v.includes(',');
}

/** Pure local fallback signals derived solely from the inputs. */
export function localScrubSignals(address: string | null, domain: string | null): ScrubSignals {
  return {
    addressValid: looksLikeAddress(address),
    domainSecure: Boolean(domain && !domain.includes('insecure') && !domain.endsWith('.invalid')),
    domain,
    address,
    provider: 'local-heuristics',
  };
}

/**
 * Default scrub provider: calls the configured third-party risk-enrichment API
 * when available, otherwise returns the local heuristic signals. This is the
 * impure adapter; the rest of the stage stays pure and receives its output.
 */
export const loadThirdPartySignals: ScrubProvider = async (address, domain) => {
  const fallback = localScrubSignals(address, domain);

  const apiUrl = process.env.RISK_ENRICHMENT_API_URL;
  if (!apiUrl) return fallback;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, domain }),
    });
    if (!res.ok) return fallback;
    const body = (await res.json()) as Record<string, unknown>;
    return {
      addressValid: Boolean(body.addressValid ?? fallback.addressValid),
      domainSecure: Boolean(body.domainSecure ?? fallback.domainSecure),
      domain,
      address,
      provider: String(body.provider ?? 'third-party-risk-api'),
    };
  } catch (_) {
    return fallback;
  }
};
