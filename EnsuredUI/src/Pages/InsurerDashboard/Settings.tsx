import React, { useState } from 'react'
import styled from 'styled-components'
import * as S from './InsurerDashboard.styles'
import StatCard from '../../xds/components/StatCard'
import FormField from '../../xds/components/FormField'
import Select from '../../xds/components/Select'
import Button from '../../xds/components/Button'
import { colors } from '../../xds/colors'

const SettingsForm = styled.div`
  display: grid;
  gap: 12px;
  max-width: 640px;
`

const FieldLabel = styled.label`
  display: block;
  font-size: 10px;
  text-transform: uppercase;
  color: ${colors.onSurfaceVariant};
  font-weight: 700;
`

const SaveRow = styled.div`
  margin-top: 8px;
`

const AsideNote = styled.div`
  padding: 16px;
  font-size: 13px;
  color: ${colors.onSurfaceVariant};
`

export default function Settings() {
  const [companyName, setCompanyName] = useState('Acme Re')
  const [timezone, setTimezone] = useState('UTC')

  return (
    <S.ContentArea>
      <S.LeftColumn>
        <S.Section>
          <S.SectionHeader>
            <S.SectionTitle>Settings</S.SectionTitle>
            <S.SectionRule />
          </S.SectionHeader>

          <SettingsForm>
            <FormField
              label="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />

            <div>
              <FieldLabel>Timezone</FieldLabel>
              <Select value={timezone} onChange={(e: any) => setTimezone(e.target.value)}>
                <option>UTC</option>
                <option>America/New_York</option>
                <option>Europe/London</option>
              </Select>
            </div>

            <SaveRow>
              <Button variant="primary">Save Settings</Button>
            </SaveRow>
          </SettingsForm>
        </S.Section>
      </S.LeftColumn>

      <S.RightAside>
        <S.SummaryCard>
          <StatCard label="Preferences" value={companyName} />
          <AsideNote>Update basic insurer account settings and preferences.</AsideNote>
        </S.SummaryCard>
      </S.RightAside>
    </S.ContentArea>
  )
}
