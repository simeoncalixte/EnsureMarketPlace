import React from "react";
import styled from "styled-components";
import Checkbox from '../../xds/components/Checkbox'

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
  color: rgba(193,198,215,0.9); /* text-on-surface-variant */
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

const ProgressBar = styled.div`
  height: 0.375rem; /* 1.5 */
  border-radius: 9999px;
  background: ${props => props.theme?.primary || "#adc6ff"};
` as any;

const SubtleProgressBar = styled(ProgressBar)`
  background: rgba(23,31,51,1); /* surface-container-high */
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

const Card = styled.section`
  background: #171f33; /* surface-container */
  padding: 2rem; /* p-8 */
  border-radius: 1rem; /* rounded-xl */
  position: relative;
  overflow: hidden;
`;

const CardLow = styled(Card)`
  background: #131b2e; /* surface-container-low */
`;

const CardHigh = styled(Card)`
  background: #222a3d; /* surface-container-high */
`;

const CardOutline = styled(Card)`
  border: 1px solid rgba(65,71,85,0.15); /* border-outline-variant/15 */
`;

const H3 = styled.h3`
  font-family: Manrope, sans-serif;
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const GridTwo = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(139,144,160,1); /* outline */
  margin-bottom: 0.5rem;
`;

const TextInput = styled.input`
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid #414755; /* border-outline-variant */
  padding: 0.5rem 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  color: inherit;
  outline: none;

  &::placeholder { opacity: 0.3; }
`;

const Select = styled.select`
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid #414755;
  padding: 0.5rem 0;
  font-size: 0.875rem;
  color: inherit;
  outline: none;
`;

const ButtonSmall = styled.button`
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #414755;
  text-align: left;
  font-size: 0.875rem;
  background: transparent;
  cursor: pointer;
`;

const PrimaryButtonSmall = styled(ButtonSmall)`
  border-color: #adc6ff; /* primary */
  background: rgba(75,142,255,0.06); /* primary-container/10 */
  color: #adc6ff;
  font-weight: 700;
`;

const MandateCard = styled.div`
  padding: 1rem;
  border-radius: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const RightSmallCard = styled(Card)`
  border: 1px solid rgba(65,71,85,0.1);
`;

const FooterBar = styled.footer`
  margin-top: 3rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(65,71,85,0.2);
  padding-top: 2rem;
`;

const GhostButton = styled.button`
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid #414755;
  background: transparent;
  color: inherit;
`;

const PrimaryAction = styled.button`
  padding: 0.75rem 2.5rem;
  border-radius: 0.5rem;
  background: #adc6ff;
  color: #002e69; /* on-primary */
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
          <ProgressBar />
          <ProgressBar />
          <ProgressBar style={{ boxShadow: '0 0 10px rgba(173,198,255,0.4)' }} />
          <SubtleProgressBar />
        </ProgressGrid>

        <Grid>
          <LeftCol>
            <CardLow>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: 'transparent' }} />
              <H3>
                <span className="material-symbols-outlined text-primary">gavel</span>
                Entity Information
              </H3>
              <GridTwo>
                <div>
                  <Label>Legal Entity Identifier (LEI)</Label>
                  <TextInput placeholder="549300..." type="text" />
                </div>
                <div>
                  <Label>Tax Jurisdiction</Label>
                  <Select>
                    <option value="bermuda">Bermuda (Class 4)</option>
                    <option value="usa">United States</option>
                    <option value="uk">United Kingdom (Lloyd's)</option>
                    <option value="cayman">Cayman Islands</option>
                  </Select>
                </div>
              </GridTwo>
              <div style={{ marginTop: '2rem' }}>
                <Label>Primary Capital Source</Label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <ButtonSmall>Pension Fund</ButtonSmall>
                  <PrimaryButtonSmall>Sovereign Wealth</PrimaryButtonSmall>
                  <ButtonSmall>ILS Fund</ButtonSmall>
                </div>
              </div>
            </CardLow>

            <CardOutline>
              <H3>
                <span className="material-symbols-outlined text-secondary">assignment_turned_in</span>
                Investment Mandate
              </H3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <MandateCard style={{ background: '#131b2e', borderLeft: '4px solid #4edea3' }}>
                  <div>
                    <p style={{ fontWeight: 700, color: '#dae2fd' }}>Yield Seeker</p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(218,226,253,0.8)' }}>Targeting high-risk layers with 12-18% IRR expectations.</p>
                  </div>
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>radio_button_checked</span>
                </MandateCard>
                <MandateCard style={{ border: '1px solid rgba(65,71,85,0.3)', background: 'transparent' }}>
                  <div>
                    <p style={{ fontWeight: 700, color: 'rgba(218,226,253,0.7)' }}>Diversified Exposure</p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(218,226,253,0.4)' }}>Balanced risk profile across peak and non-peak zones.</p>
                  </div>
                  <span className="material-symbols-outlined text-outline">radio_button_unchecked</span>
                </MandateCard>
                <MandateCard style={{ border: '1px solid rgba(65,71,85,0.3)', background: 'transparent' }}>
                  <div>
                    <p style={{ fontWeight: 700, color: 'rgba(218,226,253,0.7)' }}>Conservative Protection</p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(218,226,253,0.4)' }}>Senior layers with capital preservation priority.</p>
                  </div>
                  <span className="material-symbols-outlined text-outline">radio_button_unchecked</span>
                </MandateCard>
              </div>
            </CardOutline>
          </LeftCol>

          <RightCol>
            <CardLow style={{ border: '1px solid rgba(65,71,85,0.1)' }}>
              <H3>
                <span className="material-symbols-outlined text-tertiary">category</span>
                Asset Class Preference
              </H3>
              <p style={{ fontSize: '0.75rem', color: 'rgba(193,198,215,0.9)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'JetBrains Mono', monospace" }}>
                Select multiple perils for the portfolio:
              </p>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#171f33', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span className="material-symbols-outlined text-primary">cyclone</span>
                    <span style={{ fontWeight: 500 }}>Wind (Hurricanes/Typhoons)</span>
                  </div>
                  <Checkbox defaultChecked />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#171f33', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span className="material-symbols-outlined text-tertiary">volcano</span>
                    <span style={{ fontWeight: 500 }}>Quake (Seismic Activity)</span>
                  </div>
                  <Checkbox defaultChecked />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#171f33', borderRadius: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span className="material-symbols-outlined text-secondary">water_drop</span>
                    <span style={{ fontWeight: 500 }}>Flood (Pluvial/Fluvial)</span>
                  </div>
                  <Checkbox />
                </label>
              </div>
            </CardLow>

            <CardHigh>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.625rem', fontFamily: "'JetBrains Mono', monospace", color: '#adc6ff', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Risk Exposure Estimate</p>
                  <h4 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '2rem', fontWeight: 700 }}>7.42<span style={{ fontSize: '1rem', opacity: 0.5, marginLeft: '0.25rem' }}>%</span></h4>
                </div>
                <span className="material-symbols-outlined" style={{ opacity: 0.4 }}>query_stats</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.25rem', height: '6rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1, background: 'rgba(75,142,255,0.12)', height: '50%' }} />
                <div style={{ flex: 1, background: 'rgba(75,142,255,0.24)', height: '66%' }} />
                <div style={{ flex: 1, background: 'rgba(75,142,255,0.36)', height: '83%', boxShadow: '0 0 10px #adc6ff33' }} />
                <div style={{ flex: 1, background: 'rgba(75,142,255,0.48)', height: '100%', boxShadow: '0 0 15px #adc6ff66' }} />
                <div style={{ flex: 1, background: 'rgba(78,222,163,0.4)', height: '58%' }} />
                <div style={{ flex: 1, background: 'rgba(255,179,173,0.3)', height: '41%' }} />
              </div>
              <p style={{ fontSize: '0.625rem', color: 'rgba(193,198,215,0.9)' }}>
                Projected return profile based on selected perils and Bermuda tax jurisdiction logic. Subject to dynamic pricing fluctuations.
              </p>
            </CardHigh>

            <CardOutline>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>public</span>
                <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(139,144,160,1)' }}>Primary Allocation Zone</span>
              </div>
              <div style={{ width: '100%', height: '8rem', borderRadius: '0.5rem', background: '#060e20', position: 'relative', overflow: 'hidden' }}>
                <img alt="stylized geographic map showing island of bermuda with data overlay points in electric blue" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6, filter: 'grayscale(1)', transition: 'filter 200ms' }} data-location="Bermuda" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDb5XNlayiudINaosntKG5OY0k8QgChFRTZ37i_dpz7pnFB2sH0cP1PFx7Xw6xh2KEx_B6h_LpaaE2umouxckuLSTZ4WQv6BpZhEAwyFumzQ2-1NSlGk_QxjozniT5ZIXFxmBPB8E0awTw0_Pold3rfy3gtj_1Wbww8gIaD77wNQ_Y03KSdcWloar4eVVmQTt5gG_tWu4fyQm7WOmeUFdP4uyrgL9zbRGcx0ph3EWPG4pClOolgfAlFy94Ze5pu0mXN0zPFlRVaQZkp" />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(23,27,46,1), transparent)' }} />
                <div style={{ position: 'absolute', bottom: '0.75rem', left: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 9999, background: '#4edea3', animation: 'pulse 2s infinite' }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.75rem' }}>ACTIVE REGION: BM</span>
                </div>
              </div>
            </CardOutline>
          </RightCol>
        </Grid>

        <FooterBar>
          <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: 'rgba(218,226,253,0.7)' }}>
            <span className="material-symbols-outlined">arrow_back</span>
            Previous: Institutional Role
          </button>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <GhostButton>Skip for now</GhostButton>
            <PrimaryAction>Complete Strategy &amp; Verification</PrimaryAction>
          </div>
        </FooterBar>
      </Inner>
    </Main>
  );
};

export default InstitutionalAllocationStrategy;
