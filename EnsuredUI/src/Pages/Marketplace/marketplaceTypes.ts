export type MarketplaceOpportunity = {
  id: string;
  dealId: number;
  trancheId: number;
  fundingState: 'new' | 'partially_funded';
  dealName: string;
  dealStatus: string;
  trancheName: string;
  riskLevel: string;
  expectedReturnPct: number;
  maxLoss: number;
  durationMonths: number;
  capitalRequired: number;
  committedCapital: number;
  fundedAmount: number;
  pendingAmount: number;
  fundingProgressPct: number;
  startDate: string;
  endDate: string;
  lineOfBusiness?: string;
  lineOfBusinessSubType?: string;
  peril?: string;
  latitude?: number;
  longitude?: number;
};

export type AggregatedDeal = {
  dealId: number;
  dealName: string;
  dealStatus: string;
  startDate: string;
  endDate: string;
  tranches: MarketplaceOpportunity[];
  totalDealSize: number;
  durationMonths: number;
};

export type LineOfBusinessSubType = {
  code: string;
  label: string;
};

export type LineOfBusinessPrimaryType = {
  code: string;
  label: string;
  subTypes: LineOfBusinessSubType[];
};

export type MarketplaceSummary = {
  totalOpenCapacity: number;
  totalFunded: number;
  activeDeals: number;
};

export type LiveRiskEvent = {
  title?: string;
  place?: string;
  peril?: string;
  severityLevel?: 'low' | 'moderate' | 'high' | 'severe' | string;
};
