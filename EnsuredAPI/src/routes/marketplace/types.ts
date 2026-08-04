import type { Deal, RiskPortfolio, Tranche, TrancheSubscription } from '../../db/models';
import type { PageTemplateDefinition } from '../../db/models/pageTemplates.models';

export interface MarketplaceOpportunity {
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
  peril?: string;
  lineOfBusinessSubType?: string;
  latitude?: number;
  longitude?: number;
}

export type TrancheWithRelations = Tranche & {
  deal?: Deal & { portfolio?: RiskPortfolio };
  subscriptions?: TrancheSubscription[];
  latitude?: unknown;
  longitude?: unknown;
};

export type LineOfBusinessTaxonomyNode = {
  code: string;
  label: string;
  subTypes: Array<{
    code: string;
    label: string;
  }>;
};

export type PerilTaxonomyNode = {
  code: string;
  label: string;
  description: string | null;
  perils: Array<{
    code: string;
    label: string;
    description: string | null;
    isCatastrophe: boolean;
  }>;
};

export type LineOfBusinessSelectionResolution = {
  primaryCode: string;
  primaryLabel: string;
  subTypeCode: string;
  subTypeLabel: string;
};

export type SubjectTemplateResolution = {
  definitionJson: PageTemplateDefinition;
  isOrgTemplate: boolean;
  scopeKey: string;
  organizationId: number | null;
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
};

export type FindInsuredSubjectsTemplateResult = {
  definitionJson: PageTemplateDefinition;
  isOrgTemplate: boolean;
  scopeKey: string;
  organizationId: number | null;
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
};

export type LobSelection = { primaryCode: string; subTypeCode: string };

export type RiskClassTemplateResolution = {
  definitionJson: PageTemplateDefinition;
  isOrgTemplate: boolean;
  scopeKey: string;
  organizationId: number | null;
  lineOfBusinessCode: string;
  lineOfBusinessSubTypeCode: string;
  sourceTemplateId: number | null;
};
