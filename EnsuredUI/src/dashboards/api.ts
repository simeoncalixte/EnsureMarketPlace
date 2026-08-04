// API calls for the configurable Home dashboards. Thin wrappers over the shared
// JSON client (src/api/client.ts). The user-tier endpoints derive the caller
// from the bearer token; the org-tier endpoints are admin-only and org-scoped.

import { deleteJson, getJson, postJson, putJson } from '../api/client';
import type { DashboardLayoutDoc, ResolvedDashboard, SurfaceKey } from './types';
import type { MetricDefinition, MetricResult, ModelFieldCatalog } from './metricTypes';

/** Resolve the effective layout for the current user, with editor context. */
export function getDashboard(surfaceKey: SurfaceKey): Promise<ResolvedDashboard> {
  return getJson<ResolvedDashboard>(`/api/dashboards/${surfaceKey}/layout`);
}

/** Save the current user's layout for a surface. */
export function saveUserLayout(
  surfaceKey: SurfaceKey,
  layout: DashboardLayoutDoc,
): Promise<{ surfaceKey: SurfaceKey; source: 'user'; effective: DashboardLayoutDoc }> {
  return putJson(`/api/dashboards/${surfaceKey}/layout`, { layout });
}

/** Delete the current user's layout, falling back to org/platform. */
export function resetUserLayout(surfaceKey: SurfaceKey): Promise<ResolvedDashboard> {
  return deleteJson<ResolvedDashboard>(`/api/dashboards/${surfaceKey}/layout`);
}

/** Save an organization's layout (admin-only). */
export function saveOrgLayout(
  organizationId: number,
  surfaceKey: SurfaceKey,
  layout: DashboardLayoutDoc,
): Promise<{ surfaceKey: SurfaceKey; source: 'org'; effective: DashboardLayoutDoc }> {
  return putJson(`/api/organizations/${organizationId}/dashboards/${surfaceKey}/layout`, { layout });
}

/** Delete an organization's layout (admin-only). */
export function resetOrgLayout(organizationId: number, surfaceKey: SurfaceKey): Promise<void> {
  return deleteJson<void>(`/api/organizations/${organizationId}/dashboards/${surfaceKey}/layout`);
}

/** The org's model-field catalog — the backend attributes a metric can select. */
export function getModelCatalog(organizationId: number): Promise<ModelFieldCatalog> {
  return getJson<ModelFieldCatalog>(`/api/organizations/${organizationId}/governance/model-catalog`);
}

/** Evaluate a custom metric against live, org-scoped data. */
export function evaluateMetric(definition: MetricDefinition): Promise<MetricResult> {
  return postJson<MetricResult>('/api/dashboards/metrics/evaluate', { definition });
}
