import React, { useEffect, useState } from 'react';
import {
  Page,
  Main,
  MacroGrid,
  MacroCard,
  MacroCardHeader,
  MacroCardLabel,
  MacroCardIcon,
  MacroCardValue,
  MacroCardNote,
  AvatarStack,
  AvatarStackImg,
  AvatarStackCount,
  MiddleGrid,
  SimCard,
  SimBgIcon,
  SimHeader,
  SimTitle,
  SimSub,
  SimBadge,
  SimScenarioGrid,
  SimScenarioCard,
  SimScenarioTop,
  SimScenarioIcon,
  ToggleWrap,
  ToggleInput,
  ToggleSlider,
  SimScenarioTitle,
  SimScenarioDesc,
  SimBottomGrid,
  SimImpactLabel,
  ImpactRow,
  ImpactMeta,
  ImpactTrack,
  ImpactFill,
  SimActions,
  SimDryRunBtn,
  SimTriggerBtn,
  SeedingSection,
  SeedingSectionLabel,
  SeedList,
  SeedItem,
  SeedItemInner,
  SeedItemLeft,
  SeedItemIcon,
  SeedItemTitle,
  SeedItemSub,
  SeedItemActions,
  SeedIconBtn,
  IntegrityBox,
  IntegrityHeader,
  IntegrityIcon,
  IntegrityLabel,
  IntegrityText,
  TrancheSection,
  TrancheSectionHeader,
  TrancheSectionTitle,
  TrancheLegend,
  LegendItem,
  LegendDot,
  TableWrap,
  Table,
  THead,
  THeadTr,
  TH,
  TBody,
  TD,
  TrancheName,
  TrancheSub,
  UtilizationWrap,
  UtilizationTrack,
  UtilizationFill,
  StatusBadge,
  YTM,
  ActionBtn,
  TableFooter,
  ViewAllBtn,
  BottomGrid,
  Panel,
  PanelHeader,
  PanelTitle,
  PanelLink,
  UserStatGrid,
  UserStatBox,
  UserStatLabel,
  UserStatValue,
  UserStatNote,
  ApprovalList,
  ApprovalItem,
  ApprovalItemLeft,
  ApprovalAvatar,
  ApprovalInfo,
  ApprovalName,
  ApprovalRole,
  ApprovalActions,
  ApprovalBtn,
  LedgerList,
  LedgerRow,
  LedgerTime,
  LedgerTag,
  LedgerText,
  LedgerFooter,
  LedgerFooterRow,
} from './AdminPage.styles';

import OrganizationsSubpage from './OrganizationsSubpage';
import UsersSubpage from './UsersSubpage';
import OrgUsersSubpage from './OrgUsersSubpage';
import SeedingPanel from './SeedingPanel';
import InsurerDashboard from '../InsurerDashboard/InsurerDashboard';
import Simulation, { SimEvent } from '../../simulations/simulationEngine';

export default function AdminPage() {
  const [view, setView] = useState<'dashboard' | 'orgs' | 'users' | 'orgUsers' | 'seed' | 'insurer'>('dashboard');
  const [selectedOrg, setSelectedOrg] = useState<{ id: number; name: string } | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [applyApi, setApplyApi] = useState(false);
  const [simLedger, setSimLedger] = useState<SimEvent[]>([]);

  const showOrgUsers = (org: { id: number; name: string }) => {
    setSelectedOrg(org);
    setView('orgUsers');
  };

  return (
    <Page>
      <Main>
        {view === 'dashboard' ? (
          <>
        {/* Macro Stats */}
        <MacroGrid>
          <MacroCard accentColor="#4b8eff">
            <MacroCardHeader>
              <MacroCardLabel>Active Global Nodes</MacroCardLabel>
              <MacroCardIcon color="#adc6ff">
                <span className="material-symbols-outlined">hub</span>
              </MacroCardIcon>
            </MacroCardHeader>
            <MacroCardValue>1,402</MacroCardValue>
            <MacroCardNote color="#4edea3">
              <span className="material-symbols-outlined">trending_up</span>
              +12 since epoch
            </MacroCardNote>
          </MacroCard>

          <MacroCard accentColor="#00a572">
            <MacroCardHeader>
              <MacroCardLabel>Avg Network Latency</MacroCardLabel>
              <MacroCardIcon color="#4edea3">
                <span className="material-symbols-outlined">speed</span>
              </MacroCardIcon>
            </MacroCardHeader>
            <MacroCardValue>
              14.2<span style={{ fontSize: '0.875rem', fontWeight: 300, color: '#c1c6d7', marginLeft: 4 }}>ms</span>
            </MacroCardValue>
            <MacroCardNote>Optimal Threshold &lt; 25ms</MacroCardNote>
          </MacroCard>

          <MacroCard accentColor="#4b8eff">
            <MacroCardHeader>
              <MacroCardLabel>Ledger Block Height</MacroCardLabel>
              <MacroCardIcon color="#adc6ff">
                <span className="material-symbols-outlined">database</span>
              </MacroCardIcon>
            </MacroCardHeader>
            <MacroCardValue style={{ fontFamily: "'JetBrains Mono', monospace" }}>#9,201,042</MacroCardValue>
            <MacroCardNote>Finality: 6 Confirmations</MacroCardNote>
          </MacroCard>

          <MacroCard>
            <MacroCardHeader>
              <MacroCardLabel>Approval Queue</MacroCardLabel>
              <MacroCardIcon color="#ffb3ad">
                <span className="material-symbols-outlined">person_add</span>
              </MacroCardIcon>
            </MacroCardHeader>
            <MacroCardValue>
              24{' '}
              <span style={{ fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 400, color: '#c1c6d7' }}>
                Pending
              </span>
            </MacroCardValue>
            <AvatarStack>
              <AvatarStackImg
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdhZeNh7RE7GOFe4d5JCRn0XbnmiGN49Z8l5Ss1W5InDBOaSUF6WfWDI7lqEH0eAGJIgD6oP8TbbS2AU_Mr3jxjkOnlefg1-C5YciRwNMujC2HNLR02uUckzDgW0sj5LMrRBhDSyZB7EVM99IJgFzM8Fn6FND9-tuMXC3_meaYC_9Kso4iECieP2QeTDREibXR93513kZdcsImFsNoygnTYbybzW5-ynPDZ7OlsUXm7o85g95WDmiOcxNte_VXQszCU8DN7TF5MGDR"
                alt="Pending User"
              />
              <AvatarStackImg
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC38g1bSu3WEU3CLL2VNsxxUL7-Uq12rwqQEIZj4H0ApFCZTnzLHW4BkxDxYsAeZDEZvlr8dCZ9PMnqak_0fUuMTYeGyaXJx4lF-ZNmy28hXMxpUxfWwIe1Zqi4nJmzKy2S7wTb9wCSf53umwo3F84qw_0Qa3B_C1APGJhqY6Mfhaz85vhPp5qkawP0Jju7xIxQjJrqL5L3je370df7XSH5gZ5ic2aPLbgIWB3VQhjBbp_JN26H2rzcO2vdqUBhzuKW5z_lqyn5-id9"
                alt="Pending User"
              />
              <AvatarStackCount>+22</AvatarStackCount>
            </AvatarStack>
          </MacroCard>
        </MacroGrid>

        {/* Simulation Engine + Data Seeding */}
        <MiddleGrid>
          {/* Simulation Engine */}
          <SimCard>
            <SimBgIcon className="material-symbols-outlined">storm</SimBgIcon>
            <SimHeader>
              <div>
                <SimTitle>Simulation Engine (Command Center)</SimTitle>
                <SimSub>Stochastic modeling for synthetic capital triggers.</SimSub>
              </div>
              <SimBadge>Restricted Access</SimBadge>
            </SimHeader>

            <SimScenarioGrid>
              <SimScenarioCard>
                <SimScenarioTop>
                  <SimScenarioIcon className="material-symbols-outlined">cyclone</SimScenarioIcon>
                  <ToggleWrap htmlFor="toggle-hurricane">
                    <ToggleInput id="toggle-hurricane" />
                    <ToggleSlider />
                  </ToggleWrap>
                </SimScenarioTop>
                <SimScenarioTitle>Hurricane Scenario</SimScenarioTitle>
                <SimScenarioDesc>Cat-5 landfall modeling for Atlantic Basin tranches.</SimScenarioDesc>
              </SimScenarioCard>

              <SimScenarioCard>
                <SimScenarioTop>
                  <SimScenarioIcon className="material-symbols-outlined">waves</SimScenarioIcon>
                  <ToggleWrap htmlFor="toggle-seismic">
                    <ToggleInput id="toggle-seismic" />
                    <ToggleSlider />
                  </ToggleWrap>
                </SimScenarioTop>
                <SimScenarioTitle>Seismic Stress Test</SimScenarioTitle>
                <SimScenarioDesc>Simulated 8.2 Richter event for Pacific Rim liability.</SimScenarioDesc>
              </SimScenarioCard>

              <SimScenarioCard>
                <SimScenarioTop>
                  <SimScenarioIcon className="material-symbols-outlined">water_drop</SimScenarioIcon>
                  <ToggleWrap htmlFor="toggle-liquidity">
                    <ToggleInput id="toggle-liquidity" />
                    <ToggleSlider />
                  </ToggleWrap>
                </SimScenarioTop>
                <SimScenarioTitle>Market Liquidity Drain</SimScenarioTitle>
                <SimScenarioDesc>Rapid withdrawal simulation for secondary tranches.</SimScenarioDesc>
              </SimScenarioCard>
            </SimScenarioGrid>

            <SimBottomGrid>
              <div>
                <SimImpactLabel>Projected Impact Analysis</SimImpactLabel>
                <ImpactRow>
                  <ImpactMeta>
                    <span>Capital Depletion</span>
                    <span style={{ color: '#ffb4ab' }}>12.4%</span>
                  </ImpactMeta>
                  <ImpactTrack>
                    <ImpactFill width="12.4%" color="#ffb4ab" />
                  </ImpactTrack>
                </ImpactRow>
                <ImpactRow style={{ marginTop: '0.5rem' }}>
                  <ImpactMeta>
                    <span>Tranche Rupture Probability</span>
                    <span style={{ color: '#4edea3' }}>Low (2.1%)</span>
                  </ImpactMeta>
                  <ImpactTrack>
                    <ImpactFill width="2.1%" color="#4edea3" />
                  </ImpactTrack>
                </ImpactRow>
              </div>
              <SimActions>
                  <SimDryRunBtn onClick={() => Simulation.dryRun(6, applyApi)}>Dry Run</SimDryRunBtn>
                  <SimTriggerBtn
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
                  </SimTriggerBtn>
                  <label style={{ marginLeft: 12, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#c1c6d7' }}>
                    <input type="checkbox" checked={applyApi} onChange={(e) => setApplyApi(e.target.checked)} />
                    Apply to API
                  </label>
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
                <LegendDot color="#4edea3" />
                HEALTHY
              </LegendItem>
              <LegendItem>
                <LegendDot color="#ffb3ad" />
                RESERVE LOW
              </LegendItem>
            </TrancheLegend>
          </TrancheSectionHeader>

          <TableWrap>
            <Table>
              <THead>
                <THeadTr>
                  <TH>Tranche ID</TH>
                  <TH>Capital Utilization</TH>
                  <TH>Collateral Ratio</TH>
                  <TH>Status</TH>
                  <TH>YTM %</TH>
                  <TH style={{ textAlign: 'right' }}>Actions</TH>
                </THeadTr>
              </THead>
              <TBody>
                <tr>
                  <TD>
                    <TrancheName>TR-8820-A</TrancheName>
                    <TrancheSub>Synthetic Catastrophe Bond</TrancheSub>
                  </TD>
                  <TD>
                    <UtilizationWrap>
                      <UtilizationTrack>
                        <UtilizationFill width="42%" color="#4edea3" />
                      </UtilizationTrack>
                      <span>42.1%</span>
                    </UtilizationWrap>
                  </TD>
                  <TD>164.2%</TD>
                  <TD><StatusBadge variant="performing">PERFORMING</StatusBadge></TD>
                  <TD><YTM color="#4edea3">+12.40%</YTM></TD>
                  <TD style={{ textAlign: 'right' }}>
                    <ActionBtn>Emergency Pause</ActionBtn>
                  </TD>
                </tr>
                <tr>
                  <TD>
                    <TrancheName>TR-9112-X</TrancheName>
                    <TrancheSub>Hurricane Aggregator</TrancheSub>
                  </TD>
                  <TD>
                    <UtilizationWrap>
                      <UtilizationTrack>
                        <UtilizationFill width="89%" color="#adc6ff" />
                      </UtilizationTrack>
                      <span>89.4%</span>
                    </UtilizationWrap>
                  </TD>
                  <TD>102.5%</TD>
                  <TD><StatusBadge variant="rebalancing">REBALANCING</StatusBadge></TD>
                  <TD><YTM color="#adc6ff">+18.15%</YTM></TD>
                  <TD style={{ textAlign: 'right' }}>
                    <ActionBtn>Emergency Pause</ActionBtn>
                  </TD>
                </tr>
                <tr>
                  <TD>
                    <TrancheName>TR-0045-L</TrancheName>
                    <TrancheSub>Liquidity Bridge (ETH/USDC)</TrancheSub>
                  </TD>
                  <TD>
                    <UtilizationWrap>
                      <UtilizationTrack>
                        <UtilizationFill width="15%" color="#4edea3" />
                      </UtilizationTrack>
                      <span>15.8%</span>
                    </UtilizationWrap>
                  </TD>
                  <TD>540.0%</TD>
                  <TD><StatusBadge variant="performing">PERFORMING</StatusBadge></TD>
                  <TD><YTM color="#4edea3">+4.20%</YTM></TD>
                  <TD style={{ textAlign: 'right' }}>
                    <ActionBtn>Emergency Pause</ActionBtn>
                  </TD>
                </tr>
                <tr>
                  <TD>
                    <TrancheName>TR-7761-B</TrancheName>
                    <TrancheSub>Seismic Parametric</TrancheSub>
                  </TD>
                  <TD>
                    <UtilizationWrap>
                      <UtilizationTrack>
                        <UtilizationFill width="94%" color="#ffb4ab" />
                      </UtilizationTrack>
                      <span style={{ color: '#ffb4ab' }}>94.2%</span>
                    </UtilizationWrap>
                  </TD>
                  <TD>98.1%</TD>
                  <TD><StatusBadge variant="margin">MARGIN CALL</StatusBadge></TD>
                  <TD><YTM color="#ffb4ab">+24.50%</YTM></TD>
                  <TD style={{ textAlign: 'right' }}>
                    <ActionBtn danger>HALT EXECUTION</ActionBtn>
                  </TD>
                </tr>
              </TBody>
            </Table>
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
                <UserStatLabel>Active Investors</UserStatLabel>
                <UserStatValue>4,129</UserStatValue>
                <UserStatNote color="#4edea3">AUM: $2.4B</UserStatNote>
              </UserStatBox>
              <UserStatBox>
                <UserStatLabel>Active Insurers</UserStatLabel>
                <UserStatValue>142</UserStatValue>
                <UserStatNote color="#adc6ff">Claims: 1.2%</UserStatNote>
              </UserStatBox>
            </UserStatGrid>

            <ApprovalList>
              <ApprovalItem>
                <ApprovalItemLeft>
                  <ApprovalAvatar gradient="linear-gradient(135deg, #adc6ff, #1d4ed8)">SK</ApprovalAvatar>
                  <ApprovalInfo>
                    <ApprovalName>Swiss Re Capital Group</ApprovalName>
                    <ApprovalRole>Tier 1 Institutional</ApprovalRole>
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

              <ApprovalItem>
                <ApprovalItemLeft>
                  <ApprovalAvatar gradient="linear-gradient(135deg, #ffb3ad, #be123c)">LM</ApprovalAvatar>
                  <ApprovalInfo>
                    <ApprovalName>Lloyd's Syndicate 402</ApprovalName>
                    <ApprovalRole>Cedent Onboarding</ApprovalRole>
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
            </ApprovalList>
          </Panel>

          {/* Global Event Ledger */}
          <Panel>
            <PanelHeader>
              <PanelTitle>Global Event Ledger</PanelTitle>
              <span style={{ fontSize: '0.625rem', fontFamily: "'JetBrains Mono', monospace", color: '#c1c6d7' }}>
                Live Feed
              </span>
            </PanelHeader>

            <LedgerList>
              <LedgerRow>
                <LedgerTime>14:22:01</LedgerTime>
                <LedgerTag color="#4edea3">[OK]</LedgerTag>
                <LedgerText>Liquidity rebalance complete for Tranche TR-0045-L...</LedgerText>
              </LedgerRow>
              <LedgerRow>
                <LedgerTime>14:18:45</LedgerTime>
                <LedgerTag color="#adc6ff">[SYS]</LedgerTag>
                <LedgerText>Satellite imagery batch #992 processed (Cloud coverage 12%)...</LedgerText>
              </LedgerRow>
              <LedgerRow>
                <LedgerTime>14:15:32</LedgerTime>
                <LedgerTag color="#ffb3ad">[WARN]</LedgerTag>
                <LedgerText>Margin proximity threshold reached for TR-7761-B...</LedgerText>
              </LedgerRow>
              <LedgerRow>
                <LedgerTime>14:02:11</LedgerTime>
                <LedgerTag color="#4edea3">[OK]</LedgerTag>
                <LedgerText>New Cedent 'Munich Re-Structured' approved and seeded...</LedgerText>
              </LedgerRow>
              <LedgerRow>
                <LedgerTime>13:58:44</LedgerTime>
                <LedgerTag color="#adc6ff">[SYS]</LedgerTag>
                <LedgerText>Daily risk coefficient audit initiated by NODE_01_ADMIN...</LedgerText>
              </LedgerRow>
            </LedgerList>

            <LedgerFooter>
              <LedgerFooterRow>
                <span>
                  NODE STATUS:{' '}
                  <span style={{ color: '#4edea3' }}>SOVEREIGN</span>
                </span>
                <span>UPTIME: 99.9992%</span>
              </LedgerFooterRow>
            </LedgerFooter>
          </Panel>
        </BottomGrid>
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
