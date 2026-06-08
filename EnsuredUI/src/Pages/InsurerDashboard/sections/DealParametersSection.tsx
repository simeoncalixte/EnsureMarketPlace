import React from 'react';
import styled from 'styled-components';
import * as S from '../InsurerDashboard.styles';
import { colors, withAlpha } from '../../../xds/colors';
import Input from '../../../xds/components/Input';
import Select from '../../../xds/components/Select';
import SegmentedSwitch from '../../../xds/components/SegmentedSwitch';

const FieldLabel = styled.label`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${S.t.neutral400};
  font-weight: 700;
`;

const DateRange = styled.div`
  display: flex;
  gap: 8px;
`;

const DateSeparator = styled.div`
  align-self: center;
  color: ${withAlpha(colors.neutral[400], 0.6)};
`;

const PerilRow = styled.div`
  padding-top: 8px;
`;

const PERIL_OPTIONS = [
  { label: 'US WIND', value: 'US WIND' },
  { label: 'FLOOD', value: 'FLOOD' },
  { label: 'EQ', value: 'EQ' },
];

type Props = {
  isActive: boolean;
  name: string;
  cedingEntity: string;
  startDate: string;
  endDate: string;
  peril: string;
  sourceCedent?: string;
  onSetName: (value: string) => void;
  onSetCedingEntity: (value: string) => void;
  onSetStartDate: (value: string) => void;
  onSetEndDate: (value: string) => void;
  onSetPeril: (value: string) => void;
};

export default function DealParametersSection({
  isActive,
  name,
  cedingEntity,
  startDate,
  endDate,
  peril,
  sourceCedent,
  onSetName,
  onSetCedingEntity,
  onSetStartDate,
  onSetEndDate,
  onSetPeril,
}: Props) {
  return (
    <S.Section $active={isActive}>
      <S.SectionHeader>
        <S.SectionTitle>01 Deal Parameters</S.SectionTitle>
        <S.SectionRule />
      </S.SectionHeader>
      <S.GridTwo>
        <div>
          <FieldLabel>Deal Name / ID</FieldLabel>
          <Input value={name} onChange={(event) => onSetName(event.target.value)} />
        </div>
        <div>
          <FieldLabel>Ceding Entity</FieldLabel>
          <Select value={cedingEntity} onChange={(event) => onSetCedingEntity(event.target.value)}>
            {sourceCedent ? <option value={sourceCedent}>{sourceCedent}</option> : null}
            <option>Munich Re Institutional</option>
            <option>Swiss Re Capital</option>
            <option>Lloyd&apos;s Syndicate 1910</option>
          </Select>
        </div>
        <div>
          <FieldLabel>Effective Dates</FieldLabel>
          <DateRange>
            <Input type="date" value={startDate} onChange={(event) => onSetStartDate(event.target.value)} />
            <DateSeparator>to</DateSeparator>
            <Input type="date" value={endDate} onChange={(event) => onSetEndDate(event.target.value)} />
          </DateRange>
        </div>
        <div>
          <FieldLabel>Peril Type</FieldLabel>
          <PerilRow>
            <SegmentedSwitch options={PERIL_OPTIONS} value={peril} onChange={onSetPeril} aria-label="Peril Type" />
          </PerilRow>
        </div>
      </S.GridTwo>
    </S.Section>
  );
}
