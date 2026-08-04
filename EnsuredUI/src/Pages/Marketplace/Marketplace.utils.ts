import type { Row as DataTableRow } from '../../xds/components/DataTable';
import type {
  AggregatedDeal,
  MarketplaceOpportunity,
} from './marketplaceTypes';

export function toCompactParts(value?: number): { value: string; suffix: string } {
  if (!Number.isFinite(value as number)) {
    return { value: '0', suffix: '' };
  }

  const v = value as number;
  const absValue = Math.abs(v);
  if (absValue >= 1_000_000_000) {
    return { value: (v / 1_000_000_000).toFixed(2), suffix: 'B' };
  }
  if (absValue >= 1_000_000) {
    return { value: (v / 1_000_000).toFixed(1), suffix: 'M' };
  }
  if (absValue >= 1_000) {
    return { value: (v / 1_000).toFixed(1), suffix: 'K' };
  }

  return { value: v.toFixed(0), suffix: '' };
}

export function formatShortCurrency(value: number): string {
  const compact = toCompactParts(value);
  return `$${compact.value}${compact.suffix}`;
}

export function formatPct(value: number): string {
  return `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`;
}

/**
 * Honest presentation of the API's riskLevel value. No invented letter grades:
 * the platform's risk engine doesn't score tranches yet, so we surface the
 * underwriter-supplied level verbatim (and say so when it's missing).
 */
export function riskPresentation(
  riskLevel: string
): { label: string; score: string; highRisk: boolean } {
  const normalized = String(riskLevel || '').toLowerCase();
  if (normalized === 'high') {
    return { label: 'High Risk', score: 'HIGH', highRisk: true };
  }
  if (normalized === 'medium') {
    return { label: 'Medium Risk', score: 'MED', highRisk: false };
  }
  if (normalized === 'low') {
    return { label: 'Low Risk', score: 'LOW', highRisk: false };
  }
  return { label: 'Unrated', score: '—', highRisk: false };
}

/**
 * Display name for a deal: seeded fixtures carry a machine suffix
 * ("Gulf Wind Layer seed1781012529378") that should never reach the UI.
 */
export function cleanDealName(dealName: string): string {
  return String(dealName || '').replace(/\s*seed\d+\S*\s*$/i, '').trim() || dealName;
}

/** Accent tone derived from the deal's tranche risk levels (not its name). */
export function dealTone(
  tranches: MarketplaceOpportunity[]
): 'primary' | 'secondary' | 'tertiary' {
  const levels = tranches.map((t) => String(t.riskLevel || '').toLowerCase());
  if (levels.some((level) => level === 'high')) {
    return 'tertiary';
  }
  if (levels.length > 0 && levels.every((level) => level === 'low')) {
    return 'secondary';
  }
  return 'primary';
}

/** Badge label from the deal's line of business (set by the risk-class registry). */
export function dealBadgeLabel(tranches: MarketplaceOpportunity[]): string {
  const lineOfBusiness = tranches.find((t) => t.lineOfBusiness)?.lineOfBusiness;
  return lineOfBusiness ?? 'Risk Layer';
}

export function formatDealReference(deal: AggregatedDeal): string {
  const year = (deal.startDate || deal.endDate || '').slice(0, 4) || '2026';
  const initials =
    cleanDealName(deal.dealName)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'DL';

  return `#${initials}-${year}-${String(deal.dealId).padStart(2, '0')}`;
}

/** Caption under a tranche name: its line-of-business subtype, when the data has one. */
export function trancheCaption(opportunity: MarketplaceOpportunity): string {
  return opportunity.lineOfBusinessSubType ?? '';
}

export function trancheTone(
  riskLevel: string
): 'primary' | 'secondary' | 'tertiary' {
  const normalized = String(riskLevel || '').toLowerCase();
  if (normalized === 'high') {
    return 'tertiary';
  }
  if (normalized === 'low') {
    return 'secondary';
  }
  return 'primary';
}

export function toMarketplaceTableRows(
  opportunities: MarketplaceOpportunity[]
): DataTableRow[] {
  return opportunities.map((opportunity) => {
    const risk = riskPresentation(opportunity.riskLevel);

    return {
      id: `#${opportunity.dealId}-${opportunity.trancheId}`,
      tranche: `${cleanDealName(opportunity.dealName)} ${opportunity.trancheName} (${formatPct(opportunity.expectedReturnPct)})`,
      value: formatShortCurrency(opportunity.pendingAmount).replace('$', ''),
      status: risk.highRisk ? 'HIGH RISK' : 'ACTIVE',
      statusVariant: risk.highRisk ? 'error' : 'secondary',
    };
  });
}
