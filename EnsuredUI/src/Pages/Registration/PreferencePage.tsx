import React, { useState } from "react";
import styled from "styled-components";
import TopNavBar from '../../xds/components/TopNavBar'
import SideNavBar from '../../xds/components/SideNavBar'
import Input from '../../xds/components/Input'
import Button from '../../xds/components/Button'
import Range from '../../xds/components/Range'
import Checkbox from '../../xds/components/Checkbox'
import SelectionCard from '../../xds/components/SelectionCard'
import { ProgressBar } from '../../xds/components/ProgressBar'
import { Badge } from '../../xds/components/Badge'
import InfoCard from '../../xds/components/InfoCard'
import { colors, withAlpha } from '../../xds/colors'

const Page = styled.main`
  margin-left: 0;
  padding-top: 4rem;
  min-height: 100vh;
  background: ${colors.surface};

  @media (min-width: 1024px) {
    margin-left: 18rem;
  }
`;

const Container = styled.div`
  max-width: 72rem;
  margin: 0 auto;
  padding: 3rem;
`;

const Header = styled.header`
  margin-bottom: 3rem;
`;

const PageTitle = styled.h1`
  font-size: 2.25rem;
  font-weight: 800;
  font-family: Manrope, sans-serif;
  letter-spacing: -0.02em;
  color: ${colors.onSurface};
  margin: 0 0 0.5rem;
`;

const PageLede = styled.p`
  color: ${colors.onSurfaceVariant};
  max-width: 42rem;
  font-size: 1.125rem;
  margin: 0;
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2rem;
`;

const PrimaryColumn = styled.div`
  grid-column: span 12;
  display: flex;
  flex-direction: column;
  gap: 2rem;

  @media (min-width: 1024px) {
    grid-column: span 7;
  }
`;

const SidebarColumn = styled.div`
  grid-column: span 12;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @media (min-width: 1024px) {
    grid-column: span 5;
  }
`;

const Section = styled.section`
  background: ${colors.surfaceContainerLow};
  border-radius: 0.75rem;
  padding: 2rem;
  border: 1px solid ${withAlpha(colors.neutral[400], 0.05)};
`;

const SectionTitle = styled.h3`
  font-size: 0.875rem;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: ${colors.primary};
  margin: 0 0 2rem;
`;

const SectionTitleTight = styled(SectionTitle)`
  margin-bottom: 1.5rem;
`;

const RangeStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3rem;
`;

const RangeGroup = styled.div``;

const RangeHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 1rem;
`;

const RangeLabel = styled.label`
  color: ${colors.onSurface};
  font-weight: 600;
  font-size: 1.125rem;
`;

const RangeReadout = styled.div`
  text-align: right;
`;

const RangeValue = styled.span<{ $tone?: 'primary' | 'secondary' }>`
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.5rem;
  color: ${(p) => (p.$tone === 'secondary' ? colors.secondary : colors.primary)};
`;

const RangeSub = styled.p`
  font-size: 0.75rem;
  color: ${colors.onSurfaceVariant};
  text-transform: uppercase;
  font-family: 'JetBrains Mono', monospace;
  margin: 0;
`;

const ErrorText = styled.span`
  color: ${colors.error};
`;

const Ticks = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.onSurfaceVariant};
  text-transform: uppercase;
`;

const CoverageGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const CoverageBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const CoverageIcon = styled.span`
  font-size: 1.875rem;
`;

const CoverageDesc = styled.p`
  font-size: 0.75rem;
  color: ${colors.onSurfaceVariant};
  line-height: 1.6;
  margin: 0;
`;

const AccreditationStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const FieldLabel = styled.label`
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  color: ${colors.onSurfaceVariant};
`;

const AccreditationRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
`;

const AccreditationText = styled.span`
  font-size: 0.75rem;
  color: ${colors.onSurfaceVariant};
  line-height: 1.6;
  transition: color 0.2s;

  &:hover {
    color: ${colors.onSurface};
  }
`;

const ProjectionPanel = styled.div`
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid ${withAlpha(colors.primary, 0.1)};
  background: ${colors.surfaceContainer};
  position: sticky;
  top: 6rem;
`;

const ProjectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
`;

const ProjectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 700;
  font-family: Manrope, sans-serif;
  margin: 0;
`;

const ProjectionSub = styled.p`
  font-size: 0.75rem;
  color: ${colors.onSurfaceVariant};
  margin: 0;
`;

const ProjectionMeters = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 2rem;
`;

const PeakMeter = styled.div`
  position: relative;
`;

const PeakTag = styled.div`
  position: absolute;
  top: -2rem;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  background: ${colors.surfaceContainerHighest};
  padding: 0.5rem;
  border-radius: 0.25rem;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  border: 1px solid ${colors.outlineVariant};
  box-shadow: 0 20px 25px -5px ${withAlpha(colors.black, 0.4)};
`;

const Metrics = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${withAlpha(colors.neutral[400], 0.1)};
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MetricLabel = styled.span`
  font-size: 0.75rem;
  color: ${colors.onSurfaceVariant};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const MetricValue = styled.span<{ $tone?: 'primary' | 'error' | 'neutral' }>`
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.125rem;
  color: ${(p) =>
    p.$tone === 'primary' ? colors.primary : p.$tone === 'error' ? colors.error : colors.onSurface};
`;

const ContinueWrap = styled.div`
  margin-top: 2rem;
`;

const ContinueButton = styled(Button)`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
`;

const EncryptionNote = styled.p`
  font-size: 10px;
  text-align: center;
  color: ${colors.onSurfaceVariant};
  margin-top: 1rem;
  font-family: 'JetBrains Mono', monospace;
`;

const DisclosureLink = styled.a`
  color: ${colors.primary};
  text-decoration: underline;
  text-decoration-color: ${withAlpha(colors.primary, 0.3)};
`;

const PreferencePage: React.FC = () => {
  const [risk, setRisk] = useState<number>(25);
  const [yieldTarget, setYieldTarget] = useState<number>(8);
  const [coverage, setCoverage] = useState<"natural" | "global">("natural");
  const [income, setIncome] = useState<string>("");
  const [netWorth, setNetWorth] = useState<string>("");
  const [accredited, setAccredited] = useState<boolean>(false);

  return (
    <>
      <TopNavBar />
      <SideNavBar />
      <Page>
        <Container>
          <Header>
            <PageTitle>Portfolio Preference</PageTitle>
            <PageLede>Define your quantitative exposure limits and coverage scope. Our algorithmic engine will suggest the optimal capital tranches based on your selections.</PageLede>
          </Header>

          <Layout>
            <PrimaryColumn>
              <Section>
                <SectionTitle>1. Risk Parameters</SectionTitle>
                <RangeStack>
                  <RangeGroup>
                    <RangeHead>
                      <RangeLabel>Risk Tolerance</RangeLabel>
                      <RangeReadout>
                        <RangeValue $tone="secondary">Conservative</RangeValue>
                        <RangeSub>Max Loss: <ErrorText>2.4%</ErrorText></RangeSub>
                      </RangeReadout>
                    </RangeHead>
                    <Range
                      max={100}
                      min={1}
                      value={risk}
                      onChange={(e) => setRisk(Number(e.target.value))}
                    />
                    <Ticks>
                      <span>Preservation</span>
                      <span>Balanced</span>
                      <span>Aggressive</span>
                    </Ticks>
                  </RangeGroup>

                  <RangeGroup>
                    <RangeHead>
                      <RangeLabel>Target Annual Yield</RangeLabel>
                      <RangeReadout>
                        <RangeValue $tone="primary">{yieldTarget.toFixed(2)}%</RangeValue>
                        <RangeSub>Net of Fees</RangeSub>
                      </RangeReadout>
                    </RangeHead>
                    <Range
                      max={25}
                      min={4}
                      value={yieldTarget}
                      onChange={(e) => setYieldTarget(Number(e.target.value))}
                    />
                    <Ticks>
                      <span>4.0% Floor</span>
                      <span>14.5% Targeted</span>
                      <span>25.0% Cap</span>
                    </Ticks>
                  </RangeGroup>
                </RangeStack>
              </Section>

              <Section>
                <SectionTitleTight>2. Preferred Coverage</SectionTitleTight>
                <CoverageGrid>
                  <SelectionCard
                    title="Only Natural Catastrophes"
                    icon={<CoverageIcon className="material-symbols-outlined">nature</CoverageIcon>}
                    active={coverage === "natural"}
                    onClick={() => setCoverage("natural")}
                  >
                    <CoverageBody>
                      <CoverageDesc>Focus exclusively on high-impact environmental events like hurricanes and seismic activity.</CoverageDesc>
                    </CoverageBody>
                  </SelectionCard>

                  <SelectionCard
                    title="Global Diversified"
                    icon={<CoverageIcon className="material-symbols-outlined">public</CoverageIcon>}
                    active={coverage === "global"}
                    onClick={() => setCoverage("global")}
                  >
                    <CoverageBody>
                      <CoverageDesc>A balanced basket of aviation, marine, property, and cyber risk across all major jurisdictions.</CoverageDesc>
                    </CoverageBody>
                  </SelectionCard>
                </CoverageGrid>
              </Section>

              <Section>
                <SectionTitleTight>3. Accreditation Status</SectionTitleTight>
                <AccreditationStack>
                  <FieldGrid>
                    <Field>
                      <FieldLabel>Annual Income (USD)</FieldLabel>
                      <Input
                        placeholder="$200,000+"
                        value={income}
                        onChange={(e) => setIncome(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Net Worth (Excl. Primary Residence)</FieldLabel>
                      <Input
                        placeholder="$1,000,000+"
                        value={netWorth}
                        onChange={(e) => setNetWorth(e.target.value)}
                      />
                    </Field>
                  </FieldGrid>
                  <AccreditationRow>
                    <Checkbox checked={accredited} onChange={(e) => setAccredited(Boolean((e.target as HTMLInputElement).checked))} />
                    <AccreditationText>I hereby confirm that I am an "Accredited Investor" as defined under Rule 501 of Regulation D of the Securities Act of 1933.</AccreditationText>
                  </AccreditationRow>
                </AccreditationStack>
              </Section>
            </PrimaryColumn>

            <SidebarColumn>
              <ProjectionPanel>
                <ProjectionHead>
                  <div>
                    <ProjectionTitle>Yield Projection</ProjectionTitle>
                    <ProjectionSub>Modeled for 2024-2025 cycle</ProjectionSub>
                  </div>
                  <Badge variant="secondary">Optimized</Badge>
                </ProjectionHead>

                <ProjectionMeters>
                  <ProgressBar value={30} tone="primary" size="sm" />
                  <ProgressBar value={45} tone="primary" size="sm" />
                  <ProgressBar value={60} tone="primary" size="sm" />
                  <PeakMeter>
                    <PeakTag>Expected Peak</PeakTag>
                    <ProgressBar value={80} tone="primary" size="sm" />
                  </PeakMeter>
                  <ProgressBar value={50} tone="primary" size="sm" />
                  <ProgressBar value={35} tone="primary" size="sm" />
                </ProjectionMeters>

                <Metrics>
                  <MetricRow>
                    <MetricLabel>Projected APY</MetricLabel>
                    <MetricValue $tone="primary">{yieldTarget.toFixed(2)}%</MetricValue>
                  </MetricRow>
                  <MetricRow>
                    <MetricLabel>Annualized Volatility</MetricLabel>
                    <MetricValue>1.2%</MetricValue>
                  </MetricRow>
                  <MetricRow>
                    <MetricLabel>Max Drawdown Target</MetricLabel>
                    <MetricValue $tone="error">-2.4%</MetricValue>
                  </MetricRow>
                </Metrics>

                <ContinueWrap>
                  <ContinueButton>
                    <span>Continue to Verification</span>
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </ContinueButton>
                  <EncryptionNote>ENCRYPTED END-TO-END VIA SYNHETIX LEDGER</EncryptionNote>
                </ContinueWrap>
              </ProjectionPanel>

              <InfoCard tone="warning" icon="warning" title="Institutional Disclosure">
                Reinsurance capital involves significant risk of loss. The "Conservative" profile minimizes but does not eliminate catastrophic event exposure. Ensure you have reviewed the <DisclosureLink href="#">Master Risk Disclosure</DisclosureLink> before proceeding.
              </InfoCard>
            </SidebarColumn>
          </Layout>
        </Container>
      </Page>
    </>
  );
};

export default PreferencePage;
