export function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const ACTIVE_DEAL_STATUSES = new Set(['approved', 'fundraising', 'active']);
