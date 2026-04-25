import React from "react";
import styled from "styled-components";

const Page = styled.main`
  display: flex;
  min-height: 100vh;
  background: #0b1326;
  color: #dae2fd;
  font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
`;

const SideNav = styled.aside`
  width: 288px;
  background: #131b2e;
  padding: 32px;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SideTitle = styled.div`
  color: #adc6ff;
  font-family: Manrope, sans-serif;
  font-weight: 800;
`;

const NavItem = styled.div<{ active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-left: ${(p) => (p.active ? "4px solid #4b8eff" : "4px solid transparent")};
  background: ${(p) => (p.active ? "#222a3d" : "transparent")};
  color: ${(p) => (p.active ? "#adc6ff" : "#c1c6d7")};
  cursor: pointer;
`;

const Content = styled.section`
  margin-left: 288px;
  width: calc(100% - 288px);
`;

const TopBar = styled.header`
  background: #0b1326;
  padding: 16px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Container = styled.div`
  padding: 32px;
  max-width: 1120px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-family: Manrope, sans-serif;
  font-weight: 800;
  font-size: 32px;
  color: #dae2fd;
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  color: #c1c6d7;
  max-width: 720px;
  margin: 0 0 24px 0;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 1024px) {
    grid-template-columns: 7fr 5fr;
  }
`;

const Card = styled.div<{ high?: boolean }>`
  background: ${(p) => (p.high ? "#2d3449" : "#171f33")};
  padding: 24px;
  border-radius: 12px;
  border-left: 2px solid transparent;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 12px;
  color: #8b90a0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
  font-family: 'JetBrains Mono', monospace;
`;

const Input = styled.input`
  background: transparent;
  border: 0;
  border-bottom: 1px solid #414755;
  padding: 8px 6px;
  color: #dae2fd;
  outline: none;
  font-size: 14px;
  &:focus { border-bottom-color: #4b8eff; }
`;

const DocRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #131b2e;
  border-radius: 8px;
`;

const NavList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
  color: #c1c6d7;
`;

const SaveButton = styled.button`
  width: 100%;
  padding: 12px;
  background: #171f33;
  color: #adc6ff;
  border-radius: 8px;
  border: 0;
  cursor: pointer;
`;

const TopBarInner = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`;

const Brand = styled.div`
  font-family: Manrope, sans-serif;
  font-weight: 800;
  color: #adc6ff;
`;

const TopRightButton = styled.button`
  padding: 8px 12px;
  background: #4b8eff;
  color: #fff;
  border-radius: 8px;
  border: 0;
  cursor: pointer;
`;

const IconBox = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DocList = styled.div`
  display: grid;
  gap: 12px;
`;

const DocLeft = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const DocRight = styled.div``;

const FooterPrev = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RightStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const CameraFrame = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  border-radius: 12px;
  background: #2d3449;
`;

const Small = styled.p`
  color: #c1c6d7;
  font-size: 12px;
  margin: 0;
`;

const FooterActions = styled.footer`
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(65, 71, 85, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PrimaryButton = styled.button`
  background: linear-gradient(135deg, #4b8eff, #adc6ff);
  color: #00285c;
  padding: 12px 28px;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
`;

export default function KYCVerification(): JSX.Element {
  return (
    <Page>
      <SideNav>
        <div>
          <SideTitle>Registration</SideTitle>
          <Small>Step 3 of 5: KYC Verification</Small>
        </div>

        <NavList>
          <NavItem>Account Type</NavItem>
          <NavItem>Business Details</NavItem>
          <NavItem active>KYC Verification</NavItem>
          <NavItem>Capital Profile</NavItem>
          <NavItem>Final Review</NavItem>
        </NavList>

        <div style={{ marginTop: 'auto' }}>
          <SaveButton>Save Progress</SaveButton>
        </div>
      </SideNav>

      <Content>
        <TopBar>
          <TopBarInner>
            <Brand>Sovereign Re</Brand>
          </TopBarInner>
          <div>
            <TopRightButton>Institutional Login</TopRightButton>
          </div>
        </TopBar>

        <Container>
          <Title>Identity Verification</Title>
          <Subtitle>
            To ensure the integrity of the Sovereign Re ecosystem and comply with global reinsurance regulations, please provide verified identification details.
          </Subtitle>

          <Grid>
            <div>
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <IconBox style={{ color: '#4b8eff' }}>🔖</IconBox>
                  <h3 style={{ margin: 0, fontFamily: 'Manrope', fontWeight: 800 }}>Personal Identity</h3>
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Label>Legal Full Name</Label>
                    <Input placeholder="As it appears on your passport" />
                  </div>
                  <FieldRow>
                    <div>
                      <Label>Date of Birth</Label>
                      <Input placeholder="YYYY-MM-DD" />
                    </div>
                    <div>
                      <Label>Tax ID / SSN</Label>
                      <Input placeholder="••••-••-••••" type="password" />
                    </div>
                  </FieldRow>
                </div>
              </Card>

              <Card style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <IconBox style={{ color: '#4b8eff' }}>📤</IconBox>
                  <h3 style={{ margin: 0, fontFamily: 'Manrope', fontWeight: 800 }}>Verification Documents</h3>
                </div>

                <DocList>
                  <DocRow>
                    <DocLeft>
                      <IconBox style={{ background: 'rgba(75,142,255,0.08)' }}>🛂</IconBox>
                      <div>
                        <div style={{ fontWeight: 700 }}>Government Issued Passport</div>
                        <Small>PDF, PNG, JPG (MAX 10MB)</Small>
                      </div>
                    </DocLeft>
                    <DocRight>➕</DocRight>
                  </DocRow>

                  <DocRow>
                    <DocLeft>
                      <IconBox style={{ background: 'rgba(78,222,163,0.08)' }}>🏠</IconBox>
                      <div>
                        <div style={{ fontWeight: 700 }}>Proof of Residence</div>
                        <Small>UTILITY BILL OR BANK STATEMENT</Small>
                      </div>
                    </DocLeft>
                    <DocRight style={{ color: '#4edea3' }}>✔</DocRight>
                  </DocRow>
                </DocList>
              </Card>
            </div>

            <RightStack>
              <Card high>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontFamily: 'Manrope', fontWeight: 800 }}>Liveness Detection</h3>
                  <div style={{ background: '#00a572', color: '#002113', padding: '4px 8px', borderRadius: 6, fontWeight: 800, fontSize: 11 }}>Live Scan</div>
                </div>

                <CameraFrame>
                  <div style={{ width: 220, height: 220, borderRadius: '50%', border: '4px dashed #414755', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <div style={{ fontSize: 48, opacity: 0.9 }}>🙂</div>
                    <Small style={{ textAlign: 'center', padding: '0 16px' }}>Center your face in the frame and ensure adequate lighting</Small>
                  </div>
                  <button style={{ padding: '8px 16px', background: '#4b8eff', color: '#001a41', borderRadius: 999, border: 0, fontWeight: 800 }}>Start Camera</button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
                    <div style={{ background: '#171f33', padding: 12, borderRadius: 8 }}>
                      <Small>STATUS</Small>
                      <div style={{ fontWeight: 700 }}>Awaiting Input</div>
                    </div>
                    <div style={{ background: '#171f33', padding: 12, borderRadius: 8 }}>
                      <Small>LATENCY</Small>
                      <div style={{ fontFamily: 'JetBrains Mono', color: '#4edea3', fontWeight: 700 }}>24ms</div>
                    </div>
                  </div>
                </CameraFrame>
              </Card>

              <Card style={{ padding: 20 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ color: '#4b8eff' }}>🔐</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>Military-Grade Security</div>
                    <Small>All identity data is encrypted via AES-256 and stored in disconnected cold-vault environments.</Small>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 16, opacity: 0.6, justifyContent: 'space-between' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 40, border: '1px solid #8b90a0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>GDPR</div>
                    <Small style={{ marginTop: 6, display: 'block' }}>Compliant</Small>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 40, border: '1px solid #8b90a0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>SOC2</div>
                    <Small style={{ marginTop: 6, display: 'block' }}>Certified</Small>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 40, border: '1px solid #8b90a0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>ISO</div>
                    <Small style={{ marginTop: 6, display: 'block' }}>27001</Small>
                  </div>
                </div>
              </Card>
            </RightStack>
          </Grid>

          <FooterActions>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div>←</div>
              <Small style={{ color: '#c1c6d7' }}>Previous Step</Small>
            </div>
            <PrimaryButton>Proceed to Capital Profiling →</PrimaryButton>
          </FooterActions>
        </Container>
      </Content>
    </Page>
  );
}
