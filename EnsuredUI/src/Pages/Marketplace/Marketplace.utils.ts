import type { Row as DataTableRow } from '../../xds/components/DataTable';
import type {
  AggregatedDeal,
  MarketplaceOpportunity,
} from './useMarketplaceData';

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

export function riskPresentation(
  riskLevel: string
): { label: string; score: string; highRisk: boolean } {
  const normalized = String(riskLevel || '').toLowerCase();
  if (normalized === 'high') {
    return { label: 'High Risk', score: 'D+', highRisk: true };
  }
  if (normalized === 'medium') {
    return { label: 'Balanced', score: 'B', highRisk: false };
  }
  return { label: 'Cat Layer', score: 'A-', highRisk: false };
}

export function fundingStateLabel(
  state: MarketplaceOpportunity['fundingState']
): string {
  if (state === 'new') {
    return 'New Opportunity - 0% Funded';
  }
  return 'Partially Funded';
}

export function dealTone(
  dealName: string,
  tranches: MarketplaceOpportunity[]
): 'primary' | 'secondary' | 'tertiary' {
  const normalized = dealName.toLowerCase();
  if (normalized.includes('earthquake') || normalized.includes('seismic')) {
    return 'secondary';
  }

  const hasHighRisk = tranches.some(
    (tranche) => riskPresentation(tranche.riskLevel).highRisk
  );
  if (hasHighRisk) {
    return 'tertiary';
  }

  return 'primary';
}

export function dealBadgeLabel(dealName: string): string {
  const normalized = dealName.toLowerCase();
  if (normalized.includes('hurricane') || normalized.includes('cat')) {
    return 'Hurricane Cat';
  }
  if (normalized.includes('earthquake') || normalized.includes('seismic')) {
    return 'Seismic Event';
  }
  if (normalized.includes('wildfire')) {
    return 'Wildfire Layer';
  }
  if (normalized.includes('flood')) {
    return 'Flood Risk';
  }
  return 'Structured Risk';
}

export function formatDealReference(deal: AggregatedDeal): string {
  const year = (deal.startDate || deal.endDate || '').slice(0, 4) || '2026';
  const initials =
    deal.dealName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'DL';

  return `#${initials}-${year}-${String(deal.dealId).padStart(2, '0')}`;
}

export function trancheCaption(trancheName: string, index: number): string {
  const normalized = trancheName.toLowerCase();
  if (normalized.includes('senior')) {
    return '1st Loss Protection Layer';
  }
  if (normalized.includes('mezz')) {
    return 'Excess of Loss Layer';
  }
  if (normalized.includes('equity') || normalized.includes('residual')) {
    return 'High Yield Junior Layer';
  }
  if (normalized.includes('parametric')) {
    return 'Immediate Liquidity Trigger';
  }
  return `Structured Tranche ${index + 1}`;
}

export function trancheTone(
  riskLevel: string
): 'primary' | 'secondary' | 'tertiary' {
  const risk = riskPresentation(riskLevel);
  if (risk.highRisk) {
    return 'tertiary';
  }
  if (risk.score.startsWith('A')) {
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
      tranche: `${opportunity.trancheName} (${formatPct(opportunity.expectedReturnPct)})`,
      value: formatShortCurrency(opportunity.pendingAmount).replace('$', ''),
      status: risk.highRisk ? 'HIGH RISK' : 'ACTIVE',
      statusVariant: risk.highRisk ? 'error' : 'secondary',
    };
  });
}
