import React from 'react';
import { MarketplaceBody } from './Marketplace.styles';

export function MarketplaceBodyLayout({
  filters,
  deals,
}: {
  filters: React.ReactNode;
  deals: React.ReactNode;
}) {
  return (
    <MarketplaceBody>
      {filters}
      {deals}
    </MarketplaceBody>
  );
}

export default MarketplaceBodyLayout;
