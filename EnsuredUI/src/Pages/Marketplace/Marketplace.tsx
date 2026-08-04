import React from 'react';
import DashboardHost from '../../dashboards/DashboardHost';
import { MarketplaceDataProvider, marketplaceRegistry } from './marketplaceWidgets';

// The Marketplace landing page is now a configurable dashboard surface. Its Stats,
// Explorer (filters + map + deals) and Footer widgets are laid out by the shared
// DashboardHost, which resolves the effective layout through the platform → org →
// user cascade. The platform default mirrors the page's original arrangement, so
// nothing changes visually until an org admin or the user customizes it.
export default function MarketplacePage() {
  return (
    <MarketplaceDataProvider>
      <DashboardHost surfaceKey="marketplace" registry={marketplaceRegistry} />
    </MarketplaceDataProvider>
  );
}
