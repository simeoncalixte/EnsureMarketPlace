import React from 'react'
import { useNavigate } from 'react-router'
import styled from 'styled-components'
import Card from '../../xds/components/Card'
import Button from '../../xds/components/Button'
import MetricCard from '../../xds/components/MetricCard'
import ProgressBar from '../../xds/components/ProgressBar'
import { colors, withAlpha } from '../../xds/colors'
import { typography } from '../../xds/tokens'
import { withChatbot } from '../../xds/hoc/withChatbot'

const Page = styled.div`
  background: ${colors.surface};
  color: ${colors.text.primary};
  font-family: ${typography.bodyFamily};
`

const Content = styled.div`
  width: min(100% - 2rem, 1240px);
  margin: 0 auto;

  @media (min-width: 760px) {
    width: min(100% - 4rem, 1240px);
  }
`

const Bulletin = styled.div`
  padding: 0.8rem 0;
  border-bottom: 1px solid ${colors.border};
  background: ${colors.surfaceContainer};
`

const BulletinRow = styled(Content)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: ${colors.onSurfaceVariant};
  font-family: ${typography.labelFamily};
  font-size: 0.58rem;
  letter-spacing: 0.08em;
  line-height: 1.5;
  text-transform: uppercase;

  @media (max-width: 760px) {
    align-items: flex-start;
    flex-direction: column;
  }
`

const BulletinGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const Circular = styled.span`
  padding: 0.2rem 0.42rem;
  background: ${colors.dangerDeep};
  color: ${colors.white};
  font-weight: 700;
  white-space: nowrap;
`

const Online = styled.span`
  color: ${colors.primarySoft};
  font-weight: 700;
`

const Dot = styled.span`
  display: inline-block;
  width: 0.4rem;
  height: 0.4rem;
  margin-right: 0.4rem;
  border-radius: 50%;
  background: ${colors.primary};
  box-shadow: 0 0 0 4px ${withAlpha(colors.primary, 0.12)};
`

const HeroSection = styled.section`
  padding: clamp(2.5rem, 6vw, 5rem) 0;
  border-bottom: 1px solid ${colors.border};
  background:
    linear-gradient(90deg, ${withAlpha(colors.primary, 0.04)} 1px, transparent 1px),
    linear-gradient(${withAlpha(colors.primary, 0.04)} 1px, transparent 1px),
    ${colors.surface};
  background-size: 32px 32px;
`

const HeroGrid = styled(Content)`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.85fr);
  gap: clamp(2rem, 5vw, 4rem);
  align-items: start;

  @media (max-width: 940px) {
    grid-template-columns: 1fr;
  }
`

const HeroCopy = styled.div`
  display: grid;
  gap: 1.35rem;
`

const Eyebrow = styled.div<{ $tone?: 'danger' | 'secondary' | 'primary' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  color: ${({ $tone }) => {
    if ($tone === 'danger') return colors.danger
    if ($tone === 'secondary') return colors.secondary
    return colors.primarySoft
  }};
  font-family: ${typography.labelFamily};
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`

const Square = styled.span`
  width: 0.48rem;
  height: 0.48rem;
  flex: 0 0 auto;
  background: currentColor;
`

const HeroTitle = styled.h1`
  max-width: 13ch;
  margin: 0;
  color: ${colors.text.primary};
  font-family: ${typography.headlineFamily};
  font-size: clamp(2.75rem, 6vw, 5.6rem);
  font-weight: 400;
  letter-spacing: -0.045em;
  line-height: 0.94;

  em {
    color: ${colors.primarySoft};
    font-weight: 400;
  }
`

const HeroBody = styled.p`
  max-width: 46rem;
  margin: 0;
  color: ${colors.onSurfaceMuted};
  font-size: clamp(1.08rem, 1.7vw, 1.3rem);
  line-height: 1.55;

  strong {
    color: ${colors.text.primary};
    font-family: ${typography.labelFamily};
    font-size: 0.86em;
  }
`

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`

const GazetteButton = styled(Button)`
  min-height: 3rem;
  padding: 0.72rem 1.25rem;
  border-radius: 0;
  font-family: ${typography.labelFamily};
  font-size: 0.68rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`

const TelemetryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid ${colors.border};
  border-bottom: 1px solid ${colors.border};

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`

const GazetteMetric = styled(MetricCard)`
  min-width: 0;
  padding: 0.9rem;
  border: 0;
  border-right: 1px solid ${colors.border};
  border-radius: 0;
  background: ${colors.surfaceRaised};

  &:last-child {
    border-right: 0;
  }

  @media (max-width: 620px) {
    border-right: 0;
    border-bottom: 1px solid ${colors.border};

    &:last-child {
      border-bottom: 0;
    }
  }
`

const QuoteStrip = styled.blockquote`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin: 0;
  padding: 0.8rem 1rem;
  border-left: 3px solid ${colors.secondary};
  background: ${colors.secondaryContainer};
  color: ${colors.onSecondaryContainer};
  font-size: 0.94rem;
  font-style: italic;
  line-height: 1.45;

  cite {
    align-self: center;
    flex: 0 0 auto;
    color: ${colors.secondary};
    font-family: ${typography.labelFamily};
    font-size: 0.52rem;
    font-style: normal;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
`

const HeroAside = styled.div`
  display: grid;
  gap: 1rem;
`

const EditorialCard = styled(Card)`
  padding: 0;
  border-color: ${colors.border};
  border-radius: 0;
  background: ${colors.surfaceRaised};
`

const TerminalCard = styled(EditorialCard)`
  padding: 1rem;
  border-color: ${colors.outline};
  background: ${colors.primaryContainer};
  color: ${colors.onPrimaryContainer};
`

const CardTopline = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid ${withAlpha(colors.onPrimaryContainer, 0.26)};
  color: ${colors.onPrimaryContainer};
  font-family: ${typography.labelFamily};
  font-size: 0.52rem;
  letter-spacing: 0.08em;
  line-height: 1.5;
  text-transform: uppercase;
`

const TerminalReadout = styled.div`
  display: grid;
  gap: 0.75rem;
  padding-top: 0.85rem;
  font-family: ${typography.labelFamily};
`

const ReadoutRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  color: ${colors.onPrimaryContainer};
  font-size: 0.62rem;
  line-height: 1.4;

  strong {
    color: ${colors.primarySoft};
  }
`

const PressureTrack = styled.div`
  height: 0.5rem;
  border: 1px solid ${withAlpha(colors.onPrimaryContainer, 0.35)};
  background: ${colors.surfaceDeep};
`

const PressureFill = styled.div`
  width: 24%;
  height: 100%;
  background: ${colors.primarySoft};
`

const SparklineRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 8rem;
  align-items: end;
  gap: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${withAlpha(colors.onPrimaryContainer, 0.2)};

  svg {
    width: 100%;
    color: ${colors.primarySoft};
  }
`

const SparkValue = styled.div`
  margin-top: 0.25rem;
  color: ${colors.white};
  font-family: ${typography.headlineFamily};
  font-size: 1.35rem;
  font-weight: 700;
`

const LedgerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.9rem;
  border-bottom: 1px solid ${colors.border};
  background: ${colors.surfaceContainer};
  color: ${colors.text.primary};
  font-family: ${typography.labelFamily};
  font-size: 0.54rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  span:last-child {
    color: ${colors.primarySoft};
  }
`

const LedgerGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
`

const LedgerCell = styled.div`
  min-height: 5.6rem;
  padding: 0.85rem;
  border-right: 1px solid ${colors.border};
  border-bottom: 1px solid ${colors.border};

  &:nth-child(2n) {
    border-right: 0;
  }
`

const LedgerLabel = styled.div`
  color: ${colors.onSurfaceVariant};
  font-family: ${typography.labelFamily};
  font-size: 0.5rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

const LedgerValue = styled.div`
  margin-top: 0.25rem;
  color: ${colors.text.primary};
  font-family: ${typography.headlineFamily};
  font-size: 1.25rem;
  font-weight: 700;
`

const LedgerNote = styled.div`
  margin-top: 0.25rem;
  color: ${colors.primarySoft};
  font-family: ${typography.labelFamily};
  font-size: 0.5rem;
`

const Disclosure = styled.p`
  margin: 0;
  padding: 0.8rem 0.9rem;
  background: ${colors.surfaceContainer};
  color: ${colors.onSurfaceMuted};
  font-size: 0.8rem;
  line-height: 1.45;
`

const Section = styled.section<{ $muted?: boolean }>`
  padding: clamp(3.2rem, 7vw, 5.5rem) 0;
  border-bottom: 1px solid ${colors.border};
  background: ${({ $muted }) => ($muted ? colors.surfaceContainerLow : colors.surface)};
`

const SectionHeading = styled.div<{ $center?: boolean }>`
  max-width: ${({ $center }) => ($center ? '48rem' : '52rem')};
  margin: ${({ $center }) => ($center ? '0 auto 2.5rem' : '0 0 2.5rem')};
  text-align: ${({ $center }) => ($center ? 'center' : 'left')};
`

const SectionTitle = styled.h2`
  margin: 0.55rem 0 0;
  color: ${colors.text.primary};
  font-family: ${typography.headlineFamily};
  font-size: clamp(2rem, 4vw, 3.4rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1;
`

const SectionDescription = styled.p`
  margin: 0.85rem 0 0;
  color: ${colors.onSurfaceMuted};
  font-size: 1.05rem;
  line-height: 1.55;
`

const ArchitectureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const LayerCard = styled(EditorialCard)`
  display: flex;
  flex-direction: column;
  min-height: 100%;
`

const LayerHeader = styled.div`
  padding: 1.1rem;
  border-bottom: 1px solid ${colors.border};
  background: ${colors.surfaceContainer};
`

const LayerIndex = styled.div`
  color: ${colors.primarySoft};
  font-family: ${typography.labelFamily};
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`

const LayerTitle = styled.h3`
  margin: 0.45rem 0 0;
  color: ${colors.text.primary};
  font-family: ${typography.headlineFamily};
  font-size: 1.45rem;
  line-height: 1.1;
`

const LayerSummary = styled.p`
  margin: 0.45rem 0 0;
  color: ${colors.onSurfaceMuted};
  font-size: 0.9rem;
  line-height: 1.45;
`

const FeatureList = styled.ul`
  display: grid;
  gap: 0.75rem;
  flex: 1;
  margin: 0;
  padding: 1.1rem;
  list-style: none;
`

const Feature = styled.li`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.55rem;
  color: ${colors.onSurfaceMuted};
  font-size: 0.9rem;
  line-height: 1.45;

  span:first-child {
    color: ${colors.primarySoft};
    font-family: ${typography.labelFamily};
    font-weight: 700;
  }

  strong {
    color: ${colors.text.primary};
  }
`

const LayerMetric = styled.div`
  margin: 0 1.1rem 1.1rem;
  padding: 0.7rem;
  border: 1px solid ${colors.border};
  background: ${colors.surfaceContainerLow};
  color: ${colors.onSurfaceVariant};
  font-family: ${typography.labelFamily};
  font-size: 0.56rem;
  text-transform: uppercase;

  strong {
    display: block;
    margin-top: 0.3rem;
    color: ${colors.text.primary};
    font-size: 0.7rem;
  }
`

const StepGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const StepCard = styled(EditorialCard)`
  min-height: 15rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1rem;
`

const StepNumber = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: ${colors.primarySoft};
  font-family: ${typography.headlineFamily};
  font-size: 1.5rem;
  font-weight: 700;

  span:last-child {
    padding: 0.22rem 0.38rem;
    border: 1px solid ${colors.border};
    color: ${colors.onSurfaceVariant};
    font-family: ${typography.labelFamily};
    font-size: 0.5rem;
  }
`

const StepTitle = styled.h3`
  margin: 1rem 0 0.5rem;
  color: ${colors.text.primary};
  font-family: ${typography.headlineFamily};
  font-size: 1.15rem;
`

const StepBody = styled.p`
  margin: 0;
  color: ${colors.onSurfaceMuted};
  font-size: 0.88rem;
  line-height: 1.5;
`

const StepProof = styled.div`
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid ${colors.border};
  color: ${colors.onSurfaceVariant};
  font-family: ${typography.labelFamily};
  font-size: 0.5rem;
  text-transform: uppercase;
`

const OrderbookHeader = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 680px) {
    align-items: stretch;
    flex-direction: column;
  }
`

const OrderbookGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`

const TrancheCard = styled(EditorialCard)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
`

const TrancheTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: ${colors.onSurfaceVariant};
  font-family: ${typography.labelFamily};
  font-size: 0.5rem;
`

const TrancheTag = styled.span<{ $tone?: 'gold' | 'danger' }>`
  padding: 0.25rem 0.4rem;
  border: 1px solid ${({ $tone }) => ($tone === 'gold' ? colors.secondary : $tone === 'danger' ? colors.danger : colors.primary)};
  background: ${({ $tone }) => ($tone === 'gold' ? colors.secondaryContainer : $tone === 'danger' ? colors.tertiaryContainer : colors.surfaceContainerHigh)};
  color: ${({ $tone }) => ($tone === 'gold' ? colors.secondary : $tone === 'danger' ? colors.danger : colors.primarySoft)};
  font-weight: 700;
  text-transform: uppercase;
`

const TrancheTitle = styled.h3`
  margin: 0;
  color: ${colors.text.primary};
  font-family: ${typography.headlineFamily};
  font-size: 1.28rem;
  line-height: 1.16;
`

const TrancheBody = styled.p`
  flex: 1;
  margin: 0;
  color: ${colors.onSurfaceMuted};
  font-size: 0.88rem;
  line-height: 1.45;
`

const SpecGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
  padding: 0.75rem;
  border: 1px solid ${colors.border};
  background: ${colors.surfaceContainerLow};
`

const Spec = styled.div`
  color: ${colors.onSurfaceVariant};
  font-family: ${typography.labelFamily};
  font-size: 0.48rem;
  text-transform: uppercase;

  strong {
    display: block;
    margin-top: 0.2rem;
    color: ${colors.text.primary};
    font-size: 0.62rem;
  }
`

const FillMeta = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  color: ${colors.onSurfaceVariant};
  font-family: ${typography.labelFamily};
  font-size: 0.5rem;

  strong {
    color: ${colors.primarySoft};
  }
`

const GazetteProgress = styled(ProgressBar)`
  & > div:last-child {
    border: 1px solid ${colors.border};
    border-radius: 0;
  }

  & > div:last-child > div {
    border-radius: 0;
  }
`

const ReserveGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const ReserveCard = styled(EditorialCard)`
  padding: 1.15rem;
`

const ReserveHeadline = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid ${colors.border};
`

const ReserveLabel = styled.div`
  color: ${colors.onSurfaceVariant};
  font-family: ${typography.labelFamily};
  font-size: 0.54rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const ReserveValue = styled.div`
  margin-top: 0.2rem;
  color: ${colors.text.primary};
  font-family: ${typography.headlineFamily};
  font-size: clamp(2rem, 4vw, 3.15rem);
  font-weight: 700;
  letter-spacing: -0.035em;
`

const CollateralBar = styled.div`
  display: flex;
  height: 2.2rem;
  margin-top: 1.2rem;
  border: 1px solid ${colors.outline};
  overflow: hidden;
  color: ${colors.white};
  font-family: ${typography.labelFamily};
  font-size: 0.5rem;
  font-weight: 700;
`

const TreasuryBar = styled.div`
  width: 82.4%;
  display: grid;
  place-items: center;
  background: ${colors.primaryContainer};
`

const FloatBar = styled.div`
  width: 17.6%;
  display: grid;
  place-items: center;
  background: ${colors.dangerDeep};
`

const YieldRows = styled.div`
  display: grid;
  gap: 0.7rem;
  margin-top: 1rem;
`

const YieldRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem;
  border: 1px solid ${colors.border};
  background: ${colors.surfaceContainerLow};
  color: ${colors.onSurfaceMuted};
  font-size: 0.84rem;
  line-height: 1.4;

  strong {
    color: ${colors.text.primary};
  }

  > strong:last-child {
    flex: 0 0 auto;
    color: ${colors.primarySoft};
    font-family: ${typography.headlineFamily};
    font-size: 1.1rem;
  }
`

const YieldBanner = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
  padding: 0.9rem;
  background: ${colors.primaryContainer};
  color: ${colors.onPrimaryContainer};

  strong {
    display: block;
    margin-top: 0.15rem;
    color: ${colors.white};
    font-family: ${typography.headlineFamily};
    font-size: 1.25rem;
  }

  span:last-child {
    align-self: center;
    font-family: ${typography.labelFamily};
    font-size: 0.5rem;
    text-align: right;
  }
`

const AttestationGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const Attestation = styled(EditorialCard)`
  padding: 0.9rem;

  .material-symbols-outlined {
    color: ${colors.primarySoft};
  }

  h3 {
    margin: 0.55rem 0 0;
    color: ${colors.text.primary};
    font-family: ${typography.headlineFamily};
    font-size: 1.1rem;
  }

  p {
    margin: 0.35rem 0 0;
    color: ${colors.onSurfaceMuted};
    font-size: 0.82rem;
    line-height: 1.45;
  }
`

const CustodianStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.8rem;
  margin-top: 0.75rem;
  padding: 0.9rem;
  border: 1px solid ${colors.border};
  background: ${colors.surfaceContainer};
  color: ${colors.text.primary};
  font-family: ${typography.labelFamily};
  font-size: 0.54rem;
  font-weight: 700;
  text-transform: uppercase;

  span::before {
    content: '';
    display: inline-block;
    width: 0.35rem;
    height: 0.35rem;
    margin-right: 0.4rem;
    background: ${colors.primary};
  }
`

const CtaSection = styled.section`
  padding: clamp(3.5rem, 8vw, 6rem) 0;
  border-bottom: 1px solid ${colors.border};
  background: ${colors.surfaceContainerLow};
`

const CtaPanel = styled(Content)`
  position: relative;
  overflow: hidden;
  padding: clamp(2rem, 5vw, 4.5rem);
  border: 1px solid ${colors.primary};
  background: ${colors.primaryContainer};
  color: ${colors.onPrimaryContainer};

  &::after {
    content: 'ER';
    position: absolute;
    right: -1rem;
    bottom: -4rem;
    color: ${withAlpha(colors.white, 0.06)};
    font-family: ${typography.headlineFamily};
    font-size: clamp(9rem, 24vw, 18rem);
    font-weight: 700;
    line-height: 1;
    pointer-events: none;
  }
`

const CtaContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: 52rem;

  h2 {
    margin: 1rem 0 0;
    color: ${colors.white};
    font-family: ${typography.headlineFamily};
    font-size: clamp(2.35rem, 5vw, 4.25rem);
    line-height: 0.98;
  }

  p {
    max-width: 45rem;
    margin: 1rem 0 0;
    color: ${colors.onPrimaryContainer};
    font-size: 1.05rem;
    line-height: 1.55;
  }
`

const CtaActions = styled(HeroActions)`
  margin-top: 1.5rem;
`

const LightButton = styled(GazetteButton)`
  background: ${colors.white};
  color: ${colors.primaryContainer};

  &:hover:not(:disabled) {
    background: ${colors.surfaceContainer};
  }
`

const CtaFootnotes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1.75rem;
  padding-top: 1rem;
  border-top: 1px solid ${withAlpha(colors.onPrimaryContainer, 0.25)};
  color: ${colors.onPrimaryContainer};
  font-family: ${typography.labelFamily};
  font-size: 0.52rem;
  text-transform: uppercase;
`

const Footer = styled.footer`
  padding: 2.5rem 0 1.25rem;
  background: ${colors.surfaceContainer};
`

const FooterGrid = styled(Content)`
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1.2fr;
  gap: 1.5rem;

  @media (max-width: 880px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`

const FooterBlock = styled.div`
  h3 {
    margin: 0 0 0.6rem;
    color: ${colors.text.primary};
    font-family: ${typography.labelFamily};
    font-size: 0.6rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  p,
  div {
    margin: 0;
    color: ${colors.onSurfaceMuted};
    font-size: 0.8rem;
    line-height: 1.55;
  }
`

const Merkle = styled.div`
  padding: 0.7rem;
  border: 1px solid ${colors.border};
  background: ${colors.surfaceRaised};
  font-family: ${typography.labelFamily};
  font-size: 0.54rem !important;
`

const FooterBottom = styled(Content)`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid ${colors.border};
  color: ${colors.onSurfaceVariant};
  font-size: 0.72rem;
  line-height: 1.45;

  @media (max-width: 680px) {
    flex-direction: column;
  }
`

const layers = [
  {
    index: 'Layer 01 // Origination',
    title: 'Primary Cedants & Insurers',
    summary: 'Cede peak catastrophe liabilities with deterministic automated attachment.',
    features: [
      ['Dynamic Solvency II Relief', 'Instant SCR reduction by up to 42%.'],
      ['<90s Instant BDM Binding', 'Eliminate re-broking and broker chain leakage.'],
      ['Deterministic Model Ingest', 'Native RMS, AIR and KatRisk catastrophe feeds.'],
    ],
    metric: ['Standard attachment ratio', '1-in-100 to 1-in-250 year PML'],
  },
  {
    index: 'Layer 02 // Syndication',
    title: 'Accredited Syndicates',
    summary: 'Lead underwriters set programmatic pricing lines through transparent auctions.',
    features: [
      ['Algorithmic Slip Placement', 'Match subscriptions across XL and stop-loss contracts.'],
      ['Commission Streaming', 'Distribute brokerage fees programmatically per block.'],
      ['Zero Counterparty Drift', 'Escrowed collateral removes recovery credit risk.'],
    ],
    metric: ['Clearing volume speed', 'Atomic settlement (T+0)'],
  },
  {
    index: 'Layer 03 // Liquidity',
    title: 'Retrocessionaires & Allocators',
    summary: 'Deploy sovereign capital into uncorrelated insurance-linked credit spreads.',
    features: [
      ['Uncorrelated Macro Yield', 'Realize blended APY independent of equity and bond beta.'],
      ['Programmatic Auctions', 'Allocate tranches through transparent competitive bidding.'],
      ['Instant USD Mint / Burn', 'Continuous liquidity across institutional corridors.'],
    ],
    metric: ['Targeted net yield band', 'SOFR + 450 to 1,200 bps'],
  },
]

const steps = [
  ['I', 'Actuarial Ingest & Hash Validation', 'Catastrophe curves enter oracle consensus and a loss-exceedance hash is minted into state.', 'sha256:8f2a...19e0'],
  ['II', 'Dutch Auction Slip Bidding', 'Accredited syndicates place pricing lines across senior XL, mezzanine and stop-loss tranches.', 'Auction window: 120 min'],
  ['III', 'Tri-Party Custody Lockup', 'Allocated capital settles into segregated statutory accounts before $reUSD is minted.', 'Custodial escrow: 100% par'],
  ['IV', 'Streaming Yield & Settlement', 'Premium streams accrue per block; verified catastrophe events disburse indemnity in seconds.', 'Parametric payout: <60 sec'],
]

const tranches = [
  {
    tag: 'Senior CAT XL • AA equiv', id: 'NA-0842', title: 'North America Hurricane — Gulf & Florida Layer 2',
    body: 'Attachment: $250M xs $500M aggregate. Modelled 1-in-150 year return period.', spread: '+980 bps', capacity: '$45.0M', feed: 'RMS v23', fill: 92, fillText: '$41.4M / $45.0M', action: 'Participate in Syndicate', tone: undefined,
  },
  {
    tag: 'Mezzanine Excess • A+', id: 'CY-0199', title: 'Systemic Cloud Infrastructure Interruption',
    body: 'Parametric outage cover for tier-one hyperscalers exceeding 360 operational minutes.', spread: '+1,240 bps', capacity: '$28.5M', feed: 'CloudNet', fill: 74, fillText: '$21.1M / $28.5M', action: 'View Slip & Commit', tone: 'gold' as const,
  },
  {
    tag: 'Parametric Marine • Bound', id: 'MA-9941', title: 'Suez & Bab-el-Mandeb Chokepoint',
    body: 'AIS trigger for commercial hull diversion delays exceeding 96 hours.', spread: '+760 bps', capacity: '$18.0M', feed: 'Lloyd’s AIS', fill: 100, fillText: '$18.0M / $18.0M', action: 'Fully Subscribed', tone: 'danger' as const,
  },
]

const attestations = [
  ['account_balance', 'BMA Class IIGB', 'Statutory solvency supervision and continuous regulatory reporting.'],
  ['gavel', 'Bankruptcy-Remote Trust', 'Protocol liabilities partitioned into isolated legal master cells.'],
  ['security', 'Proof of Reserve', 'Continuous 1:1 custody polling across segregated accounts.'],
  ['verified', 'Independent Audit', 'Formal verification of clearing and settlement contracts.'],
]

const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const beginRegistration = () => navigate('/auth/register')
  const signIn = () => navigate('/auth/login')

  return (
    <Page>
      <Bulletin>
        <BulletinRow>
          <BulletinGroup>
            <Circular>Circular No. 1,409-B</Circular>
            <span>Class 4 statutory bulletin // actuarial clearing depositary</span>
          </BulletinGroup>
          <Online><Dot />Bermuda // London consensus online</Online>
        </BulletinRow>
      </Bulletin>

      <HeroSection>
        <HeroGrid>
          <HeroCopy>
            <Eyebrow $tone="danger"><Square />Sovereign retrocession bulletin // System 92-A</Eyebrow>
            <HeroTitle>Where primary tail risk converts into <em>sovereign liquidity.</em></HeroTitle>
            <HeroBody>
              Ensured Re is an algorithmic clearinghouse connecting primary cedants, accredited syndicates and sovereign balance sheets. Validated catastrophe layers become bankruptcy-remote, Treasury-yielding <strong>$reUSD</strong> positions.
            </HeroBody>

            <HeroActions aria-label="Primary platform actions">
              <GazetteButton type="button" onClick={beginRegistration}>Deploy Capital →</GazetteButton>
              <GazetteButton type="button" variant="outline" onClick={beginRegistration}>Transfer Risk</GazetteButton>
            </HeroActions>

            <TelemetryGrid>
              <GazetteMetric label="Net blended APY" value="11.40%" delta="SOFR + XL spread" tone="success" />
              <GazetteMetric label="Solvency II SCR buffer" value="284.6%" delta="184.6% above minimum" tone="success" />
              <GazetteMetric label="Atomic sync consensus" value="100.0%" delta="T+0 escrow lockup" tone="warning" />
            </TelemetryGrid>

            <QuoteStrip>
              “Programmatic solvency attestation replaces multi-week treaty ambiguity with atomic settlement proof.”
              <cite>Actuarial Gazette</cite>
            </QuoteStrip>
          </HeroCopy>

          <HeroAside>
            <TerminalCard variant="high">
              <CardTopline>
                <span><Dot />Fig. 1: Telemetry // Node 04-Bermuda</span>
                <span>Block 19,842,901</span>
              </CardTopline>
              <TerminalReadout>
                <ReadoutRow><span>Parametric hurricane trigger</span><strong>Pressure &lt; 920mb</strong></ReadoutRow>
                <PressureTrack><PressureFill /></PressureTrack>
                <ReadoutRow><span>Current station: 1,014.2mb</span><strong>Safe margin 94.2mb</strong></ReadoutRow>
                <SparklineRow>
                  <div>
                    <LedgerLabel>7-day realized float volatility</LedgerLabel>
                    <SparkValue>0.082 bps</SparkValue>
                  </div>
                  <svg viewBox="0 0 120 30" fill="none" aria-label="Seven-day volatility sparkline">
                    <polyline points="0,22 15,20 30,24 45,16 60,18 75,10 90,14 105,8 120,12" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </SparklineRow>
              </TerminalReadout>
            </TerminalCard>

            <EditorialCard>
              <LedgerHeader><span>Consolidated solvency ledger // Audited</span><span>Daily 16:00 EST</span></LedgerHeader>
              <LedgerGrid>
                <LedgerCell><LedgerLabel>Placed capacity</LedgerLabel><LedgerValue>$1,842.50M</LedgerValue><LedgerNote>32 programmed syndicates</LedgerNote></LedgerCell>
                <LedgerCell><LedgerLabel>$reUSD circulation</LedgerLabel><LedgerValue>$624.31M</LedgerValue><LedgerNote>100% segregated T-bills</LedgerNote></LedgerCell>
                <LedgerCell><LedgerLabel>Weighted net APY</LedgerLabel><LedgerValue>11.40%</LedgerValue><LedgerNote>Yield + underwriting spread</LedgerNote></LedgerCell>
                <LedgerCell><LedgerLabel>Settlement</LedgerLabel><LedgerValue>T + 0</LedgerValue><LedgerNote>Instant atomic escrow</LedgerNote></LedgerCell>
              </LedgerGrid>
              <Disclosure><strong>Statutory disclosure:</strong> backing assets are collateralized in bankruptcy-remote statutory trusts and reconciled daily.</Disclosure>
            </EditorialCard>
          </HeroAside>
        </HeroGrid>
      </HeroSection>

      <Section id="architecture" $muted>
        <Content>
          <SectionHeading $center>
            <Eyebrow>Institutional architecture // Regime tripartite</Eyebrow>
            <SectionTitle>The Tripartite Risk Clearing Engine</SectionTitle>
            <SectionDescription>Programmatic placement, continuous collateral lockup and auditable solvency relief—organized as one institutional clearing corridor.</SectionDescription>
          </SectionHeading>
          <ArchitectureGrid>
            {layers.map((layer) => (
              <LayerCard key={layer.index}>
                <LayerHeader><LayerIndex>{layer.index}</LayerIndex><LayerTitle>{layer.title}</LayerTitle><LayerSummary>{layer.summary}</LayerSummary></LayerHeader>
                <FeatureList>
                  {layer.features.map(([title, body]) => <Feature key={title}><span>✓</span><span><strong>{title}:</strong> {body}</span></Feature>)}
                </FeatureList>
                <LayerMetric>{layer.metric[0]}<strong>{layer.metric[1]}</strong></LayerMetric>
              </LayerCard>
            ))}
          </ArchitectureGrid>
        </Content>
      </Section>

      <Section id="mechanics">
        <Content>
          <SectionHeading>
            <Eyebrow $tone="danger">Protocol workflow // Verified sequence</Eyebrow>
            <SectionTitle>From Validated Risk to Minted $reUSD</SectionTitle>
            <SectionDescription>Standard resolution time: less than 14 seconds.</SectionDescription>
          </SectionHeading>
          <StepGrid>
            {steps.map(([number, title, body, proof], index) => (
              <StepCard key={number}>
                <div><StepNumber>[ {number} ]<span>Stage {String(index + 1).padStart(2, '0')}</span></StepNumber><StepTitle>{title}</StepTitle><StepBody>{body}</StepBody></div>
                <StepProof>{proof}</StepProof>
              </StepCard>
            ))}
          </StepGrid>
        </Content>
      </Section>

      <Section id="orderbook" $muted>
        <Content>
          <OrderbookHeader>
            <div><Eyebrow>Live tranches // Sovereign orderbook</Eyebrow><SectionTitle>Active Syndication Orderbook</SectionTitle></div>
            <GazetteButton type="button" variant="outline" onClick={beginRegistration}>View All 48 Tranches</GazetteButton>
          </OrderbookHeader>
          <OrderbookGrid>
            {tranches.map((tranche) => (
              <TrancheCard key={tranche.id}>
                <TrancheTop><TrancheTag $tone={tranche.tone}>{tranche.tag}</TrancheTag><span>#{tranche.id}</span></TrancheTop>
                <TrancheTitle>{tranche.title}</TrancheTitle>
                <TrancheBody>{tranche.body}</TrancheBody>
                <SpecGrid>
                  <Spec>Spread margin<strong>{tranche.spread}</strong></Spec>
                  <Spec>Total capacity<strong>{tranche.capacity}</strong></Spec>
                  <Spec>Attestation feed<strong>{tranche.feed}</strong></Spec>
                  <Spec>Settlement<strong>T + 0</strong></Spec>
                </SpecGrid>
                <div>
                  <FillMeta><span>Syndication fill</span><strong>{tranche.fill}% · {tranche.fillText}</strong></FillMeta>
                  <GazetteProgress value={tranche.fill} tone={tranche.tone === 'gold' ? 'tertiary' : 'primary'} size="sm" />
                </div>
                <GazetteButton type="button" variant={tranche.fill === 100 ? 'secondary' : 'primary'} disabled={tranche.fill === 100} onClick={beginRegistration}>{tranche.action}</GazetteButton>
              </TrancheCard>
            ))}
          </OrderbookGrid>
        </Content>
      </Section>

      <Section id="reserves">
        <Content>
          <SectionHeading>
            <Eyebrow $tone="secondary">Monetary architecture // Statutory reserves</Eyebrow>
            <SectionTitle>$reUSD Dual-Collateral Mechanics</SectionTitle>
            <SectionDescription>A bankruptcy-remote unit of account combining Treasury duration with prime catastrophe reinsurance float.</SectionDescription>
          </SectionHeading>
          <ReserveGrid>
            <ReserveCard>
              <ReserveHeadline><div><ReserveLabel>Total collateralized value</ReserveLabel><ReserveValue>$624.31M</ReserveValue></div><TrancheTag>100% par collateralized</TrancheTag></ReserveHeadline>
              <CollateralBar><TreasuryBar>$514.43M T-bills</TreasuryBar><FloatBar>$109.88M</FloatBar></CollateralBar>
              <YieldRows>
                <YieldRow><span><strong>Ultra-short U.S. Treasury bills</strong><br />Segregated institutional custody. Base risk-free yield.</span><strong>5.25%</strong></YieldRow>
                <YieldRow><span><strong>Underwriting premium float</strong><br />Programmatic premium stream from 48 active slips.</span><strong>+6.15%</strong></YieldRow>
              </YieldRows>
              <YieldBanner><span>Net realized blended APY<strong>11.40% sovereign yield</strong></span><span>Streamed per second<br />T+0 redeemable</span></YieldBanner>
            </ReserveCard>

            <div>
              <AttestationGrid>
                {attestations.map(([icon, title, body]) => (
                  <Attestation key={title}><span className="material-symbols-outlined" aria-hidden="true">{icon}</span><h3>{title}</h3><p>{body}</p></Attestation>
                ))}
              </AttestationGrid>
              <CustodianStrip><span>State Street Bank</span><span>BNY Mellon</span><span>Anchorage Digital</span></CustodianStrip>
            </div>
          </ReserveGrid>
        </Content>
      </Section>

      <CtaSection>
        <CtaPanel>
          <CtaContent>
            <Eyebrow>Institutional clearing access // Form 84-RE</Eyebrow>
            <h2>Place underwriting capacity or cede peak liability.</h2>
            <p>Qualified syndicates, primary insurers and sovereign allocators can request direct clearing access under the Ensured Re master participation agreement.</p>
            <CtaActions>
              <LightButton type="button" onClick={beginRegistration}>Register for Clearing Access →</LightButton>
              <GazetteButton type="button" variant="outline" onClick={signIn}>Sign in to the Clearing Desk</GazetteButton>
            </CtaActions>
            <CtaFootnotes><span>• KYB &amp; LEI attestation required</span><span>• Minimum ticket $1,000,000</span><span>• Institutional oversight</span></CtaFootnotes>
          </CtaContent>
        </CtaPanel>
      </CtaSection>

      <Footer>
        <FooterGrid>
          <FooterBlock><h3>Ensured Reinsurance Ltd.</h3><p>Real-time actuarial telemetry and programmatic reinsurance settlement for institutional counterparties.</p></FooterBlock>
          <FooterBlock><h3>Custodians</h3><div>State Street Bank<br />BNY Mellon<br />Anchorage Digital</div></FooterBlock>
          <FooterBlock><h3>Regulatory regimes</h3><div>BMA statutory solvency<br />PRA / Lloyd’s accord<br />FINMA equivalence</div></FooterBlock>
          <FooterBlock><h3>Consensus dispatch</h3><Merkle>Merkle root<br />0x9B44F7E218AA8C...4DF1<br /><Online>Attested block #19,402,118</Online></Merkle></FooterBlock>
        </FooterGrid>
        <FooterBottom><span>© 2026 Ensured Reinsurance Protocol. Qualified institutional participation only.</span><span>Audited ledger · Participation agreement · Disclosures</span></FooterBottom>
      </Footer>
    </Page>
  )
}

export { LandingPage }

export default withChatbot(LandingPage, {
  audioSrc: '/ensured-re-welcome.mp3',
  autoPlayOnFirstVisit: true,
  storageKey: 'ensured-landing-welcome-attempted-v1',
  title: 'Ensured AI',
})
