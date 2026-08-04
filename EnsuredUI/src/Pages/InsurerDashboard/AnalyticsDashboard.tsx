import React from 'react';
import DashboardHost from '../../dashboards/DashboardHost';
import { AnalyticsDataProvider, analyticsRegistry } from './analyticsWidgets';

// The insurer Analytics page is now a configurable dashboard surface. Its widgets
// (KPIs + charts, see analyticsWidgets.tsx) are laid out by the shared
// DashboardHost, which resolves the effective layout through the platform → org →
// user cascade. The platform default mirrors the page's original arrangement, so
// this looks identical until an org admin or the user customizes it.
export default function AnalyticsDashboard() {
  return (
    <AnalyticsDataProvider>
      <DashboardHost surfaceKey="insurer-analytics" registry={analyticsRegistry} />
    </AnalyticsDataProvider>
  );
}
