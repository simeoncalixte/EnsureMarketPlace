import React from 'react'
import styled from 'styled-components'
import * as S from './InsurerDashboard.styles'
import StatCard from '../../xds/components/StatCard'
import { colors } from '../../xds/colors'

const CoverageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const CoverageRow = styled.div`
  background: ${colors.surfaceContainerHigh};
  padding: 16px;
  border-radius: 8px;
`

const CoverageTitle = styled.div`
  font-weight: 800;
  margin-bottom: 6px;
`

const CoverageMeta = styled.div`
  color: ${colors.onSurfaceVariant};
  font-size: 13px;
`

const AsideNote = styled.div`
  padding: 16px;
  font-size: 13px;
  color: ${colors.onSurfaceVariant};
`

export default function ActiveCoverage() {
  return (
    <S.ContentArea>
      <S.LeftColumn>
        <S.Section>
          <S.SectionHeader>
            <S.SectionTitle>Active Coverage</S.SectionTitle>
            <S.SectionRule />
          </S.SectionHeader>

          <CoverageList>
            <CoverageRow>
              <CoverageTitle>TRX-9902 • US WIND</CoverageTitle>
              <CoverageMeta>Attachment: $500,000,000 • Exhaustion: $1,200,000,000</CoverageMeta>
            </CoverageRow>

            <CoverageRow>
              <CoverageTitle>TRX-8871 • FLOOD</CoverageTitle>
              <CoverageMeta>Attachment: $250,000,000 • Exhaustion: $700,000,000</CoverageMeta>
            </CoverageRow>
          </CoverageList>
        </S.Section>
      </S.LeftColumn>

      <S.RightAside>
        <S.SummaryCard>
          <StatCard label="Active Policies" value="2" />
          <AsideNote>View and manage currently active coverage across your portfolio.</AsideNote>
        </S.SummaryCard>
      </S.RightAside>
    </S.ContentArea>
  )
}
