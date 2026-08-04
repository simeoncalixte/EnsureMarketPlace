import React from 'react';
import { colors } from '../../xds/colors';
import {
  Footer,
  FooterStatus,
  FooterStat,
  FooterStrong,
  FooterLinks,
  FooterLink,
  PulseRow,
  PulseDot,
  TickerViewport,
  TickerTrack,
  TickerItem,
} from './Marketplace.styles';
import type { LiveRiskEvent } from './marketplaceTypes';
import { formatShortCurrency } from './Marketplace.utils';

const TICKER_SEVERITY_COLOR: Record<string, string> = {
  severe: colors.dataViz.red,
  high: colors.dataViz.orange,
  moderate: colors.dataViz.amber,
  low: colors.dataViz.green,
};

function formatTickerEvent(e: LiveRiskEvent): string {
  const peril = e.peril ? `${e.peril.toUpperCase()}: ` : '';
  const place = e.place ? ` — ${e.place}` : '';
  return `${peril}${e.title ?? 'Event'}${place}`;
}

export function MarketplaceFooterSection({
  events,
  totalOpenCapacity,
  activeTranches,
}: {
  events: LiveRiskEvent[];
  totalOpenCapacity: number;
  activeTranches: number;
}) {
  return (
    <Footer>
      <FooterStatus>
        {events && events.length > 0 ? (
          <TickerViewport>
            <TickerTrack>
              {events.map((e, i) => (
                <TickerItem key={i}>
                  <PulseRow>
                    <PulseDot
                      style={{
                        background:
                          TICKER_SEVERITY_COLOR[e.severityLevel ?? 'low'] ??
                          colors.dataViz.green,
                      }}
                    />
                  </PulseRow>
                  <div>{formatTickerEvent(e)}</div>
                </TickerItem>
              ))}
            </TickerTrack>
          </TickerViewport>
        ) : null}

        <FooterStat>
          Open Capacity: <FooterStrong>{formatShortCurrency(totalOpenCapacity)}</FooterStrong>
        </FooterStat>
        <FooterStat>
          Active Tranches: <FooterStrong>{activeTranches}</FooterStrong>
        </FooterStat>
      </FooterStatus>
      <FooterLinks>
        <FooterLink href="#">Network Status</FooterLink>
        <FooterLink href="#">Risk Feed</FooterLink>
        <FooterLink href="#">Documentation</FooterLink>
      </FooterLinks>
    </Footer>
  );
}

export default MarketplaceFooterSection;
