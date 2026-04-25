import React from 'react';
import {
  HeaderRow,
  Card,
  TableWrap,
  FooterBar,
} from './Investors.styles';
import StatCard from '../../xds/components/StatCard';
import MapPanel from '../../xds/components/MapPanel';
import DataTable, { Row as DataRow } from '../../xds/components/DataTable';

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
        <h1>Investor Dashboard</h1>
        <p style={{ color: '#9aa3bb', margin: 0 }}>
          Portfolio overview for {investorName}. Monitoring live exposure across investor-applicable tranches.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button style={{ background: '#4b8eff', color: '#fff', padding: '0.5rem 1rem', borderRadius: 6, fontWeight: 700 }}>Allocate Capital</button>
        <button style={{ background: 'transparent', color: '#9aa3bb', padding: '0.5rem 1rem', borderRadius: 6, border: '1px solid rgba(65,71,85,0.12)' }}>Generate Report</button>
      </div>
    </HeaderRow>
  );
});

export const InvestorSummaryStatsSection = React.memo(function InvestorSummaryStatsSection({
  summary,
}: {
  summary: InvestorSummary;
}): React.ReactElement {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 20 }}>
      <StatCard label="Total Portfolio Value" value={asCurrency(summary.totalInvested)} delta={`${summary.activePositions} active positions`} />
      <StatCard label="Total Capital Available" value={asCurrency(summary.totalAvailable)} delta={`${summary.availableDeals} available deals`} />
      <StatCard label="Projected Annual Return" value={asCurrency(summary.projectedAnnualReturn)} delta={`${summary.blendedIrr.toFixed(2)}% blended`} />
      <StatCard label="Blended IRR" value={`${summary.blendedIrr.toFixed(2)}%`} delta={`${summary.liveTranches} live tranches`} />
    </div>
  );
});

export const InvestorExposureSection = React.memo(function InvestorExposureSection({
  summary,
}: {
  summary: InvestorSummary;
}): React.ReactElement {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
      <MapPanel
        title={'Active Exposure Map'}
        stats={[
          { label: 'INVESTOR TVL', value: asCurrency(summary.totalInvested) },
          { label: 'ACTIVE TRANCHES', value: String(summary.liveTranches) },
        ]}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#ffb3ad' }}>Capital At Risk</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{asCurrency(summary.capitalAtRisk)}</div>
          <div style={{ color: '#9aa3bb', marginTop: 8 }}>Backend-calculated committed capital across active investor positions.</div>
        </Card>

        <Card style={{ padding: 0 }}>
          <div style={{ padding: 12, borderBottom: '1px solid rgba(65,71,85,0.06)', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700 }}>Live Risk Feed</div>
            <div style={{ width: 8, height: 8, borderRadius: 999, background: '#ffb3ad' }} />
          </div>
          <div style={{ padding: 12 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#9aa3bb' }}>12:42 UTC | NOAA-EVENT-422</div>
              <div style={{ color: '#dae2fd' }}>Hurricane Milton upgraded to Category 4. Landfall projected T-18hrs Tampa Bay.</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#9aa3bb' }}>11:15 UTC | RECON-DELTA</div>
              <div style={{ color: '#dae2fd' }}>Secondary tranches in SE Region fully subscribed. Total TVL increase +$240k.</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
});

export const InvestorAllocationsSection = React.memo(function InvestorAllocationsSection({
  rows,
}: {
  rows: DataRow[];
}): React.ReactElement {
  return (
    <Card>
      <div style={{ padding: 16, borderBottom: '1px solid rgba(65,71,85,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Active Allocations</h3>
        <button style={{ color: '#4b8eff', fontSize: '0.75rem', fontWeight: 700 }}>View All Deals</button>
      </div>
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
      <div>
        <a style={{ color: '#9aa3bb', marginRight: '1rem' }} href="#">Network Status</a>
        <a style={{ color: '#9aa3bb', marginRight: '1rem' }} href="#">Risk Feed</a>
        <a style={{ color: '#9aa3bb' }} href="#">Documentation</a>
      </div>
    </FooterBar>
  );
});
