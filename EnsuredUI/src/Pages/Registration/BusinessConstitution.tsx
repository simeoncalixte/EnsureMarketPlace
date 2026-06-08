import React from 'react'
import styled from 'styled-components'
import { Button } from '../../xds/components/Button'
import InfoCard from '../../xds/components/InfoCard'
import Select from '../../xds/components/Select'
import FormField from '../../xds/components/FormField'
import SectionHeader from '../../xds/components/SectionHeader'
import FileDropzone from '../../xds/components/FileDropzone'
import ProgressBar from '../../xds/components/ProgressBar'
import { PageTitle, PageSubtitle } from '../../xds/components/Typography'
import { colors } from '../../xds/colors'
import { spacing, radii, typography } from '../../xds/tokens'

const Main = styled.main`
  font-family: ${typography.fontFamily};
`

const PageHeader = styled.header`
  margin-bottom: ${spacing.xl - 8}px;
`

const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${spacing.lg}px;
`

const Column = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${spacing.lg - 4}px;
`

const Section = styled.section`
  position: relative;
  overflow: hidden;
  background: ${colors.surfaceContainerLow};
  padding: ${spacing.lg}px;
  border-radius: ${radii.lg + 4}px;
`

const SectionGlow = styled.div`
  position: absolute;
  top: -24px;
  right: -24px;
  width: 160px;
  height: 160px;
  background: ${colors.primary}20;
  border-radius: 50%;
  filter: blur(36px);
`

const Fields = styled.div`
  margin-top: 18px;
  display: grid;
  gap: 14px;
`

const FieldPair = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

const FieldLabel = styled.label`
  display: block;
  font-size: ${typography.sizes.xs - 1}px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 1.5px;
  color: ${colors.outlineVariant};
`

const HelperText = styled.p`
  margin-top: ${spacing.sm}px;
  color: ${colors.onSurfaceVariant};
  font-size: 13px;
`

const CurrencyField = styled.div`
  position: relative;

  & input {
    padding-left: 18px;
  }
`

const CurrencyPrefix = styled.span`
  position: absolute;
  left: 0;
  bottom: 9px;
  color: ${colors.primary};
  font-family: 'JetBrains Mono', monospace;
  pointer-events: none;
`

const NavRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${spacing.sm}px;
`

const Aside = styled.aside`
  display: grid;
  gap: ${spacing.md}px;
`

const StandardsCard = styled.div`
  background: ${colors.surfaceContainerLow};
  border-radius: ${radii.lg}px;
  overflow: hidden;
`

const StandardsImage = styled.div`
  height: 160px;
  background-size: cover;
  background-position: center;
  background-image: url('https://images.unsplash.com/photo-1507679799987-c73779587ccf');
`

const StandardsBody = styled.div`
  padding: 12px;
`

const StandardsTitle = styled.h4`
  margin: 0;
  color: ${colors.onSurface};
  font-weight: 800;
`

const StandardsCopy = styled.p`
  margin-top: ${spacing.sm}px;
  color: ${colors.onSurfaceVariant};
  font-size: 13px;
`

const EncryptionCard = styled.div`
  background: ${colors.surfaceContainerLow};
  padding: 12px;
  border-radius: ${radii.lg}px;
`

const BusinessConstitution: React.FC = () => {
  return (
    <Main>
      <PageHeader>
        <PageTitle>Business Constitution</PageTitle>
        <PageSubtitle>Define the legal parameters of your reinsurance entity for capital allocation modeling.</PageSubtitle>
      </PageHeader>

      <Layout>
        <Column>
          <Section>
            <SectionGlow />
            <SectionHeader
              title="Entity Identification"
              subtitle="Provide core legal identity details for the underwriting entity."
            />

            <Fields>
              <FormField label="Legal Entity Name" placeholder="e.g. Sovereign Asset Management Ltd" />

              <FieldPair>
                <div>
                  <FieldLabel>JURISDICTION</FieldLabel>
                  <Select defaultValue="">
                    <option value="" disabled>Select Jurisdiction</option>
                    <option value="bermuda">Bermuda (Class 4)</option>
                    <option value="usa">United States</option>
                    <option value="uk">United Kingdom (Lloyd's)</option>
                    <option value="cayman">Cayman Islands</option>
                    <option value="singapore">Singapore (MAS)</option>
                  </Select>
                </div>
              </FieldPair>
            </Fields>
          </Section>

          <Section>
            <SectionHeader
              title="Underwriting Capacity"
              subtitle="Set expected capacity metrics used by the capital allocator."
            />

            <CurrencyField>
              <FormField label="Annual GWP (USD)" placeholder="50,000,000.00" inputMode="decimal" />
              <CurrencyPrefix>$</CurrencyPrefix>
            </CurrencyField>
            <HelperText>Enter projected annual GWP for the current fiscal year in USD.</HelperText>

            <FileDropzone
              title="Accreditation Documentation"
              helperText="Drag and drop regulatory certificates or upload PDF"
              accept="application/pdf"
            />
          </Section>

          <NavRow>
            <Button variant="ghost">← Previous Step</Button>
            <Button variant="primary">Continue to Verification</Button>
          </NavRow>
        </Column>

        <Aside>
          <InfoCard tone="info" icon="gpp_good" title="Regulatory Insight">
            Jurisdiction selection determines available capital tranches and compliance requirements for contracts. Solvency &amp; Capital Rules Applied.
          </InfoCard>

          <StandardsCard>
            <StandardsImage />
            <StandardsBody>
              <StandardsTitle>Institutional Standards</StandardsTitle>
              <StandardsCopy>All data is encrypted with AES-256 and stored in sovereign data vaults.</StandardsCopy>
            </StandardsBody>
          </StandardsCard>

          <EncryptionCard>
            <ProgressBar value={100} tone="gain" label="ENCRYPTION STRENGTH — ACTIVE" />
          </EncryptionCard>
        </Aside>
      </Layout>
    </Main>
  )
}

export default BusinessConstitution
