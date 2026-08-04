/**
 * Prorated earned premium for a single policy within a calendar month.
 * earnedPremium = premium × (overlap days in month / total policy days)
 */
export function earnedInMonth(
  premium: number,
  effectiveDate: Date,
  expirationDate: Date,
  monthStart: Date,
  monthEnd: Date, // exclusive (first day of next month)
): number {
  const policyMs = expirationDate.getTime() - effectiveDate.getTime();
  if (policyMs <= 0) return 0;
  const overlapStart = Math.max(effectiveDate.getTime(), monthStart.getTime());
  const overlapEnd = Math.min(expirationDate.getTime(), monthEnd.getTime());
  if (overlapEnd <= overlapStart) return 0;
  return premium * ((overlapEnd - overlapStart) / policyMs);
}

export function toN(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Deterministic pseudo-random in [0,1) keyed on an integer seed */
export function pr(seed: number): number {
  const x = Math.sin(seed + 1.618) * 99991;
  return x - Math.floor(x);
}

export function fmtMoney(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}
