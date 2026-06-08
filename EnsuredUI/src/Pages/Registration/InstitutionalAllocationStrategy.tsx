import React from "react";
import styled from "styled-components";
import Checkbox from '../../xds/components/Checkbox'
import { Card } from '../../xds/components/Card'
import SectionHeader from '../../xds/components/SectionHeader'
import FormField from '../../xds/components/FormField'
import { Select } from '../../xds/components/Select'
import { ProgressBar } from '../../xds/components/ProgressBar'
import { Button } from '../../xds/components/Button'
import { colors, withAlpha } from '../../xds/colors'

const Main = styled.main`
  padding-top: 6rem; /* pt-24 */
  padding-bottom: 3rem; /* pb-12 */
  min-height: 100vh;
  box-sizing: border-box;
  color: inherit;
`;

const Inner = styled.div`
  margin: 0 auto;
`;

const Header = styled.header`
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  font-family: Manrope, sans-serif;
  font-size: 3rem; /* text-5xl */
  font-weight: 800;
  margin-bottom: 1rem;
  line-height: 1.05;
`;

const Subtitle = styled.p`
  color: ${withAlpha(colors.onSurfaceMuted, 0.9)}; /* text-on-surface-variant */
  font-size: 1.125rem; /* text-lg */
  max-width: 40rem;
  line-height: 1.4;
`;

const ProgressGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 4rem;
`;

const ActiveStep = styled(ProgressBar)`
  filter: drop-shadow(0 0 10px ${withAlpha(colors.primarySoft, 0.4)});
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1.5rem; /* gap-6 */
`;

const LeftCol = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @media (min-width: 1024px) {
    grid-column: span 7 / span 7;
  }
`;

const RightCol = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @media (min-width: 1024px) {
    grid-column: span 5 / span 5;
  }
`;

const CardLow = styled(Card)`
  background: ${colors.surfacePanel}; /* surface-container-low */
  padding: 2rem;
  border-radius: 1rem;
  position: relative;
  overflow: hidden;
`;

const CardHigh = styled(Card)`
  background: ${colors.surfaceHigh}; /* surface-container-high */
  padding: 2rem;
  border-radius: 1rem;
  position: relative;
  overflow: hidden;
`;

const CardOutline = styled(Card)`
  background: ${colors.surfaceRaised}; /* surface-container */
  padding: 2rem;
  border-radius: 1rem;
  position: relative;
  overflow: hidden;
  border: 1px solid ${withAlpha(colors.border, 0.15)}; /* border-outline-variant/15 */
`;

const FaintOutlineCard = styled(CardOutline)`
  border-color: ${withAlpha(colors.border, 0.1)};
`;

const GridTwo = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
`;

const CapitalSourceSection = styled.div`
  margin-top: 2rem;
`;

const FieldLabel = styled.label`
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${withAlpha(colors.outline, 1)}; /* outline */
  margin-bottom: 0.5rem;
`;

const CapitalSourceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
`;

const SourceButton = styled.button`
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid ${colors.border};
  text-align: left;
  font-size: 0.875rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
`;

const SourceButtonActive = styled(SourceButton)`
  border-color: ${colors.primarySoft}; /* primary */
  background: ${withAlpha(colors.primary, 0.06)}; /* primary-container/10 */
  color: ${colors.primarySoft};
  font-weight: 700;
`;

const MandateList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const MandateCard = styled.div`
  padding: 1rem;
  border-radius: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MandateCardActive = styled(MandateCard)`
  background: ${colors.surfacePanel};
  border-left: 4px solid ${colors.accent};
`;

const MandateCardIdle = styled(MandateCard)`
  border: 1px solid ${withAlpha(colors.border, 0.3)};
  background: transparent;
`;

const MandateTitle = styled.p<{ $muted?: boolean }>`
  font-weight: 700;
  color: ${(p) => (p.$muted ? withAlpha(colors.onSurfaceStrong, 0.7) : colors.onSurfaceStrong)};
`;

const MandateDesc = styled.p<{ $muted?: boolean }>`
  font-size: 0.75rem;
  color: ${(p) => (p.$muted ? withAlpha(colors.onSurfaceStrong, 0.4) : withAlpha(colors.onSurfaceStrong, 0.8))};
`;

const PerilHint = styled.p`
  font-size: 0.75rem;
  color: ${withAlpha(colors.onSurfaceMuted, 0.9)};
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-family: 'JetBrains Mono', monospace;
`;

const PerilList = styled.div`
  display: grid;
  gap: 0.5rem;
`;

const PerilRow = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: ${colors.surfaceRaised};
  border-radius: 0.5rem;
`;

const PerilLeft = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
`;

const PerilName = styled.span`
  font-weight: 500;
`;

const ProjectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
`;

const ProjectionEyebrow = styled.p`
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.primarySoft};
  text-transform: uppercase;
  margin-bottom: 0.25rem;
`;

const ProjectionValue = styled.h4`
  font-family: 'JetBrains Mono', monospace;
  font-size: 2rem;
  font-weight: 700;
`;

const ProjectionUnit = styled.span`
  font-size: 1rem;
  opacity: 0.5;
  margin-left: 0.25rem;
`;

const FadedIcon = styled.span`
  opacity: 0.4;
`;

const ProjectionMeters = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 6rem;
  margin-bottom: 1rem;
`;

const ProjectionFootnote = styled.p`
  font-size: 0.625rem;
  color: ${withAlpha(colors.onSurfaceMuted, 0.9)};
`;

const ZoneHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const ZoneIcon = styled.span`
  font-size: 0.75rem;
`;

const ZoneLabel = styled.span`
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${withAlpha(colors.outline, 1)};
`;

const MapFrame = styled.div`
  width: 100%;
  height: 8rem;
  border-radius: 0.5rem;
  background: ${colors.background};
  position: relative;
  overflow: hidden;
`;

const MapImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.6;
  filter: grayscale(1);
  transition: filter 200ms;
`;

const MapGradient = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, ${withAlpha(colors.surfaceRaised, 1)}, transparent);
`;

const MapTag = styled.div`
  position: absolute;
  bottom: 0.75rem;
  left: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MapPulse = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: ${colors.accent};
  animation: pulse 2s infinite;
`;

const MapTagText = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 0.75rem;
`;

const FooterBar = styled.footer`
  margin-top: 3rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid ${withAlpha(colors.border, 0.2)};
  padding-top: 2rem;
`;

const BackLink = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: none;
  color: ${withAlpha(colors.onSurfaceStrong, 0.7)};
  cursor: pointer;
`;

const FooterActions = styled.div`
  display: flex;
  gap: 1rem;
`;

const GhostButton = styled(Button)`
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid ${colors.border};
  background: transparent;
  color: inherit;
`;

const PrimaryAction = styled(Button)`
  padding: 0.75rem 2.5rem;
  border-radius: 0.5rem;
  background: ${colors.primarySoft};
  color: ${colors.onPrimary}; /* on-primary */
  font-weight: 700;
`;

const InstitutionalAllocationStrategy: React.FC = () => {
  return (
    <Main>
      <Inner>
        <Header>
          <Title>Institutional Allocation Strategy</Title>
          <Subtitle>
            Define your capital deployment parameters. This profile will calibrate the automated risk modeling and algorithmic tranche distribution.
          </Subtitle>
        </Header>

        <ProgressGrid>
          <ProgressBar value={100} tone="primary" size="sm" />
          <ProgressBar value={100} tone="primary" size="sm" />
          <ActiveStep value={100} tone="primary" size="sm" />
          <ProgressBar value={0} tone="primary" size="sm" />
        </ProgressGrid>

        <Grid>
          <LeftCol>
            <CardLow>
              <SectionHeader
                icon={<span className="material-symbols-outlined text-primary">gavel</span>}
                title="Entity Information"
              />
              <GridTwo>
                <FormField label="Legal Entity Identifier (LEI)" placeholder="549300..." type="text" />
                <div>
                  <FieldLabel>Tax Jurisdiction</FieldLabel>
                  <Select>
                    <option value="bermuda">Bermuda (Class 4)</option>
                    <option value="usa">United States</option>
                    <option value="uk">United Kingdom (Lloyd's)</option>
                    <option value="cayman">Cayman Islands</option>
                  </Select>
                </div>
              </GridTwo>
              <CapitalSourceSection>
                <FieldLabel>Primary Capital Source</FieldLabel>
                <CapitalSourceGrid>
                  <SourceButton>Pension Fund</SourceButton>
                  <SourceButtonActive>Sovereign Wealth</SourceButtonActive>
                  <SourceButton>ILS Fund</SourceButton>
                </CapitalSourceGrid>
              </CapitalSourceSection>
            </CardLow>

            <CardOutline>
              <SectionHeader
                icon={<span className="material-symbols-outlined text-secondary">assignment_turned_in</span>}
                title="Investment Mandate"
              />
              <MandateList>
                <MandateCardActive>
                  <div>
                    <MandateTitle>Yield Seeker</MandateTitle>
                    <MandateDesc>Targeting high-risk layers with 12-18% IRR expectations.</MandateDesc>
                  </div>
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>radio_button_checked</span>
                </MandateCardActive>
                <MandateCardIdle>
                  <div>
                    <MandateTitle $muted>Diversified Exposure</MandateTitle>
                    <MandateDesc $muted>Balanced risk profile across peak and non-peak zones.</MandateDesc>
                  </div>
                  <span className="material-symbols-outlined text-outline">radio_button_unchecked</span>
                </MandateCardIdle>
                <MandateCardIdle>
                  <div>
                    <MandateTitle $muted>Conservative Protection</MandateTitle>
                    <MandateDesc $muted>Senior layers with capital preservation priority.</MandateDesc>
                  </div>
                  <span className="material-symbols-outlined text-outline">radio_button_unchecked</span>
                </MandateCardIdle>
              </MandateList>
            </CardOutline>
          </LeftCol>

          <RightCol>
            <FaintOutlineCard>
              <SectionHeader
                icon={<span className="material-symbols-outlined text-tertiary">category</span>}
                title="Asset Class Preference"
              />
              <PerilHint>
                Select multiple perils for the portfolio:
              </PerilHint>
              <PerilList>
                <PerilRow>
                  <PerilLeft>
                    <span className="material-symbols-outlined text-primary">cyclone</span>
                    <PerilName>Wind (Hurricanes/Typhoons)</PerilName>
                  </PerilLeft>
                  <Checkbox defaultChecked />
                </PerilRow>
                <PerilRow>
                  <PerilLeft>
                    <span className="material-symbols-outlined text-tertiary">volcano</span>
                    <PerilName>Quake (Seismic Activity)</PerilName>
                  </PerilLeft>
                  <Checkbox defaultChecked />
                </PerilRow>
                <PerilRow>
                  <PerilLeft>
                    <span className="material-symbols-outlined text-secondary">water_drop</span>
                    <PerilName>Flood (Pluvial/Fluvial)</PerilName>
                  </PerilLeft>
                  <Checkbox />
                </PerilRow>
              </PerilList>
            </FaintOutlineCard>

            <CardHigh>
              <ProjectionHeader>
                <div>
                  <ProjectionEyebrow>Risk Exposure Estimate</ProjectionEyebrow>
                  <ProjectionValue>7.42<ProjectionUnit>%</ProjectionUnit></ProjectionValue>
                </div>
                <FadedIcon className="material-symbols-outlined">query_stats</FadedIcon>
              </ProjectionHeader>
              <ProjectionMeters>
                <ProgressBar value={50} tone="primary" size="sm" />
                <ProgressBar value={66} tone="primary" size="sm" />
                <ProgressBar value={83} tone="primary" size="sm" />
                <ProgressBar value={100} tone="primary" size="sm" />
                <ProgressBar value={58} tone="gain" size="sm" />
                <ProgressBar value={41} tone="danger" size="sm" />
              </ProjectionMeters>
              <ProjectionFootnote>
                Projected return profile based on selected perils and Bermuda tax jurisdiction logic. Subject to dynamic pricing fluctuations.
              </ProjectionFootnote>
            </CardHigh>

            <CardOutline>
              <ZoneHeader>
                <ZoneIcon className="material-symbols-outlined">public</ZoneIcon>
                <ZoneLabel>Primary Allocation Zone</ZoneLabel>
              </ZoneHeader>
              <MapFrame>
                <MapImage alt="stylized geographic map showing island of bermuda with data overlay points in electric blue" data-location="Bermuda" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDb5XNlayiudINaosntKG5OY0k8QgChFRTZ37i_dpz7pnFB2sH0cP1PFx7Xw6xh2KEx_B6h_LpaaE2umouxckuLSTZ4WQv6BpZhEAwyFumzQ2-1NSlGk_QxjozniT5ZIXFxmBPB8E0awTw0_Pold3rfy3gtj_1Wbww8gIaD77wNQ_Y03KSdcWloar4eVVmQTt5gG_tWu4fyQm7WOmeUFdP4uyrgL9zbRGcx0ph3EWPG4pClOolgfAlFy94Ze5pu0mXN0zPFlRVaQZkp" />
                <MapGradient />
                <MapTag>
                  <MapPulse />
                  <MapTagText>ACTIVE REGION: BM</MapTagText>
                </MapTag>
              </MapFrame>
            </CardOutline>
          </RightCol>
        </Grid>

        <FooterBar>
          <BackLink>
            <span className="material-symbols-outlined">arrow_back</span>
            Previous: Institutional Role
          </BackLink>
          <FooterActions>
            <GhostButton variant="ghost">Skip for now</GhostButton>
            <PrimaryAction variant="primary">Complete Strategy &amp; Verification</PrimaryAction>
          </FooterActions>
        </FooterBar>
      </Inner>
    </Main>
  );
};

export default InstitutionalAllocationStrategy;
