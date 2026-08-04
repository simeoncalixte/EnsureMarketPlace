import { DashboardLayout } from '../../db/models/dashboardLayout.models';
import {
  catalogFor,
  CatalogWidget,
  DashboardLayout as LayoutDoc,
  MetricPreset,
  metricPresets,
  normalizeLayout,
  platformDefault,
  SurfaceKey,
} from './platformDefaults';

/**
 * Dashboard layout resolution + persistence for the three-tier cascade
 * (platform default in code  <  org override  <  user override). All reads and
 * writes are scoped by surface + organization + (for the user tier) user id.
 */

export type LayoutSource = 'platform' | 'org' | 'user';

export type ResolvedDashboard = {
  surfaceKey: SurfaceKey;
  /** The layout the client should render. */
  effective: LayoutDoc;
  /** Which tier `effective` came from. */
  source: LayoutSource;
  /** The org-tier layout if one exists (so the editor can offer "reset to org"). */
  org: LayoutDoc | null;
  /** The platform default (so the editor can offer "reset to platform"). */
  platform: LayoutDoc;
  /** The closed widget catalog for this surface. */
  catalog: CatalogWidget[];
  /** Predefined metric presets the user can drop in (one-click pre-filled custom metrics). */
  presets: MetricPreset[];
};

function toLayoutDoc(row: DashboardLayout | null): LayoutDoc | null {
  if (!row) return null;
  return row.layout as unknown as LayoutDoc;
}

async function findRow(
  surfaceKey: SurfaceKey,
  scope: 'org' | 'user',
  organizationId: number | null,
  userId: number | null,
): Promise<DashboardLayout | null> {
  return DashboardLayout.findOne({ where: { surfaceKey, scope, organizationId, userId } });
}

/** Resolve the effective layout for a user on a surface, plus editor context. */
export async function resolveLayout(
  surfaceKey: SurfaceKey,
  organizationId: number | null,
  userId: number | null,
): Promise<ResolvedDashboard> {
  const platform = platformDefault(surfaceKey);
  const catalog = catalogFor(surfaceKey);

  const orgRow = organizationId != null ? await findRow(surfaceKey, 'org', organizationId, null) : null;
  const userRow = userId != null ? await findRow(surfaceKey, 'user', organizationId, userId) : null;

  const org = toLayoutDoc(orgRow);
  const user = toLayoutDoc(userRow);

  let effective: LayoutDoc;
  let source: LayoutSource;
  if (user) {
    effective = user;
    source = 'user';
  } else if (org) {
    effective = org;
    source = 'org';
  } else {
    effective = platform;
    source = 'platform';
  }

  return { surfaceKey, effective, source, org, platform, catalog, presets: metricPresets() };
}

/** Upsert the current user's layout for a surface. */
export async function saveUserLayout(
  surfaceKey: SurfaceKey,
  organizationId: number | null,
  userId: number,
  layout: LayoutDoc,
): Promise<LayoutDoc> {
  const normalized = normalizeLayout(surfaceKey, layout);
  const existing = await findRow(surfaceKey, 'user', organizationId, userId);
  if (existing) {
    existing.layout = normalized as unknown as Record<string, unknown>;
    await existing.save();
  } else {
    await DashboardLayout.create({
      surfaceKey,
      scope: 'user',
      organizationId,
      userId,
      layout: normalized as unknown as Record<string, unknown>,
    });
  }
  return normalized;
}

/** Upsert an organization's layout for a surface (admin tier). */
export async function saveOrgLayout(
  surfaceKey: SurfaceKey,
  organizationId: number,
  layout: LayoutDoc,
): Promise<LayoutDoc> {
  const normalized = normalizeLayout(surfaceKey, layout);
  const existing = await findRow(surfaceKey, 'org', organizationId, null);
  if (existing) {
    existing.layout = normalized as unknown as Record<string, unknown>;
    await existing.save();
  } else {
    await DashboardLayout.create({
      surfaceKey,
      scope: 'org',
      organizationId,
      userId: null,
      layout: normalized as unknown as Record<string, unknown>,
    });
  }
  return normalized;
}

/** Delete the user's override so the surface falls back to org/platform. */
export async function resetUserLayout(
  surfaceKey: SurfaceKey,
  organizationId: number | null,
  userId: number,
): Promise<boolean> {
  const count = await DashboardLayout.destroy({
    where: { surfaceKey, scope: 'user', organizationId, userId },
  });
  return count > 0;
}

/** Delete the org override so the surface falls back to the platform default. */
export async function resetOrgLayout(surfaceKey: SurfaceKey, organizationId: number): Promise<boolean> {
  const count = await DashboardLayout.destroy({
    where: { surfaceKey, scope: 'org', organizationId, userId: null },
  });
  return count > 0;
}
