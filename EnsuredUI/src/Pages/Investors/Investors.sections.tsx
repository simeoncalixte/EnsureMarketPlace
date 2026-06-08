import React from 'react';
import {
  HeaderRow,
  HeaderActions,
  Card,
  RiskCard,
  RiskLabel,
  RiskValue,
  RiskNote,
  StatGrid,
  ExposureGrid,
  ExposureSidebar,
  AllocationsHeader,
  TableWrap,
  FooterBar,
  FooterLinks,
  TightSubtitle,
} from './Investors.styles';
import Button from '../../xds/components/Button';
import StatCard from '../../xds/components/StatCard';
import MapPanel from '../../xds/components/MapPanel';
import { ActivityFeed } from '../../xds/components/ActivityFeed';
import { PageTitle } from '../../xds/components/Typography';
import DataTable, { Row as DataRow } from '../../xds/components/DataTable';
import { colors } from '../../xds/colors';

export type InvestorSummary = {
  totalInvested: number;
  totalAvailable: number;
  activePositions: number;
  availableDeals: number;
  blendedIrr: number;
  projectedAnnualReturn: number;
  capitalAtRisk: number;
  liveTranches: number;
};

function asCurrency(value: number): string {
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.max(0, value))}`;
}

export const InvestorNavigationSection = React.memo(function InvestorNavigationSection(): React.ReactElement {
  return (
    <></>
  );
});

export const InvestorHeaderSection = React.memo(function InvestorHeaderSection({
  investorName,
}: {
  investorName: string;
}): React.ReactElement {
  return (
    <HeaderRow>
      <div>
        <PageTitle>Investor Dashboard</PageTitle>
        <TightSubtitle>
          Portfolio overview for {investorName}. Monitoring live exposure across investor-applicable tranches.
        </TightSubtitle>
      </div>
      <HeaderActions>
        <Button variant="primary">Allocate Capital</Button>
        <Button variant="outline">Generate Report</Button>
      </HeaderActions>
    </HeaderRow>
  );
});

export const InvestorSummaryStatsSection = React.memo(function InvestorSummaryStatsSection({
  summary,
}: {
  summary: InvestorSummary;
}): React.ReactElement {
  return (
    <StatGrid>
      <StatCard label="Total Portfolio Value" value={asCurrency(summary.totalInvested)} delta={`${summary.activePositions} active positions`} />
      <StatCard label="Total Capital Available" value={asCurrency(summary.totalAvailable)} delta={`${summary.availableDeals} available deals`} />
      <StatCard label="Projected Annual Return" value={asCurrency(summary.projectedAnnualReturn)} delta={`${summary.blendedIrr.toFixed(2)}% blended`} />
      <StatCard label="Blended IRR" value={`${summary.blendedIrr.toFixed(2)}%`} delta={`${summary.liveTranches} live tranches`} />
    </StatGrid>
  );
});

export const InvestorExposureSection = React.memo(function InvestorExposureSection({
  summary,
}: {
  summary: InvestorSummary;
}): React.ReactElement {
  return (
    <ExposureGrid>
      <MapPanel
        title={'Active Exposure Map'}
        stats={[
          { label: 'INVESTOR TVL', value: asCurrency(summary.totalInvested) },
          { label: 'ACTIVE TRANCHES', value: String(summary.liveTranches) },
        ]}
      />

      <ExposureSidebar>
        <RiskCard>
          <RiskLabel>Capital At Risk</RiskLabel>
          <RiskValue>{asCurrency(summary.capitalAtRisk)}</RiskValue>
          <RiskNote>Backend-calculated committed capital across active investor positions.</RiskNote>
        </RiskCard>

        <ActivityFeed
          title="Live Risk Feed"
          live
          items={[
            {
              time: '12:42 UTC',
              source: 'NOAA-EVENT-422',
              tagColor: colors.error,
              message: 'Hurricane Milton upgraded to Category 4. Landfall projected T-18hrs Tampa Bay.',
            },
            {
              time: '11:15 UTC',
              source: 'RECON-DELTA',
              message: 'Secondary tranches in SE Region fully subscribed. Total TVL increase +$240k.',
            },
          ]}
        />
      </ExposureSidebar>
    </ExposureGrid>
  );
});

export const InvestorAllocationsSection = React.memo(function InvestorAllocationsSection({
  rows,
}: {
  rows: DataRow[];
}): React.ReactElement {
  return (
    <Card>
      <AllocationsHeader>
        <h3>Active Allocations</h3>
        <Button variant="text" size="sm">View All Deals</Button>
      </AllocationsHeader>
      <TableWrap>
        <DataTable rows={rows} />
      </TableWrap>
    </Card>
  );
});

export const InvestorFooterSection = React.memo(function InvestorFooterSection(): React.ReactElement {
  return (
    <FooterBar>
      <div>Hurricane Milton: Cat 4 approaching Florida... | Global TVL: $4.2B | Active Tranches: 142</div>
      <FooterLinks>
        <a href="#">Network Status</a>
        <a href="#">Risk Feed</a>
        <a href="#">Documentation</a>
      </FooterLinks>
    </FooterBar>
  );
});
