// Analytics API — requests under `/api/analytics`.
import { getJson } from './client';

export type HealthRow = {
  month: string;
  gwp: number;
  earnedPremium: number;
  lossAmount: number;
  lossRatio: number;
  expenseRatio: number;
  combinedRatio: number;
};
export type LobRow = { line: string; premium: number; losses: number; net: number };
export type SolvencyRow = { month: string; solvencyRatio: number; totalCapital: number; requiredCapital: number };
export type ReinsRow = { name: string; retained: number; ceded: number };
export type ConcentrationRow = { region: string; perilType: string; exposure: number };

/** GET /api/analytics/financial-health?months={months} */
export function getFinancialHealth(months = 12): Promise<HealthRow[]> {
  return getJson<HealthRow[]>(`/api/analytics/financial-health?months=${months}`);
}

/** GET /api/analytics/profitability-by-lob */
export function getProfitabilityByLob(): Promise<LobRow[]> {
  return getJson<LobRow[]>('/api/analytics/profitability-by-lob');
}

/** GET /api/analytics/capital-adequacy?months={months} */
export function getCapitalAdequacy(months = 12): Promise<SolvencyRow[]> {
  return getJson<SolvencyRow[]>(`/api/analytics/capital-adequacy?months=${months}`);
}

/** GET /api/analytics/reinsurance-utilization */
export function getReinsuranceUtilization(): Promise<ReinsRow[]> {
  return getJson<ReinsRow[]>('/api/analytics/reinsurance-utilization');
}

/** GET /api/analytics/exposure-concentration */
export function getExposureConcentration(): Promise<ConcentrationRow[]> {
  return getJson<ConcentrationRow[]>('/api/analytics/exposure-concentration');
}
