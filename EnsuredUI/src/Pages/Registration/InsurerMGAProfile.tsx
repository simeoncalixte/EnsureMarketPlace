import React from "react";
import styled from "styled-components";
import { colors, withAlpha } from "../../xds/colors";
import { spacing, radii, typography } from "../../xds/tokens";
import { Button } from "../../xds/components/Button";
import StatCard from "../../xds/components/StatCard";
import InfoCard from "../../xds/components/InfoCard";
import FormField from "../../xds/components/FormField";
import FileDropzone from "../../xds/components/FileDropzone";

const Page = styled.div`
  background: ${colors.surface};
  color: ${colors.onSurface};
  min-height: 100vh;
  font-family: ${typography.fontFamily};
`;

const Header = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: ${colors.surface};
`;

const HeaderInner = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: ${spacing.md}px ${spacing.lg}px;
  max-width: 1440px;
  margin: 0 auto;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${spacing.lg}px;
`;

const Brand = styled.span`
  font-size: ${typography.sizes.lg}px;
  font-weight: 800;
  color: ${colors.text.accent};
  font-family: Manrope, sans-serif;
`;

const TopDivider = styled.div`
  background: ${colors.outlineVariant};
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
  background: ${colors.surfaceContainer};
  padding: ${spacing.lg}px 0;
  display: flex;
  flex-direction: column;
`;

const SideInner = styled.div`
  padding: 0 ${spacing.lg}px;
  margin-bottom: ${spacing.lg}px;
`;

const SideTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
`;

const SideIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: ${radii.md}px;
  background: ${withAlpha(colors.primary, 0.08)};
  display: flex;
  align-items: center;
  justify-content: center;

  & .material-symbols-outlined {
    color: ${colors.primary};
    font-variation-settings: 'FILL' 1;
  }
`;

const SideLabel = styled.span`
  color: ${colors.text.accent};
  font-weight: 800;
`;

const SideSub = styled.p`
  color: ${colors.onSurfaceVariant};
  font-size: ${typography.sizes.xs}px;
  margin: 0;
`;

const SideNav = styled.nav`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${spacing.xs}px;
`;

const NavItem = styled.div<{ active?: boolean }>`
  color: ${(p) => (p.active ? colors.text.accent : colors.onSurfaceVariant)};
  background: ${(p) => (p.active ? colors.surfaceContainerHigh : "transparent")};
  border-left: 4px solid ${(p) => (p.active ? colors.primary : "transparent")};
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px ${spacing.lg}px;
`;

const SaveWrapper = styled.div`
  padding: 0 ${spacing.lg}px;
  margin-top: auto;

  & > button {
    width: 100%;
  }
`;

const Main = styled.main`
  margin-left: 288px;
  padding: ${spacing.xl + 8}px;
  flex: 1;
  background: ${colors.surface};
  width: calc(100% - 288px);
`;

const Container = styled.div`
  max-width: 960px;
  margin: 0 auto;
`;

const HeadSection = styled.section`
  margin-bottom: ${spacing.lg}px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
`;

const Heading = styled.h1`
  font-size: ${typography.sizes.xl}px;
  margin: 0 0 6px 0;
  font-family: Manrope, sans-serif;
  font-weight: 800;
`;

const SubText = styled.p`
  color: ${colors.onSurfaceVariant};
  max-width: 480px;
`;

const StatRow = styled.div`
  display: flex;
  gap: 12px;
`;

const StatTile = styled.div<{ $tone?: "primary" | "secondary" }>`
  background: ${colors.surfaceContainer};
  padding: 12px;
  border-radius: ${radii.lg}px;
  border-left: 4px solid
    ${(p) => (p.$tone === "secondary" ? colors.primary : colors.secondary)};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${spacing.lg}px;
  @media (min-width: 1024px) {
    grid-template-columns: 7fr 5fr;
  }
`;

const Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing.lg}px;
`;

const Right = styled.div``;

const FieldBlock = styled.div``;

const FieldHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${spacing.sm}px;
`;

const FieldLabel = styled.label`
  font-size: ${typography.sizes.xs}px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${colors.onSurfaceVariant};
`;

const FieldHint = styled.div`
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.primary};
`;

const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing.sm}px;
`;

const TagButton = styled.button<{ $selected?: boolean }>`
  padding: 6px 12px;
  border-radius: ${radii.round}px;
  border: 1px solid
    ${(p) => (p.$selected ? colors.primary : colors.outlineVariant)};
  background: ${(p) => (p.$selected ? withAlpha(colors.primary, 0.08) : "transparent")};
  color: ${(p) => (p.$selected ? colors.primary : colors.onSurfaceVariant)};
  font-size: ${typography.sizes.xs}px;
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
  cursor: pointer;

  & .material-symbols-outlined {
    font-size: 12px;
  }
`;

const CurrencyField = styled.div`
  position: relative;

  & input {
    padding-left: 22px;
    padding-right: 110px;
    font-family: 'JetBrains Mono', monospace;
    font-size: ${typography.sizes.lg}px;
  }
`;

const CurrencyPrefix = styled.span`
  position: absolute;
  left: 0;
  bottom: 12px;
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.primary};
  pointer-events: none;
`;

const CurrencySuffix = styled.span`
  position: absolute;
  right: 0;
  bottom: 12px;
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.onSurfaceVariant};
  font-size: 11px;
  pointer-events: none;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 12px;

  & > button:first-child {
    flex: 1;
  }
`;

const StickyColumn = styled.div`
  position: sticky;
  top: 96px;
  display: flex;
  flex-direction: column;
  gap: ${spacing.md}px;
`;

const FeedCard = styled.div`
  position: relative;
  border-radius: ${radii.lg}px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  background: ${colors.surfaceContainerHigh};
`;

const FeedImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.6;
`;

const FeedScrim = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, ${colors.surface}, transparent);
`;

const FeedCaption = styled.div`
  position: absolute;
  bottom: ${spacing.md}px;
  left: ${spacing.md}px;
  right: ${spacing.md}px;
  color: ${colors.onSurface};
`;

const FeedEyebrow = styled.div`
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.primary};
  text-transform: uppercase;
  margin-bottom: 6px;
`;

const FeedBody = styled.div`
  font-size: ${typography.sizes.sm}px;
`;

const ComplianceCard = styled.div`
  background: ${colors.surfaceContainer};
  padding: ${spacing.md}px;
  border-radius: ${radii.lg}px;
`;

const ComplianceTitle = styled.h3`
  font-size: ${typography.sizes.xs}px;
  color: ${colors.primary};
  text-transform: uppercase;
  margin: 0;
`;

const ComplianceList = styled.ul`
  margin-top: 12px;
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ComplianceItem = styled.li`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`;

const ComplianceIcon = styled.span<{ $tone: "success" | "pending" }>`
  color: ${(p) => (p.$tone === "success" ? colors.secondary : colors.primary)};
  font-variation-settings: ${(p) =>
    p.$tone === "success" ? "'FILL' 1" : "normal"};
`;

const ComplianceItemTitle = styled.div`
  font-size: ${typography.sizes.xs}px;
  font-weight: 700;
`;

const ComplianceItemMeta = styled.div<{ $italic?: boolean }>`
  font-size: 11px;
  color: ${colors.onSurfaceVariant};
  font-style: ${(p) => (p.$italic ? "italic" : "normal")};
`;

const MobileNav = styled.nav`
  display: none;
  @media (max-width: 768px) {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: ${colors.surfaceContainerHigh};
    justify-content: space-around;
    padding: 12px 0;
    z-index: 50;
  }
`;

const InsurerMGAProfile: React.FC = () => {
  return (
    <Page>
      <Header>
        <HeaderInner>
          <HeaderLeft>
            <Brand>Sovereign Re</Brand>
          </HeaderLeft>
          <Button variant="secondary" size="sm">Institutional Login</Button>
        </HeaderInner>
        <TopDivider />
      </Header>

      <Layout>
        <Aside>
          <SideInner>
            <SideTitle>
              <SideIcon>
                <span className="material-symbols-outlined">domain</span>
              </SideIcon>
              <SideLabel>Registration</SideLabel>
            </SideTitle>
            <SideSub>Step 3 of 5: Insurer Profile</SideSub>
          </SideInner>

          <SideNav>
            <NavItem> <span className="material-symbols-outlined">account_balance</span> Account Type</NavItem>
            <NavItem> <span className="material-symbols-outlined">domain</span> Business Details</NavItem>
            <NavItem active> <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span> KYC Verification</NavItem>
            <NavItem> <span className="material-symbols-outlined">monitoring</span> Capital Profile</NavItem>
            <NavItem> <span className="material-symbols-outlined">fact_check</span> Final Review</NavItem>
          </SideNav>

          <SaveWrapper>
            <Button variant="secondary">Save Progress</Button>
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
                <StatTile>
                  <StatCard label="Application Health" value="94%" tone="success" />
                </StatTile>
                <StatTile $tone="secondary">
                  <StatCard label="Tier Status" value="Institutional B+" tone="info" />
                </StatTile>
              </StatRow>
            </HeadSection>

            <Grid>
              <Left>
                <FieldBlock>
                  <FieldHead>
                    <FieldLabel>Risk Jurisdictions</FieldLabel>
                    <FieldHint>Primary Underwriting Seats</FieldHint>
                  </FieldHead>
                  <TagList>
                    <TagButton $selected type="button">United Kingdom <span className="material-symbols-outlined">close</span></TagButton>
                    <TagButton $selected type="button">United States <span className="material-symbols-outlined">close</span></TagButton>
                    <TagButton $selected type="button">Bermuda <span className="material-symbols-outlined">close</span></TagButton>
                    <TagButton type="button">Singapore <span className="material-symbols-outlined">add</span></TagButton>
                    <TagButton type="button">EU (Passport) <span className="material-symbols-outlined">add</span></TagButton>
                    <TagButton type="button">Cayman Islands <span className="material-symbols-outlined">add</span></TagButton>
                  </TagList>
                </FieldBlock>

                <FieldBlock>
                  <FieldHead>
                    <FieldLabel>Regulatory License</FieldLabel>
                  </FieldHead>
                  <FileDropzone
                    title="Drop license certificate here"
                    helperText="PDF, PNG or JPG (Max 25MB)"
                    accept="application/pdf,image/png,image/jpeg"
                  />
                </FieldBlock>

                <FieldBlock>
                  <CurrencyField>
                    <FormField label="Annual Underwriting Limit" defaultValue="500,000,000" />
                    <CurrencyPrefix>$</CurrencyPrefix>
                    <CurrencySuffix>USD Equivalent</CurrencySuffix>
                  </CurrencyField>
                </FieldBlock>

                <ActionRow>
                  <Button variant="primary">Continue to Capital Profile</Button>
                  <Button variant="secondary">Back</Button>
                </ActionRow>
              </Left>

              <Right>
                <StickyColumn>
                  <FeedCard>
                    <FeedImage src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0gMqT7eN_PtR_32_iQYQbA7aerJXAhauHqe95kfS7IOyzW5vlJeHVUjtS35Bp4EE6ZwYfVmLs7Ern7qddDY2Zs5TbQIKxXNRToSCYYLqM95jye9YBhlJ1jsvxPD6v0hR6_zQvJB_TYzSnC_-H-LiIt8YW1dnXnqpyUmbBwDWFVQGjc3kdpQNcgDBU5sE0bd8nOLRqK4ZDyMEj8WMHWZjleaInh6oxqEs7iBiyGc0ilHpvZ6sVsKuCDmNs8ibuzebKoQEdLxKbYAV7" alt="skyscraper" />
                    <FeedScrim />
                    <FeedCaption>
                      <FeedEyebrow>Intelligence Feed</FeedEyebrow>
                      <FeedBody>Global reinsurance capacity for Insurer entities currently sits at $42.8B across primary hubs.</FeedBody>
                    </FeedCaption>
                  </FeedCard>

                  <ComplianceCard>
                    <ComplianceTitle>Compliance Verification</ComplianceTitle>
                    <ComplianceList>
                      <ComplianceItem>
                        <ComplianceIcon $tone="success" className="material-symbols-outlined">check_circle</ComplianceIcon>
                        <div>
                          <ComplianceItemTitle>LEI Identifier Authenticated</ComplianceItemTitle>
                          <ComplianceItemMeta>ID: 549300V6Y6XF0C5N8M41</ComplianceItemMeta>
                        </div>
                      </ComplianceItem>
                      <ComplianceItem>
                        <ComplianceIcon $tone="success" className="material-symbols-outlined">check_circle</ComplianceIcon>
                        <div>
                          <ComplianceItemTitle>Officer Background Check</ComplianceItemTitle>
                          <ComplianceItemMeta>Cleared by GlobalRef 12/2023</ComplianceItemMeta>
                        </div>
                      </ComplianceItem>
                      <ComplianceItem>
                        <ComplianceIcon $tone="pending" className="material-symbols-outlined">hourglass_empty</ComplianceIcon>
                        <div>
                          <ComplianceItemTitle>Capital Adequacy Ratio</ComplianceItemTitle>
                          <ComplianceItemMeta $italic>Pending license upload</ComplianceItemMeta>
                        </div>
                      </ComplianceItem>
                    </ComplianceList>
                  </ComplianceCard>

                  <InfoCard tone="info" icon="info" title="Protocol Note">
                    Providing accurate jurisdictional data ensures your capital tranches are matched with appropriate risk providers in our Bermuda-domiciled sidecar structure.
                  </InfoCard>
                </StickyColumn>
              </Right>
            </Grid>
          </Container>
        </Main>
      </Layout>

      <MobileNav>
        <span className="material-symbols-outlined">home</span>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
        <span className="material-symbols-outlined">analytics</span>
        <span className="material-symbols-outlined">person</span>
      </MobileNav>
    </Page>
  );
};

export default InsurerMGAProfile;
