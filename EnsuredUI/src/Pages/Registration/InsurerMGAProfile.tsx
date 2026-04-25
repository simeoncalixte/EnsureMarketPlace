import React from "react";
import styled from "styled-components";

const Page = styled.div`
  background: #0b1326;
  color: #dae2fd;
  min-height: 100vh;
  font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
`;

const Header = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: #0b1326;
`;

const HeaderInner = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 16px 32px;
  max-width: 1440px;
  margin: 0 auto;
`;

const Brand = styled.span`
  font-size: 20px;
  font-weight: 800;
  color: #adc6ff;
  font-family: Manrope, sans-serif;
`;

const HeaderButton = styled.button`
  padding: 6px 14px;
  border-radius: 8px;
  background: #222a3d;
  color: #adc6ff;
  border: 0;
  cursor: pointer;
`;

const TopDivider = styled.div`
  background: #131b2e;
  height: 1px;
  width: 100%;
`;

const Layout = styled.div`
  display: flex;
  padding-top: 73px;
`;

const Aside = styled.aside`
  position: fixed;
  left: 0;
  top: 73px;
  height: calc(100vh - 73px);
  width: 288px;
  background: #131b2e;
  padding: 32px 0;
  display: flex;
  flex-direction: column;
`;

const SideInner = styled.div`
  padding: 0 32px;
  margin-bottom: 24px;
`;

const SideTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
`;

const SideLabel = styled.span`
  color: #adc6ff;
  font-weight: 800;
`;

const SideSub = styled.p`
  color: #c1c6d7;
  font-size: 12px;
  margin: 0;
`;

const SideNav = styled.nav`
  flex: 1;
  padding: 0 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const NavItem = styled.div<{ active?: boolean }>`
  color: ${(p) => (p.active ? '#adc6ff' : '#c1c6d7')};
  background: ${(p) => (p.active ? '#222a3d' : 'transparent')};
  border-left: ${(p) => (p.active ? '4px solid #4b8eff' : '4px solid transparent')};
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
`;

const SaveWrapper = styled.div`
  padding: 0 24px;
  margin-top: auto;
`;

const SaveButton = styled.button`
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  background: #2d3449;
  color: #dae2fd;
  border: 0;
  cursor: pointer;
`;

const Main = styled.main`
  margin-left: 288px;
  padding: 48px;
  flex: 1;
  background: #0b1326;
  width: calc(100% - 288px);
`;

const Container = styled.div`
  max-width: 960px;
  margin: 0 auto;
`;

const HeadSection = styled.section`
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
`;

const Heading = styled.h1`
  font-size: 28px;
  margin: 0 0 6px 0;
  font-family: Manrope, sans-serif;
  font-weight: 800;
`;

const SubText = styled.p`
  color: #c1c6d7;
  max-width: 480px;
`;

const StatRow = styled.div`
  display: flex;
  gap: 12px;
`;

const StatCard = styled.div<{ variant?: 'primary' | 'secondary' }>`
  background: #131b2e;
  padding: 12px;
  border-radius: 12px;
  border-left: 4px solid ${(p) => (p.variant === 'secondary' ? '#4b8eff' : '#00a572')};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  @media(min-width: 1024px){
    grid-template-columns: 7fr 5fr;
  }
`;

const Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Right = styled.div``;

const TagList = styled.div`
  display:flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const TagButton = styled.button`
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid #4b8eff;
  background: rgba(75,142,255,0.08);
  color: #4b8eff;
  font-size: 12px;
  display:flex;
  align-items:center;
  gap:8px;
`;

const UploadBox = styled.div`
  width: 100%;
  height: 192px;
  border: 2px dashed #414755;
  border-radius: 12px;
  display:flex;
  align-items:center;
  justify-content:center;
  background: #131b2e;
`;

const MoneyInputWrapper = styled.div`
  position: relative;
`;

const MoneyInput = styled.input`
  width: 100%;
  background: #131b2e;
  border: 0;
  border-bottom: 2px solid #414755;
  padding: 18px 16px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  color: #dae2fd;
`;

const ActionRow = styled.div`
  display:flex;
  gap:12px;
  margin-top:12px;
`;

const Primary = styled.button`
  flex:1;
  padding:14px;
  background: linear-gradient(135deg,#4b8eff,#adc6ff);
  color:#00285c;
  border-radius:12px;
  border:0;
  font-weight:800;
  cursor:pointer;
`;

const Secondary = styled.button`
  padding:12px 18px;
  background:#2d3449;
  color:#c1c6d7;
  border-radius:12px;
  border:0;
  cursor:pointer;
`;

const StickyColumn = styled.div`
  position: sticky;
  top: 96px;
  display:flex;
  flex-direction: column;
  gap:16px;
`;

const InfoCard = styled.div`
  background:#131b2e;
  padding:16px;
  border-radius:12px;
`;

const MobileNav = styled.nav`
  display:none;
  @media(max-width: 768px){
    display:flex;
    position: fixed;
    bottom:0;
    left:0;
    right:0;
    background:#171f33;
    justify-content: space-around;
    padding:12px 0;
    z-index:50;
  }
`;

const InsurerMGAProfile: React.FC = () => {
  return (
    <Page>
      <Header>
        <HeaderInner>
          <div style={{display:'flex',alignItems:'center',gap:24}}>
            <Brand>Sovereign Re</Brand>
            <div style={{display:'none'}} />
          </div>
          <HeaderButton>Institutional Login</HeaderButton>
        </HeaderInner>
        <TopDivider />
      </Header>

      <Layout>
        <Aside>
          <SideInner>
            <SideTitle>
              <div style={{width:32,height:32,borderRadius:8,background:'rgba(75,142,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span className="material-symbols-outlined" style={{color:'#4b8eff',fontVariationSettings: "'FILL' 1"}}>domain</span>
              </div>
              <SideLabel>Registration</SideLabel>
            </SideTitle>
            <SideSub>Step 3 of 5: Insurer Profile</SideSub>
          </SideInner>

          <SideNav>
            <NavItem> <span className="material-symbols-outlined">account_balance</span> Account Type</NavItem>
            <NavItem> <span className="material-symbols-outlined">domain</span> Business Details</NavItem>
            <NavItem active> <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>verified_user</span> KYC Verification</NavItem>
            <NavItem> <span className="material-symbols-outlined">monitoring</span> Capital Profile</NavItem>
            <NavItem> <span className="material-symbols-outlined">fact_check</span> Final Review</NavItem>
          </SideNav>

          <SaveWrapper>
            <SaveButton>Save Progress</SaveButton>
          </SaveWrapper>
        </Aside>

        <Main>
          <Container>
            <HeadSection>
              <div>
                <Heading>Insurer / MGA Profile</Heading>
                <SubText>Define your operational scope and regulatory standing to finalize the sovereign capital underwriting parameters.</SubText>
              </div>
              <StatRow>
                <StatCard>
                  <div style={{fontSize:10, textTransform:'uppercase', color:'#4b8eff', marginBottom:6}}>Application Health</div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{fontFamily:'JetBrains Mono', fontSize:20, color:'#4edea3', fontWeight:800}}>94%</div>
                    <span className="material-symbols-outlined" style={{color:'#4edea3', fontVariationSettings: "'FILL' 1"}}>bolt</span>
                  </div>
                </StatCard>
                <StatCard variant="secondary">
                  <div style={{fontSize:10, textTransform:'uppercase', color:'#4b8eff', marginBottom:6}}>Tier Status</div>
                  <div style={{fontFamily:'JetBrains Mono', fontSize:18, color:'#4b8eff', fontWeight:700}}>Institutional B+</div>
                </StatCard>
              </StatRow>
            </HeadSection>

            <Grid>
              <Left>
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <label style={{fontSize:12,fontWeight:800,letterSpacing:'0.08em',textTransform:'uppercase',color:'#c1c6d7'}}>Risk Jurisdictions</label>
                    <div style={{fontSize:11,fontFamily:'JetBrains Mono',color:'#4b8eff'}}>Primary Underwriting Seats</div>
                  </div>
                  <TagList>
                    <TagButton>United Kingdom <span className="material-symbols-outlined" style={{fontSize:12}}>close</span></TagButton>
                    <TagButton>United States <span className="material-symbols-outlined" style={{fontSize:12}}>close</span></TagButton>
                    <TagButton>Bermuda <span className="material-symbols-outlined" style={{fontSize:12}}>close</span></TagButton>
                    <TagButton style={{border:'1px solid #414755', color:'#c1c6d7', background:'transparent'}}>Singapore <span className="material-symbols-outlined" style={{fontSize:12}}>add</span></TagButton>
                    <TagButton style={{border:'1px solid #414755', color:'#c1c6d7', background:'transparent'}}>EU (Passport) <span className="material-symbols-outlined" style={{fontSize:12}}>add</span></TagButton>
                    <TagButton style={{border:'1px solid #414755', color:'#c1c6d7', background:'transparent'}}>Cayman Islands <span className="material-symbols-outlined" style={{fontSize:12}}>add</span></TagButton>
                  </TagList>
                </div>

                <div>
                  <div style={{marginBottom:8}}>
                    <label style={{fontSize:12,fontWeight:800,letterSpacing:'0.08em',textTransform:'uppercase',color:'#c1c6d7'}}>Regulatory License</label>
                  </div>
                  <div style={{position:'relative'}}>
                    <UploadBox>
                      <div style={{textAlign:'center'}}>
                        <span className="material-symbols-outlined" style={{fontSize:36,color:'#8b90a0',display:'block',marginBottom:8}}>cloud_upload</span>
                        <div style={{color:'#dae2fd'}}>Drop license certificate here</div>
                        <div style={{color:'#c1c6d7',fontSize:12,marginTop:6}}>PDF, PNG or JPG (Max 25MB)</div>
                      </div>
                    </UploadBox>
                    <input style={{position:'absolute',inset:0,opacity:0,cursor:'pointer'}} type="file" />
                  </div>
                </div>

                <div>
                  <label style={{fontSize:12,fontWeight:800,letterSpacing:'0.08em',textTransform:'uppercase',color:'#c1c6d7'}}>Annual Underwriting Limit</label>
                  <MoneyInputWrapper>
                    <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontFamily:'JetBrains Mono',color:'#4b8eff'}}>$</span>
                    <MoneyInput defaultValue="500,000,000" />
                    <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontFamily:'JetBrains Mono',color:'#c1c6d7',fontSize:11}}>USD Equivalent</span>
                  </MoneyInputWrapper>
                </div>

                <ActionRow>
                  <Primary>Continue to Capital Profile</Primary>
                  <Secondary>Back</Secondary>
                </ActionRow>
              </Left>

              <Right>
                <StickyColumn>
                  <div style={{borderRadius:12,overflow:'hidden',aspectRatio:'16/9',background:'#2d3449'}}>
                    <img style={{width:'100%',height:'100%',objectFit:'cover',opacity:0.6}} src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0gMqT7eN_PtR_32_iQYQbA7aerJXAhauHqe95kfS7IOyzW5vlJeHVUjtS35Bp4EE6ZwYfVmLs7Ern7qddDY2Zs5TbQIKxXNRToSCYYLqM95jye9YBhlJ1jsvxPD6v0hR6_zQvJB_TYzSnC_-H-LiIt8YW1dnXnqpyUmbBwDWFVQGjc3kdpQNcgDBU5sE0bd8nOLRqK4ZDyMEj8WMHWZjleaInh6oxqEs7iBiyGc0ilHpvZ6sVsKuCDmNs8ibuzebKoQEdLxKbYAV7" alt="skyscraper" />
                    <div style={{position:'absolute',inset:0,background:'linear-gradient(to top, #0b1326, transparent)'}} />
                    <div style={{position:'absolute',bottom:16,left:16,right:16,color:'#dae2fd'}}>
                      <div style={{fontSize:11,fontFamily:'JetBrains Mono',color:'#4b8eff',textTransform:'uppercase',marginBottom:6}}>Intelligence Feed</div>
                      <div style={{fontSize:14}}>Global reinsurance capacity for Insurer entities currently sits at $42.8B across primary hubs.</div>
                    </div>
                  </div>

                  <InfoCard>
                    <h3 style={{fontSize:12,color:'#4b8eff',textTransform:'uppercase',margin:0}}>Compliance Verification</h3>
                    <ul style={{marginTop:12,listStyle:'none',padding:0,display:'flex',flexDirection:'column',gap:12}}>
                      <li style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                        <span className="material-symbols-outlined" style={{color:'#4edea3',fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                        <div>
                          <div style={{fontSize:12,fontWeight:700}}>LEI Identifier Authenticated</div>
                          <div style={{fontSize:11,color:'#c1c6d7'}}>ID: 549300V6Y6XF0C5N8M41</div>
                        </div>
                      </li>
                      <li style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                        <span className="material-symbols-outlined" style={{color:'#4edea3',fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                        <div>
                          <div style={{fontSize:12,fontWeight:700}}>Officer Background Check</div>
                          <div style={{fontSize:11,color:'#c1c6d7'}}>Cleared by GlobalRef 12/2023</div>
                        </div>
                      </li>
                      <li style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                        <span className="material-symbols-outlined" style={{color:'#4b8eff'}}>hourglass_empty</span>
                        <div>
                          <div style={{fontSize:12,fontWeight:700}}>Capital Adequacy Ratio</div>
                          <div style={{fontSize:11,color:'#c1c6d7',fontStyle:'italic'}}>Pending license upload</div>
                        </div>
                      </li>
                    </ul>
                  </InfoCard>

                  <div style={{padding:16,borderRadius:12,background:'rgba(75,142,255,0.04)',border:'1px solid rgba(75,142,255,0.12)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                      <span className="material-symbols-outlined" style={{color:'#4b8eff'}}>info</span>
                      <div style={{fontSize:11,color:'#4b8eff',fontWeight:800,textTransform:'uppercase'}}>Protocol Note</div>
                    </div>
                    <div style={{fontSize:12,color:'#c1c6d7'}}>Providing accurate jurisdictional data ensures your capital tranches are matched with appropriate risk providers in our Bermuda-domiciled sidecar structure.</div>
                  </div>
                </StickyColumn>
              </Right>
            </Grid>
          </Container>
        </Main>
      </Layout>

      <MobileNav>
        <span className="material-symbols-outlined">home</span>
        <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>how_to_reg</span>
        <span className="material-symbols-outlined">analytics</span>
        <span className="material-symbols-outlined">person</span>
      </MobileNav>
    </Page>
  );
};

export default InsurerMGAProfile;
