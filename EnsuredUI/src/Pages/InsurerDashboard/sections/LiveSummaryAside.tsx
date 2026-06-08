import React from 'react';
import styled from 'styled-components';
import * as S from '../InsurerDashboard.styles';
import { colors, withAlpha } from '../../../xds/colors';
import type { SubjectInput } from '../InsurerDashboard.sectionTypes';

type WorkflowCheck = {
  label: string;
  value: string;
  color: string;
};

type Props = {
  exposureLoading: boolean;
  exposureDisplay: string;
  subjects: SubjectInput[];
  workflowChecks: WorkflowCheck[];
};

const Block = styled.div`
  margin-bottom: 16px;
`;

const SectionLabel = styled.div`
  font-size: 10px;
  text-transform: uppercase;
  color: ${S.t.neutral400};
  font-weight: 700;
  margin-bottom: 8px;
`;

const CapacityRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
`;

const CapacityCaption = styled.div`
  font-size: 12px;
  color: ${S.t.neutral400};
`;

const TrendValue = styled.div`
  font-size: 12px;
  color: ${S.t.accent};
  font-weight: 700;
`;

const ExposureValue = styled.div`
  font-size: 28px;
  font-weight: 800;
`;

const SubjectsRow = styled.div`
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
`;

const SubjectsLabel = styled.div`
  color: ${S.t.neutral400};
`;

const SubjectsCount = styled.div`
  color: ${S.t.accent};
  font-weight: 700;
`;

const SubjectPreview = styled.div`
  margin-top: 6px;
  font-size: 11px;
  color: ${S.t.textMuted};
  line-height: 1.4;
`;

const MetricPair = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const MetricTile = styled.div<{ $accent: string }>`
  background: ${S.t.surfaceLow};
  padding: 12px;
  border-radius: 8px;
  border-left: 4px solid ${(p) => p.$accent};
`;

const MetricLabel = styled.div`
  font-size: 10px;
  text-transform: uppercase;
  color: ${S.t.neutral400};
  font-weight: 700;
`;

const MetricValue = styled.div<{ $color: string }>`
  font-size: 18px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 800;
  color: ${(p) => p.$color};
`;

const ChartArea = styled.div`
  padding: 16px;
`;

const BarChart = styled.div`
  height: 128px;
  display: flex;
  gap: 4px;
  align-items: end;
`;

const Bar = styled.div<{ $bg: string; $h: number }>`
  flex: 1;
  background: ${(p) => p.$bg};
  height: ${(p) => p.$h}px;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
`;

const WorkflowHeader = styled.div`
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 700;
`;

const WorkflowHeaderLabel = styled.div`
  color: ${S.t.neutral400};
`;

const WorkflowHeaderStatus = styled.div`
  color: ${S.t.accent};
`;

const CheckList = styled.div`
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CheckRow = styled.div`
  background: ${S.t.surfaceRaised};
  padding: 12px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CheckLabel = styled.div`
  font-size: 10px;
  text-transform: uppercase;
  color: ${S.t.neutral400};
  font-weight: 700;
`;

const CheckValue = styled.div<{ $color: string }>`
  color: ${(p) => p.$color};
  font-weight: 700;
  font-size: 12px;
`;

const MetaList = styled.div`
  margin-top: 16px;
`;

const MetaRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  color: ${S.t.neutral400};

  & + & {
    margin-top: 12px;
  }
`;

const MetaIcon = styled.div`
  width: 40px;
  height: 40px;
  background: ${S.t.surfaceLow};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MetaLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
`;

const MetaValue = styled.div`
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
`;

export default function LiveSummaryAside({ exposureLoading, exposureDisplay, subjects, workflowChecks }: Props) {
  return (
    <S.RightAside>
      <S.SummaryCard>
        <S.SummaryInner>
          <Block>
            <SectionLabel>Live Capital Exposure</SectionLabel>
            <CapacityRow>
              <CapacityCaption>Total Capacity</CapacityCaption>
              <TrendValue>+8.4% WoW</TrendValue>
            </CapacityRow>
            <ExposureValue>{exposureLoading ? 'Loading…' : exposureDisplay}</ExposureValue>
            <SubjectsRow>
              <SubjectsLabel>Subjects tracked</SubjectsLabel>
              <SubjectsCount>{subjects.length}</SubjectsCount>
            </SubjectsRow>
            <SubjectPreview>
              {subjects.slice(0, 2).map((subject) => subject.subjectLabel).join(' • ')}{subjects.length > 2 ? ` • +${subjects.length - 2} more` : ''}
            </SubjectPreview>
          </Block>
          <MetricPair>
            <MetricTile $accent={S.t.primary}>
              <MetricLabel>Wtd. Avg Return</MetricLabel>
              <MetricValue $color={S.t.primary}>12.45%</MetricValue>
            </MetricTile>
            <MetricTile $accent={S.t.danger}>
              <MetricLabel>Expected Loss</MetricLabel>
              <MetricValue $color={colors.errorSoft}>3.12%</MetricValue>
            </MetricTile>
          </MetricPair>
        </S.SummaryInner>
        <ChartArea>
          <BarChart>
            <Bar $bg={withAlpha(colors.primary, 0.12)} $h={16} />
            <Bar $bg={withAlpha(colors.primary, 0.18)} $h={32} />
            <Bar $bg={withAlpha(colors.primary, 0.28)} $h={56} />
            <Bar $bg={withAlpha(colors.primary, 0.45)} $h={80} />
            <Bar $bg={withAlpha(colors.primary, 0.65)} $h={96} />
            <Bar $bg={S.t.accent} $h={48} />
          </BarChart>
          <div>
            <WorkflowHeader>
              <WorkflowHeaderLabel>Workflow Status</WorkflowHeaderLabel>
              <WorkflowHeaderStatus>READY FOR SUBMISSION</WorkflowHeaderStatus>
            </WorkflowHeader>
            <CheckList>
              {workflowChecks.map((workflowCheck) => (
                <CheckRow key={workflowCheck.label}>
                  <CheckLabel>{workflowCheck.label}</CheckLabel>
                  <CheckValue $color={workflowCheck.color}>{workflowCheck.value}</CheckValue>
                </CheckRow>
              ))}
            </CheckList>
          </div>
        </ChartArea>
      </S.SummaryCard>

      <MetaList>
        <MetaRow>
          <MetaIcon>
            <S.Icon className="material-symbols-outlined">history</S.Icon>
          </MetaIcon>
          <div>
            <MetaLabel>Last Modified</MetaLabel>
            <MetaValue>Today at 14:24:02 GMT</MetaValue>
          </div>
        </MetaRow>
        <MetaRow>
          <MetaIcon>
            <S.Icon className="material-symbols-outlined">share</S.Icon>
          </MetaIcon>
          <div>
            <MetaLabel>Collaboration</MetaLabel>
            <MetaValue>3 Underwriters Active</MetaValue>
          </div>
        </MetaRow>
      </MetaList>
    </S.RightAside>
  );
}
