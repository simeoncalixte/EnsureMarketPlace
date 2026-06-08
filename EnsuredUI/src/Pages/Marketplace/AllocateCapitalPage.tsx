import { useMemo, useState, useEffect } from 'react';
import { getActivePendingFunding } from '../../api/marketplace';
import {
  Breadcrumb,
  Stepper,
  MetricCard,
  ProgressBar,
  SelectionCard,
  Button,
  InfoCard,
  colors,
} from '../../xds';
import * as S from './AllocateCapitalPage.styles';

type Tranche = {
  id: string;
  name: string;
  expectedYield: number;
  riskScore: 'Low' | 'Medium' | 'High';
  attachPoint: string;
  tone: 'primary' | 'tertiary';
  icon: string;
  // API-provided fields
  dealId?: number;
  capitalRequired?: number;
  fundedAmount?: number;
  pendingAmount?: number;
  fundingProgressPct?: number;
  durationMonths?: number;
  startDate?: string;
  endDate?: string;
};

const MIN_AMOUNT = 10_000;
const MAX_AMOUNT = 10_000_000;
const FEE_RATE = 0.0015;

const tranches: Tranche[] = [
  {
    id: 'senior-a1',
    name: 'Senior A-1',
    expectedYield: 4.2,
    riskScore: 'Low',
    attachPoint: '65%',
    tone: 'primary',
    icon: 'verified',
  },
  {
    id: 'mezzanine-b2',
    name: 'Mezzanine B-2',
    expectedYield: 12.8,
    riskScore: 'Medium',
    attachPoint: '35%',
    tone: 'primary',
    icon: 'check_circle',
  },
  {
    id: 'equity',
    name: 'Equity',
    expectedYield: 28.5,
    riskScore: 'High',
    attachPoint: '5%',
    tone: 'tertiary',
    icon: 'warning',
  },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatAmountInput(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}

function clampAmount(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_AMOUNT;
  }
  return Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, value));
}

type AllocateCapitalPageProps = {
  initialTrancheId?: string;
  initialPoolId?: string;
};

export default function AllocateCapitalPage({ initialTrancheId, initialPoolId }: AllocateCapitalPageProps) {
  const [amount, setAmount] = useState(250_000);
  const [selectedTrancheId, setSelectedTrancheId] = useState<string>(initialTrancheId ?? tranches[1].id);
  const currentPoolId = 2;

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [apiTranches, setApiTranches] = useState<Tranche[] | null>(null);

  const displayedTranches = apiTranches ?? tranches;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const isNumericId = /^[0-9]+$/.test(String(currentPoolId));
        const res = await getActivePendingFunding(
          isNumericId ? { dealId: currentPoolId } : { dealName: currentPoolId },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const mapped: Tranche[] = [];
        if (Array.isArray(data)) {
          data.forEach((item: any, outerIdx: number) => {
            const dealId = item.dealId ? Number(item.dealId) : undefined;
            if (Array.isArray(item.tranches)) {
              item.tranches.forEach((t: any, idx: number) => {
                const rawRisk = String(t.riskLevel ?? t.riskScore ?? 'low').toLowerCase();
                const riskScore = rawRisk === 'high' ? 'High' : rawRisk === 'medium' ? 'Medium' : 'Low';
                mapped.push({
                  id: String(t.trancheId ?? t.id ?? `api-${outerIdx}-${idx}`),
                  name: String(t.trancheName ?? t.name ?? `Tranche ${idx + 1}`),
                  expectedYield: Number(t.expectedReturnPct ?? t.expectedYield ?? 0),
                  riskScore,
                  attachPoint: String(t.attachPoint ?? t.attach ?? 'N/A'),
                  tone: idx === 2 ? 'tertiary' : 'primary',
                  icon: 'verified',
                  dealId,
                  capitalRequired: Number(t.capitalRequired ?? 0) || undefined,
                  fundedAmount: Number(t.fundedAmount ?? 0) || 0,
                  pendingAmount: Number(t.pendingAmount ?? 0) || 0,
                  fundingProgressPct: Number(t.fundingProgressPct ?? 0) || 0,
                  durationMonths: t.durationMonths ? Number(t.durationMonths) : undefined,
                  startDate: t.startDate ? String(t.startDate) : undefined,
                  endDate: t.endDate ? String(t.endDate) : undefined,
                } as Tranche);
              });
            } else {
              const t = item;
              const rawRisk = String(t.riskLevel ?? t.riskScore ?? 'low').toLowerCase();
              const riskScore = rawRisk === 'high' ? 'High' : rawRisk === 'medium' ? 'Medium' : 'Low';
              mapped.push({
                id: String(t.trancheId ?? t.id ?? `api-${outerIdx}`),
                name: String(t.trancheName ?? t.name ?? `Tranche ${outerIdx + 1}`),
                expectedYield: Number(t.expectedReturnPct ?? t.expectedYield ?? 0),
                riskScore,
                attachPoint: String(t.attachPoint ?? t.attach ?? 'N/A'),
                tone: outerIdx === 2 ? 'tertiary' : 'primary',
                icon: 'verified',
                dealId: t.dealId ? Number(t.dealId) : undefined,
                capitalRequired: Number(t.capitalRequired ?? 0) || undefined,
                fundedAmount: Number(t.fundedAmount ?? 0) || 0,
                pendingAmount: Number(t.pendingAmount ?? 0) || 0,
                fundingProgressPct: Number(t.fundingProgressPct ?? 0) || 0,
                durationMonths: t.durationMonths ? Number(t.durationMonths) : undefined,
                startDate: t.startDate ? String(t.startDate) : undefined,
                endDate: t.endDate ? String(t.endDate) : undefined,
              } as Tranche);
            }
          });
        }
        if (!cancelled) setApiTranches(mapped);
      } catch (err: any) {
        if (!cancelled) setLoadError(err?.message ?? 'Failed to load');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [currentPoolId]);

  const selectedTranche = useMemo(() => {
    return (
      displayedTranches.find((tranche) => tranche.id === selectedTrancheId) || displayedTranches[0] || tranches[0]
    );
  }, [selectedTrancheId, displayedTranches]);

  const feeAmount = amount * FEE_RATE;
  const totalDebit = amount + feeAmount;
  const amountPct = ((amount - MIN_AMOUNT) / (MAX_AMOUNT - MIN_AMOUNT)) * 100;

  return (
    <S.Page>
      <S.Main>
        <S.Intro>
          <Breadcrumb
            label="Trail"
            items={[
              { label: 'Invest' },
              { label: 'Hurricane Ian Reinsurance Pool' },
              { label: 'Capital Allocation Flow' },
            ]}
          />
          <h1>New Allocation Flow</h1>
          <p>Configure your institutional deployment into the CAT-Risk Pool 2024. All tranches are subject to smart-contract auditing.</p>
        </S.Intro>

        {isLoading && (
          <InfoCard tone="info" icon="hourglass_top" title="Loading">
            Loading opportunities from marketplace…
          </InfoCard>
        )}

        {loadError && (
          <InfoCard tone="danger" icon="error" title="Error loading opportunities">
            {loadError}
          </InfoCard>
        )}

        <Stepper
          activeIndex={0}
          steps={[
            { label: 'Step One', title: 'Amount' },
            { label: 'Step Two', title: 'Tranche Selection' },
            { label: 'Step Three', title: 'Portfolio Impact' },
            { label: 'Step Four', title: 'Funding' },
          ]}
        />

        <S.Grid>
          <S.LeftRail>
            <S.PanelHighlight>
              <S.Watermark className="mono-data">USD</S.Watermark>
              <S.PanelHead>
                <S.PanelTitle><span className="material-symbols-outlined">payments</span>1. Define Capital Commitment</S.PanelTitle>
                <S.MaxTag className="mono-data">MAX: $10,000,000</S.MaxTag>
              </S.PanelHead>

              <S.InputWrap>
                <S.AmountInput aria-label="Capital commitment amount" className="mono-data" inputMode="numeric" type="text" value={formatAmountInput(amount)} onChange={(event) => { const numeric = Number(event.target.value.replace(/[^\d]/g, '')); setAmount(clampAmount(numeric || MIN_AMOUNT)); }} />
                <S.AmountSuffix className="mono-data">.00</S.AmountSuffix>
              </S.InputWrap>

              <div>
                <ProgressBar value={amountPct} tone="primary" size="sm" />
                <S.ProgressLabels className="mono-data"><span>$10,000 MIN</span><span>$10,000,000 MAX</span></S.ProgressLabels>
              </div>

              <S.PresetRow className="mono-data">
                {[50_000, 250_000, 1_000_000].map((preset) => (
                  <S.PresetButton key={preset} className={amount === preset ? 'active' : ''} type="button" onClick={() => setAmount(preset)}>{formatCurrency(preset).replace('.00', '')}</S.PresetButton>
                ))}
              </S.PresetRow>
            </S.PanelHighlight>

            <S.Panel>
              <S.PanelTitle><span className="material-symbols-outlined">layers</span>2. Select Tranche Exposure</S.PanelTitle>
              <S.TrancheGrid>
                {displayedTranches.map((tranche) => {
                  const isSelected = tranche.id === selectedTranche.id;
                  const accent = tranche.tone === 'tertiary' ? colors.error : colors.primary;
                  return (
                    <SelectionCard
                      key={tranche.id}
                      selectionId={tranche.id}
                      title={Number.isFinite(tranche.expectedYield) ? `${tranche.expectedYield.toFixed(1)}%` : '—'}
                      subtitle={tranche.name}
                      accentColor={accent}
                      active={isSelected}
                      icon={<span className="material-symbols-outlined" data-fill={isSelected ? '1' : '0'}>{tranche.icon}</span>}
                      footerLabel="Expected Yield"
                      onSelect={(id) => setSelectedTrancheId(id)}
                    >
                      <S.TrancheStats className="mono-data">
                        <div><span>Risk Score:</span><strong>{tranche.riskScore}</strong></div>
                        <div><span>Attachment Point:</span><strong>{tranche.attachPoint ?? 'N/A'}</strong></div>
                        <div>
                          <span>Funding:</span>
                          <strong>{formatCurrency(tranche.fundedAmount ?? 0)}</strong>
                          <small> / {formatCurrency(tranche.capitalRequired ?? 0)} ({tranche.fundingProgressPct ?? 0}%)</small>
                        </div>
                      </S.TrancheStats>
                    </SelectionCard>
                  );
                })}
              </S.TrancheGrid>
            </S.Panel>

            <S.Panel>
              <S.PanelTitle><span className="material-symbols-outlined">monitoring</span>3. Portfolio Impact Simulation</S.PanelTitle>
              <S.ImpactGrid>
                <S.MetricStack>
                  <MetricCard
                    label="Aggregate IRR"
                    value="14.2%"
                    projectedValue="14.8%"
                    trend="up"
                    tone="success"
                    delta="+0.6% Shift"
                  />
                  <MetricCard
                    label="Value at Risk (VaR)"
                    value="$4.2M"
                    projectedValue="$4.35M"
                    trend="up"
                    tone="danger"
                    delta="+3.5% Risk"
                  />
                </S.MetricStack>
                <div>
                  <S.MiniLabel>Regional Drift</S.MiniLabel>
                  <S.RegionStack>
                    <div>
                      <S.RowBetween><span>Florida Wind (Secondary)</span><span className="gain mono-data">+5.0%</span></S.RowBetween>
                      <ProgressBar value={65} tone="gain" size="sm" />
                    </div>
                    <div>
                      <S.RowBetween><span>Gulf Coast Flood</span><span className="mono-data">+1.2%</span></S.RowBetween>
                      <ProgressBar value={30} tone="primary" size="sm" />
                    </div>
                    <div>
                      <S.RowBetween><span>California Quake</span><span className="mono-data">0.0%</span></S.RowBetween>
                      <ProgressBar value={15} tone="neutral" size="sm" />
                    </div>
                  </S.RegionStack>
                </div>
              </S.ImpactGrid>
            </S.Panel>
          </S.LeftRail>

          <S.RightRail>
            <S.Summary>
              <h4>Allocation Summary</h4>
              <S.SummaryList>
                <div><span>Selected Tranche</span><strong>{selectedTranche.name}</strong></div>
                <div><span>Principal Amount</span><strong className="mono-data">{formatCurrency(amount)}</strong></div>
                <div><span>Platform Fee (0.15%)</span><strong className="mono-data">{formatCurrency(feeAmount)}</strong></div>
              </S.SummaryList>

              <S.TotalBlock>
                <div><span>Total Debit</span><strong className="mono-data">{formatCurrency(totalDebit)}</strong></div>

                <S.FundingBox>
                  <S.FundingHead><span className="material-symbols-outlined">account_balance</span><span>JP Morgan Chase •••• 4201</span></S.FundingHead>
                  <S.FundingSteps>
                    <div><span>1</span><div><strong>Initiate ACH Transfer</strong><small>Funds will be pulled immediately</small></div></div>
                    <div><span>2</span><div><strong>Custodian Segregation</strong><small>Verification at Bank of NY Mellon</small></div></div>
                  </S.FundingSteps>
                </S.FundingBox>

                <S.ConfirmButtonWrap>
                  <Button type="button" variant="primary"><span className="material-symbols-outlined">fingerprint</span>Confirm &amp; Deploy Capital</Button>
                </S.ConfirmButtonWrap>
                <p>By clicking confirm, you authorize the smart-contract to initiate a bank transfer and mint your Tranche B-2 ERC-3525 tokens. Multi-sig authentication required for amounts &gt; $1M.</p>
              </S.TotalBlock>
            </S.Summary>

            <S.ContextCard>
              <S.ContextImage><img alt="Satellite thermal map of Atlantic storm patterns" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAsKIoVXJ2f6sXwEJ0mG-hWt1yRR5gd4fKqTZoVOSW0BbylVy9t8-YYNxwHLAn9QyiG65C_8yZCag-eemWFQo5E6WU_ADjwxN1aAX8CD-X0t_RwK4c5kw5XA7g8XByGv9o1E8O_lYVw5zkBOXOcgG28vwafHIvxhRZ_QmEcB6I0VmtdA6X21vw-PxVf2GY8_5ZbAvnfzKMUFLh7V37MrSBrmtm0ajE5bWtrzyfjWoZlJdZuF7gt5lCJ1NzzG-mvXf48eaeESg9c2f8z" /></S.ContextImage>
              <h5>Hurricane Ian Reinsurance</h5>
              <p>Program ID: {currentPoolId}</p>
              <S.ContextStats className="mono-data"><div><span>Total Pool</span><strong>$450.0M</strong></div><div><span>Subscribed</span><strong className="gain">82%</strong></div></S.ContextStats>
            </S.ContextCard>
          </S.RightRail>
        </S.Grid>
      </S.Main>

      <S.Footer>
        <S.FooterInner>
          <S.FooterLinks><a href="#">Legal Disclosure</a><a href="#">Smart Contract Audit</a><a href="#">Institutional API</a></S.FooterLinks>
          <S.FooterStatus className="mono-data"><S.Pulse /><span>Network Node Status: Optimal (0.012ms)</span></S.FooterStatus>
        </S.FooterInner>
      </S.Footer>
    </S.Page>
  );
}
