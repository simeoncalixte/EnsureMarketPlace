import React, { useEffect, useState } from 'react';
import {
  Page,
  Main,
  MacroGrid,
  MacroBigValue,
  MacroValueAffixMono,
  MiddleGrid,
  SimCard,
  SimBgIcon,
  SimHeader,
  SimHeaderText,
  SimTitle,
  SimSub,
  SimScenarioGrid,
  SimScenarioCard,
  SimScenarioTop,
  SimScenarioIcon,
  SimScenarioTitle,
  SimScenarioDesc,
  SimBottomGrid,
  SimImpactLabel,
  ImpactRow,
  ImpactMeta,
  ImpactValue,
  SimActions,
  SimApplyLabel,
  TrancheSection,
  TrancheSectionHeader,
  TrancheSectionTitle,
  TrancheLegend,
  LegendItem,
  LegendDot,
  TableWrap,
  TrancheName,
  TrancheSub,
  UtilizationWrap,
  UtilizationBar,
  UtilizationValue,
  YTM,
  CellRight,
  TableFooter,
  ViewAllBtn,
  BottomGrid,
  Panel,
  PanelHeader,
  PanelTitle,
  PanelLink,
  PanelLiveTag,
  UserStatGrid,
  UserStatBox,
  ApprovalList,
  ApprovalItem,
  ApprovalItemLeft,
  ApprovalInfo,
  ApprovalName,
  ApprovalRole,
  ApprovalActions,
  ApprovalBtn,
  LedgerFooter,
  LedgerFooterRow,
  LedgerStatusValue,
  SubViewBar,
  SubViewBackBtn,
  SubViewLabel,
} from './AdminPage.styles';
import {
  MetricCard,
  StatCard,
  Badge,
  Button,
  ProgressBar,
  ToggleSwitch,
  AvatarStack,
  ActivityFeed,
  DataTable,
  DataTableColumn,
  Card,
  colors,
} from '../../xds';
import Checkbox from '../../xds/components/Checkbox';

import OrganizationsSubpage from './OrganizationsSubpage';
import UsersSubpage from './UsersSubpage';
import OrgUsersSubpage from './OrgUsersSubpage';
import SeedingPanel from './SeedingPanel';
import InsurerDashboard from '../InsurerDashboard/InsurerDashboard';
import LineOfBusinessPage from '../InsurerDashboard/LineOfBusinessPage';
import Simulation, { SimEvent } from '../../simulations/simulationEngine';

type TrancheStatus = 'PERFORMING' | 'REBALANCING' | 'MARGIN CALL';

type Tranche = {
  id: string;
  sub: string;
  utilization: number;
  utilizationTone: 'gain' | 'primary' | 'danger';
  utilizationDanger?: boolean;
  collateral: string;
  status: TrancheStatus;
  ytm: string;
  ytmColor: string;
  action: 'pause' | 'halt';
};

const TRANCHES: Tranche[] = [
  {
    id: 'TR-8820-A',
    sub: 'Synthetic Catastrophe Bond',
    utilization: 42.1,
    utilizationTone: 'gain',
    collateral: '164.2%',
    status: 'PERFORMING',
    ytm: '+12.40%',
    ytmColor: colors.accent,
    action: 'pause',
  },
  {
    id: 'TR-9112-X',
    sub: 'Hurricane Aggregator',
    utilization: 89.4,
    utilizationTone: 'primary',
    collateral: '102.5%',
    status: 'REBALANCING',
    ytm: '+18.15%',
    ytmColor: colors.primarySoft,
    action: 'pause',
  },
  {
    id: 'TR-0045-L',
    sub: 'Liquidity Bridge (ETH/USDC)',
    utilization: 15.8,
    utilizationTone: 'gain',
    collateral: '540.0%',
    status: 'PERFORMING',
    ytm: '+4.20%',
    ytmColor: colors.accent,
    action: 'pause',
  },
  {
    id: 'TR-7761-B',
    sub: 'Seismic Parametric',
    utilization: 94.2,
    utilizationTone: 'danger',
    utilizationDanger: true,
    collateral: '98.1%',
    status: 'MARGIN CALL',
    ytm: '+24.50%',
    ytmColor: colors.errorSoft,
    action: 'halt',
  },
];

const STATUS_VARIANT: Record<TrancheStatus, 'success' | 'warning' | 'danger'> = {
  PERFORMING: 'success',
  REBALANCING: 'warning',
  'MARGIN CALL': 'danger',
};

const SCENARIOS = [
  {
    key: 'hurricane',
    icon: 'cyclone',
    title: 'Hurricane Scenario',
    desc: 'Cat-5 landfall modeling for Atlantic Basin tranches.',
  },
  {
    key: 'seismic',
    icon: 'waves',
    title: 'Seismic Stress Test',
    desc: 'Simulated 8.2 Richter event for Pacific Rim liability.',
  },
  {
    key: 'liquidity',
    icon: 'water_drop',
    title: 'Market Liquidity Drain',
    desc: 'Rapid withdrawal simulation for secondary tranches.',
  },
] as const;

type ScenarioKey = (typeof SCENARIOS)[number]['key'];

const LEDGER_ITEMS = [
  { time: '14:22:01', tag: '[OK]', tagColor: colors.accent, message: 'Liquidity rebalance complete for Tranche TR-0045-L...' },
  { time: '14:18:45', tag: '[SYS]', tagColor: colors.primarySoft, message: 'Satellite imagery batch #992 processed (Cloud coverage 12%)...' },
  { time: '14:15:32', tag: '[WARN]', tagColor: colors.errorSoft, message: 'Margin proximity threshold reached for TR-7761-B...' },
  { time: '14:02:11', tag: '[OK]', tagColor: colors.accent, message: "New Cedent 'Munich Re-Structured' approved and seeded..." },
  { time: '13:58:44', tag: '[SYS]', tagColor: colors.primarySoft, message: 'Daily risk coefficient audit initiated by NODE_01_ADMIN...' },
];

const APPROVALS = [
  { initials: 'SK', gradient: `linear-gradient(135deg, ${colors.primarySoft}, ${colors.primary})`, name: 'Swiss Re Capital Group', role: 'Tier 1 Institutional' },
  { initials: 'LM', gradient: `linear-gradient(135deg, ${colors.errorSoft}, ${colors.errorContainer})`, name: "Lloyd's Syndicate 402", role: 'Cedent Onboarding' },
];

export default function AdminPage() {
  const [view, setView] = useState<'dashboard' | 'orgs' | 'users' | 'orgUsers' | 'seed' | 'insurer' | 'line-of-business'>('line-of-business');
  const [selectedOrg, setSelectedOrg] = useState<{ id: number; name: string } | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [applyApi, setApplyApi] = useState(false);
  const [simLedger, setSimLedger] = useState<SimEvent[]>([]);
  const [scenarios, setScenarios] = useState<Record<ScenarioKey, boolean>>({
    hurricane: false,
    seismic: false,
    liquidity: false,
  });

  const showOrgUsers = (org: { id: number; name: string }) => {
    setSelectedOrg(org);
    setView('orgUsers');
  };

  const trancheColumns: DataTableColumn<Tranche>[] = [
    {
      key: 'id',
      header: 'Tranche ID',
      render: (t) => (
        <>
          <TrancheName>{t.id}</TrancheName>
          <TrancheSub>{t.sub}</TrancheSub>
        </>
      ),
    },
    {
      key: 'utilization',
      header: 'Capital Utilization',
      render: (t) => (
        <UtilizationWrap>
          <UtilizationBar>
            <ProgressBar value={t.utilization} tone={t.utilizationTone} size="sm" />
          </UtilizationBar>
          <UtilizationValue color={t.utilizationDanger ? colors.errorSoft : undefined}>
            {t.utilization}%
          </UtilizationValue>
        </UtilizationWrap>
      ),
    },
    { key: 'collateral', header: 'Collateral Ratio', render: (t) => t.collateral },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>,
    },
    { key: 'ytm', header: 'YTM %', render: (t) => <YTM color={t.ytmColor}>{t.ytm}</YTM> },
  ];

  return (
    <Page>
      <Main>
        {view === 'dashboard' ? (
          <>
        {/* Macro Stats */}
        <MacroGrid>
          <MetricCard
            label="Active Global Nodes"
            value="1,402"
            icon="hub"
            delta="+12 since epoch"
            trend="up"
            accentColor={colors.text.primary}
          />

          <MetricCard
            label="Avg Network Latency"
            value="14.2"
            icon="speed"
            accentColor={colors.text.primary}
            delta="Optimal Threshold < 25ms"
          />

          <MetricCard
            label="Ledger Block Height"
            value="#9,201,042"
            icon="database"
            accentColor={colors.text.primary}
            delta="Finality: 6 Confirmations"
          />

          <Card>
            <PanelTitle>Approval Queue</PanelTitle>
            <div>
              <MacroBigValue>24</MacroBigValue>
              <MacroValueAffixMono>Pending</MacroValueAffixMono>
            </div>
            <AvatarStack
              size={24}
              max={2}
              avatars={[
                { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdhZeNh7RE7GOFe4d5JCRn0XbnmiGN49Z8l5Ss1W5InDBOaSUF6WfWDI7lqEH0eAGJIgD6oP8TbbS2AU_Mr3jxjkOnlefg1-C5YciRwNMujC2HNLR02uUckzDgW0sj5LMrRBhDSyZB7EVM99IJgFzM8Fn6FND9-tuMXC3_meaYC_9Kso4iECieP2QeTDREibXR93513kZdcsImFsNoygnTYbybzW5-ynPDZ7OlsUXm7o85g95WDmiOcxNte_VXQszCU8DN7TF5MGDR' },
                { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC38g1bSu3WEU3CLL2VNsxxUL7-Uq12rwqQEIZj4H0ApFCZTnzLHW4BkxDxYsAeZDEZvlr8dCZ9PMnqak_0fUuMTYeGyaXJx4lF-ZNmy28hXMxpUxfWwIe1Zqi4nJmzKy2S7wTb9wCSf53umwo3F84qw_0Qa3B_C1APGJhqY6Mfhaz85vhPp5qkawP0Jju7xIxQjJrqL5L3je370df7XSH5gZ5ic2aPLbgIWB3VQhjBbp_JN26H2rzcO2vdqUBhzuKW5z_lqyn5-id9' },

              ]}
            />
          </Card>
        </MacroGrid>

        {/* Simulation Engine + Data Seeding */}
        <MiddleGrid>
          {/* Simulation Engine */}
          <SimCard>
            <SimBgIcon className="material-symbols-outlined">storm</SimBgIcon>
            <SimHeader>
              <SimHeaderText>
                <SimTitle>Simulation Engine (Command Center)</SimTitle>
                <SimSub>Stochastic modeling for synthetic capital triggers.</SimSub>
              </SimHeaderText>
              <Badge variant="danger">Restricted Access</Badge>
            </SimHeader>

            <SimScenarioGrid>
              {SCENARIOS.map((scenario) => (
                <SimScenarioCard key={scenario.key}>
                  <SimScenarioTop>
                    <SimScenarioIcon className="material-symbols-outlined">{scenario.icon}</SimScenarioIcon>
                    <ToggleSwitch
                      id={`toggle-${scenario.key}`}
                      checked={scenarios[scenario.key]}
                      onChange={(v) => setScenarios((prev) => ({ ...prev, [scenario.key]: v }))}
                    />
                  </SimScenarioTop>
                  <SimScenarioTitle>{scenario.title}</SimScenarioTitle>
                  <SimScenarioDesc>{scenario.desc}</SimScenarioDesc>
                </SimScenarioCard>
              ))}
            </SimScenarioGrid>

            <SimBottomGrid>
              <div>
                <SimImpactLabel>Projected Impact Analysis</SimImpactLabel>
                <ImpactRow>
                  <ImpactMeta>
                    <span>Capital Depletion</span>
                    <ImpactValue color={colors.errorSoft}>12.4%</ImpactValue>
                  </ImpactMeta>
                  <ProgressBar value={12.4} tone="danger" size="sm" />
                </ImpactRow>
                <ImpactRow>
                  <ImpactMeta>
                    <span>Tranche Rupture Probability</span>
                    <ImpactValue color={colors.accent}>Low (2.1%)</ImpactValue>
                  </ImpactMeta>
                  <ProgressBar value={2.1} tone="gain" size="sm" />
                </ImpactRow>
              </div>
              <SimActions>
                  <Button variant="outline" size="sm" onClick={() => Simulation.dryRun(6, applyApi)}>Dry Run</Button>
                  <Button
                    variant="primary"
                    tone="danger"
                    size="sm"
                    onClick={() => {
                      if (simRunning) {
                        Simulation.stop();
                        setSimRunning(false);
                      } else {
                        Simulation.start({ applyToApi: applyApi });
                        setSimRunning(true);
                      }
                    }}
                  >
                    {simRunning ? 'Stop Simulation' : 'Trigger Live Event'}
                  </Button>
                  <SimApplyLabel>
                    <Checkbox checked={applyApi} onChange={(e) => setApplyApi(e.target.checked)} />
                    Apply to API
                  </SimApplyLabel>
                </SimActions>
            </SimBottomGrid>
          </SimCard>

          <SeedingPanel />
        </MiddleGrid>

        {/* Active Capital Tranches Table */}
        <TrancheSection>
          <TrancheSectionHeader>
            <TrancheSectionTitle>Active Capital Tranches</TrancheSectionTitle>
            <TrancheLegend>
              <LegendItem>
                <LegendDot color={colors.accent} />
                HEALTHY
              </LegendItem>
              <LegendItem>
                <LegendDot color={colors.errorSoft} />
                RESERVE LOW
              </LegendItem>
            </TrancheLegend>
          </TrancheSectionHeader>

          <TableWrap>
            <DataTable<Tranche>
              columns={trancheColumns}
              data={TRANCHES}
              rowActions={(t) =>
                t.action === 'halt' ? (
                  <CellRight>
                    <Button variant="primary" tone="danger" size="sm">HALT EXECUTION</Button>
                  </CellRight>
                ) : (
                  <CellRight>
                    <Button variant="text" tone="danger" size="sm">Emergency Pause</Button>
                  </CellRight>
                )
              }
            />
          </TableWrap>

          <TableFooter>
            <ViewAllBtn>
              VIEW ALL 42 TRANCHES
              <span className="material-symbols-outlined">keyboard_arrow_down</span>
            </ViewAllBtn>
          </TableFooter>
        </TrancheSection>

        {/* Bottom Grid */}
        <BottomGrid>
          {/* Investor & Insurer Stats */}
          <Panel>
            <PanelHeader>
              <PanelTitle>Investor &amp; Insurer Stats</PanelTitle>
              <PanelLink>
                Approval Portal
                <span className="material-symbols-outlined">open_in_new</span>
              </PanelLink>
            </PanelHeader>

            <UserStatGrid>
              <UserStatBox>
                <StatCard label="Active Investors" value="4,129" note="AUM: $2.4B" tone="success" />
              </UserStatBox>
              <UserStatBox>
                <StatCard label="Active Insurers" value="142" note="Claims: 1.2%" noteColor={colors.primarySoft} />
              </UserStatBox>
            </UserStatGrid>

            <ApprovalList>
              {APPROVALS.map((approval) => (
                <ApprovalItem key={approval.name}>
                  <ApprovalItemLeft>
                    <AvatarStack size={32} avatars={[{ initials: approval.initials, gradient: approval.gradient }]} />
                    <ApprovalInfo>
                      <ApprovalName>{approval.name}</ApprovalName>
                      <ApprovalRole>{approval.role}</ApprovalRole>
                    </ApprovalInfo>
                  </ApprovalItemLeft>
                  <ApprovalActions>
                    <ApprovalBtn variant="reject">
                      <span className="material-symbols-outlined">close</span>
                    </ApprovalBtn>
                    <ApprovalBtn variant="approve">
                      <span className="material-symbols-outlined">check</span>
                    </ApprovalBtn>
                  </ApprovalActions>
                </ApprovalItem>
              ))}
            </ApprovalList>
          </Panel>

          {/* Global Event Ledger */}
          <Panel>
            <PanelHeader>
              <PanelTitle>Global Event Ledger</PanelTitle>
              <PanelLiveTag>Live Feed</PanelLiveTag>
            </PanelHeader>

            <ActivityFeed
              items={LEDGER_ITEMS.map((entry) => ({
                time: entry.time,
                tag: entry.tag,
                tagColor: entry.tagColor,
                message: entry.message,
              }))}
            />

            <LedgerFooter>
              <LedgerFooterRow>
                <span>
                  NODE STATUS:{' '}
                  <LedgerStatusValue>SOVEREIGN</LedgerStatusValue>
                </span>
                <span>UPTIME: 99.9992%</span>
              </LedgerFooterRow>
            </LedgerFooter>
          </Panel>
        </BottomGrid>
          </>
        ) : view === 'line-of-business' ? (
          <>
            <SubViewBar>
              <SubViewBackBtn onClick={() => setView('dashboard')}>
                <span className="material-symbols-outlined">arrow_back</span>
                Dashboard
              </SubViewBackBtn>
              <SubViewLabel>Line of Business Templates</SubViewLabel>
            </SubViewBar>
            <LineOfBusinessPage />
          </>
        ) : view === 'insurer' ? (
          <InsurerDashboard />
        ) : view === 'seed' ? (
          <SeedingPanel />
        ) : view === 'orgs' ? (
          <OrganizationsSubpage onViewUsers={(o) => showOrgUsers({ id: o.id, name: o.name })} />
        ) : view === 'users' ? (
          <UsersSubpage />
        ) : selectedOrg ? (
          <OrgUsersSubpage org={selectedOrg} onBack={() => setView('orgs')} />
        ) : null}
      </Main>
    </Page>
  );
}
