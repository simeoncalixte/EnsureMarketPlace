// Investors API — requests under `/api/investors`.
import { apiRequest } from './client';

/**
 * GET /api/investors/default — resolve a default investor context.
 * Raw Response: Investors.tsx checks status and formats its own messages.
 */
export function getDefaultInvestor(): Promise<Response> {
  return apiRequest('/api/investors/default', { method: 'GET' });
}

/** GET /api/investors/{investorUserId}/dashboard — investor dashboard payload. */
export function getInvestorDashboard(investorUserId: number): Promise<Response> {
  return apiRequest(`/api/investors/${investorUserId}/dashboard`, { method: 'GET' });
}
