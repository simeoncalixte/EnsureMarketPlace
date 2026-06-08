import React from 'react'
import styled from 'styled-components'
import * as S from './InsurerDashboard.styles'
import StatCard from '../../xds/components/StatCard'
import { colors } from '../../xds/colors'

const ReportList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const ReportRow = styled.div`
  background: ${colors.surfaceContainerHigh};
  padding: 16px;
  border-radius: 8px;
`

const ReportTitle = styled.div`
  font-weight: 800;
`

const ReportMeta = styled.div`
  color: ${colors.onSurfaceVariant};
  font-size: 13px;
`

const AsideNote = styled.div`
  padding: 16px;
  font-size: 13px;
  color: ${colors.onSurfaceVariant};
`

export default function Reports() {
  return (
    <S.ContentArea>
      <S.LeftColumn>
        <S.Section>
          <S.SectionHeader>
            <S.SectionTitle>Reports</S.SectionTitle>
            <S.SectionRule />
          </S.SectionHeader>

          <ReportList>
            <ReportRow>
              <ReportTitle>Monthly Exposure Report</ReportTitle>
              <ReportMeta>Generated: Apr 14, 2026 • CSV</ReportMeta>
            </ReportRow>

            <ReportRow>
              <ReportTitle>Loss Expectancy Summary</ReportTitle>
              <ReportMeta>Generated: Apr 10, 2026 • PDF</ReportMeta>
            </ReportRow>
          </ReportList>
        </S.Section>
      </S.LeftColumn>

      <S.RightAside>
        <S.SummaryCard>
          <StatCard label="Recent Reports" value="2" />
          <AsideNote>Export, download, or schedule automated reports for your insurer portfolio.</AsideNote>
        </S.SummaryCard>
      </S.RightAside>
    </S.ContentArea>
  )
}
