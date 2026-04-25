import React, { useEffect, useMemo, useState } from 'react';
import {
  PageWrapper,
  Main,
  Container,
} from './Investors.styles';
import { Row as DataRow } from '../../xds/components/DataTable';
import {
  InvestorAllocationsSection,
  InvestorExposureSection,
  InvestorFooterSection,
  InvestorHeaderSection,
  InvestorSummary,
  InvestorSummaryStatsSection,
} from './Investors.sections';

type InvestorDealApiRow = {
  id: string;
  investorUserId: number;
  investorProfileId: number;
  dealId: number;
  dealName: string;
  dealStatus: string;
  trancheId: number;
  trancheName: string;
  riskLevel: string;
  expectedReturnPct: number;
  capitalRequired: number;
  fundedAmount: number;
  pendingAmount: number;
  investorCommittedAmount: number;
  investorAllocationPct: number;
  status: 'active' | 'available';
};

type InvestorDashboardPayload = {
  summary: InvestorSummary;
  deals: InvestorDealApiRow[];
};

type InvestorContext = {
  investorUserId: number;
  investorProfileId: number;
  firstName?: string;
  lastName?: string;
  email?: string;
};

function resolveApiBase(): string {
  const raw =
    (typeof window !== 'undefined' && (((window as any).__VITE_API_BASE || (window as any).VITE_API_BASE) as string | undefined))
    || (import.meta as any).env?.VITE_API_BASE
    || '';

  if (!raw) return '';
  const firstHttp = raw.indexOf('http');
  const lastHttp = raw.lastIndexOf('http');
  let base = raw;
  if (lastHttp > firstHttp) {
    base = raw.slice(lastHttp);
  }

  return base.replace(/\/+$/g, '');
}

function resolveInvestorUserIdFromClient(): number | null {
  if (typeof window !== 'undefined') {
    const fromQuery = new URLSearchParams(window.location.search).get('investorUserId');
    if (fromQuery && Number.isFinite(Number(fromQuery)) && Number(fromQuery) > 0) {
      return Number(fromQuery);
    }

    const fromWindow = (window as any).__INVESTOR_USER_ID ?? (window as any).VITE_INVESTOR_USER_ID;
    if (fromWindow && Number.isFinite(Number(fromWindow)) && Number(fromWindow) > 0) {
      return Number(fromWindow);
    }
  }

  const fromEnv = (import.meta as any).env?.VITE_INVESTOR_USER_ID;
  if (fromEnv && Number.isFinite(Number(fromEnv)) && Number(fromEnv) > 0) {
    return Number(fromEnv);
  }

  return null;
}

function asCurrency(value: number): string {
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.max(0, value))}`;
}

const EMPTY_SUMMARY: InvestorSummary = {
  totalInvested: 0,
  totalAvailable: 0,
  activePositions: 0,
  availableDeals: 0,
  blendedIrr: 0,
  projectedAnnualReturn: 0,
  capitalAtRisk: 0,
  liveTranches: 0,
};

export default function InvestorsPage(): React.ReactElement {
  const [investorContext, setInvestorContext] = useState<InvestorContext | null>(null);
  const [investorDeals, setInvestorDeals] = useState<InvestorDealApiRow[]>([]);
  const [summary, setSummary] = useState<InvestorSummary>(EMPTY_SUMMARY);
  const [dealRows, setDealRows] = useState<DataRow[]>([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);
  const [dealsError, setDealsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDeals() {
      setIsLoadingDeals(true);
      setDealsError(null);

      try {
        const API_BASE = resolveApiBase();
        const makeUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

        let investorUserId = resolveInvestorUserIdFromClient();
        if (!investorUserId) {
          const defaultInvestorRes = await fetch(makeUrl('/api/investors/default'));
          if (!defaultInvestorRes.ok) {
            throw new Error(`Unable to resolve an investor (status ${defaultInvestorRes.status})`);
          }
          const defaultInvestor = await defaultInvestorRes.json() as InvestorContext;
          investorUserId = Number(defaultInvestor?.investorUserId ?? 0);
          if (!mounted) return;
          setInvestorContext(defaultInvestor);
        }

        if (!investorUserId || !Number.isFinite(investorUserId)) {
          throw new Error('No valid investor user id available');
        }

        if (!investorContext) {
          setInvestorContext({ investorUserId, investorProfileId: 0 });
        }

        const dashboardRes = await fetch(makeUrl(`/api/investors/${investorUserId}/dashboard`));
        if (!dashboardRes.ok) {
          throw new Error(`Unable to load investor dashboard (status ${dashboardRes.status})`);
        }

        const payload = await dashboardRes.json() as InvestorDashboardPayload;
        const deals = Array.isArray(payload?.deals) ? payload.deals : [];
        const rows: DataRow[] = deals.map((row) => ({
              id: `#D${row.dealId}-T${row.trancheId}`,
              tranche: `${row.dealName} / ${row.trancheName}`,
              value: asCurrency(row.investorCommittedAmount > 0 ? row.investorCommittedAmount : row.pendingAmount),
              status: row.status === 'active' ? 'ACTIVE' : 'AVAILABLE',
              statusVariant: row.status === 'active' ? 'secondary' : 'primary',
            }));

        if (!mounted) return;

        setInvestorDeals(deals);
        setSummary(payload?.summary ?? EMPTY_SUMMARY);
        setDealRows(rows);
      } catch (error) {
        if (!mounted) return;

        setInvestorDeals([]);
        setSummary(EMPTY_SUMMARY);
        setDealRows([]);
        setDealsError(String((error as Error).message ?? error));
      } finally {
        if (mounted) {
          setIsLoadingDeals(false);
        }
      }
    }

    loadDeals();
    return () => {
      mounted = false;
    };
  }, []);

  const dataRows = useMemo<DataRow[]>(() => {
    if (isLoadingDeals) {
      return [{ id: '#LOADING', tranche: 'Loading investor deals...', value: '---', status: 'PENDING', statusVariant: 'primary' }];
    }

    if (dealsError) {
      return [{ id: '#ERROR', tranche: dealsError, value: '---', status: 'ERROR', statusVariant: 'error' }];
    }

    if (dealRows.length === 0) {
      return [{ id: '#EMPTY', tranche: 'No active investor deals found', value: '---', status: 'PENDING', statusVariant: 'primary' }];
    }

    return dealRows;
  }, [dealRows, dealsError, isLoadingDeals]);

  const investorName = useMemo(() => {
    if (investorContext?.firstName || investorContext?.lastName) {
      return `${investorContext?.firstName ?? ''} ${investorContext?.lastName ?? ''}`.trim();
    }
    if (investorContext?.investorUserId) {
      return `Investor #${investorContext.investorUserId}`;
    }
    return 'Investor';
  }, [investorContext]);

  return (
    <PageWrapper>
      <Main>
          <InvestorHeaderSection investorName={investorName} />
          <InvestorSummaryStatsSection summary={summary} />
          <InvestorExposureSection summary={summary} />
          <InvestorAllocationsSection rows={dataRows} />
      </Main>

      <InvestorFooterSection />
    </PageWrapper>
  );
}
