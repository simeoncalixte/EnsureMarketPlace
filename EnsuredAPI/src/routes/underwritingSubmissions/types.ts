import { type SubmissionPriority } from '../../services/lib/boardFormat';

export type SubmissionStageKey = 'intake' | 'analysis' | 'pricing' | 'closed';

export type BoardFieldFormat = 'text' | 'currency' | 'number' | 'date' | 'badge';
export type BoardFieldSection = 'facts' | 'body';

export type BoardFieldDefinition = {
  key: string;
  label: string;
  valueKey: string;
  format?: BoardFieldFormat;
  section?: BoardFieldSection;
  badgeSource?: 'priority' | 'stage';
};

export type BoardHeaderDefinition = {
  titleFieldKey: string;
  subtitleFieldKey?: string;
  badgeFieldKey?: string;
};

export type BoardStageDefinition = {
  key: SubmissionStageKey | string;
  label: string;
  statuses: string[];
  accent: string;
  background: string;
  border: string;
  description: string;
  emptyState: string;
};

export type BoardConfig = {
  eyebrow: string;
  title: string;
  description: string;
  header: BoardHeaderDefinition;
  tableColumns: BoardFieldDefinition[];
  cardFields: BoardFieldDefinition[];
  stages: BoardStageDefinition[];
};

export type DashboardSummaryCard = {
  label: string;
  value: number;
  meta: string;
  format: 'number' | 'currency';
};

export type DashboardItem = {
  id: number;
  status: string;
  stageKey: string;
  stageLabel: string;
  stageAccent: string;
  stageBackground: string;
  stageBorder: string;
  nextStatus: string | null;
  nextStageKey: string | null;
  nextStageLabel: string | null;
  nextStageAccent: string | null;
  priority: SubmissionPriority;
  values: Record<string, string | number | null>;
};

export type DashboardResponse = {
  config: BoardConfig;
  summary: DashboardSummaryCard[];
  items: DashboardItem[];
  refreshedAt: string;
};
