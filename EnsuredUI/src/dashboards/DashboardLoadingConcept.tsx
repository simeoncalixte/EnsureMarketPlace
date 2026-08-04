import React, { useEffect, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { colors, withAlpha } from '../xds/colors';
import {
  MARKETPLACE_HOMEPAGE_REQUESTS,
  useMarketplaceHomepageRequestProgress,
  type ApiRequestProgressItem,
} from '../api/requestProgress';

export type DashboardLoadingConceptVariant = 'orbit' | 'skeleton' | 'signals';

const drift = keyframes`
  0%, 100% { transform: translateY(0); opacity: .55; }
  50% { transform: translateY(-5px); opacity: 1; }
`;
const rotate = keyframes`to { transform: rotate(360deg); }`;
const counterRotate = keyframes`to { transform: rotate(-360deg); }`;
const sweep = keyframes`
  0% { background-position: 160% 0; }
  100% { background-position: -160% 0; }
`;
const travel = keyframes`
  0% { transform: translateX(-16px); opacity: 0; }
  18%, 82% { opacity: 1; }
  100% { transform: translateX(210px); opacity: 0; }
`;
const collapseToCore = keyframes`
  0% { transform: translateY(0) scale(1); opacity: 1; }
  70% { transform: translateY(var(--orbit-collapse-distance)) scale(.72); opacity: 1; }
  100% { transform: translateY(var(--orbit-collapse-distance)) scale(.25); opacity: 0; }
`;
const collapseRing = keyframes`
  0% { transform: scale(1); opacity: 1; }
  70% { transform: scale(.18); opacity: .7; }
  100% { transform: scale(0); opacity: 0; }
`;
const clearResolvedRequest = keyframes`
  0%, 30% { opacity: 1; }
  100% { opacity: 0; }
`;

const Stage = styled.section`
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: inherit;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  overflow: hidden;
  position: relative;
  color: ${colors.onSurface};
  background:
    radial-gradient(circle at 50% 45%, ${withAlpha(colors.primary, .11)}, transparent 33%),
    ${colors.background};
`;
const Content = styled.div`
  width: min(560px, calc(100% - 48px));
  text-align: center;
  position: relative;
  z-index: 1;
`;
const Eyebrow = styled.div`
  color: ${colors.primarySoft};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
  margin-bottom: 10px;
`;
const Title = styled.h2`
  font-size: 22px;
  line-height: 1.25;
  margin: 0;
  font-weight: 650;
`;
const Detail = styled.p`
  color: ${colors.onSurfaceVariant};
  font-size: 13px;
  margin: 9px 0 0;
`;

const Orbit = styled.div`
  width: 190px;
  height: 190px;
  margin: 28px auto 28px;
  position: relative;
  display: grid;
  place-items: center;
`;
const Ring = styled.div<{
  $size: number;
  $reverse?: boolean;
  $status: ApiRequestProgressItem['status'];
  $duration: number;
  $delay: number;
}>`
  position: absolute;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  animation-name: ${({ $reverse }) => $reverse ? counterRotate : rotate};
  animation-duration: ${({ $duration }) => $duration}s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-delay: ${({ $delay }) => $delay}s;
  animation-play-state: ${({ $status }) => $status === 'pending' ? 'running' : 'paused'};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
const OrbitCircle = styled.span<{ $status: ApiRequestProgressItem['status'] }>`
  position: absolute;
  inset: 0;
  display: block;
  border-radius: 50%;
  border: 1px solid ${({ $status }) =>
    $status === 'error'
      ? withAlpha(colors.error, .46)
      : $status === 'success'
        ? withAlpha(colors.accent, .34)
        : withAlpha(colors.primarySoft, .26)};
  ${({ $status }) => $status === 'success' && css`
    animation: ${collapseRing} .72s cubic-bezier(.22, .8, .3, 1) forwards;
  `}

  @media (prefers-reduced-motion: reduce) {
    ${({ $status }) => $status === 'success' && css`
      transform: scale(0);
      opacity: 0;
    `}
  }
`;
const OrbitNode = styled.span<{ $status: ApiRequestProgressItem['status']; $ringSize: number }>`
  position: absolute;
  top: -4px;
  left: calc(50% - 4px);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  --orbit-collapse-distance: ${({ $ringSize }) => $ringSize / 2}px;
  background: ${({ $status }) =>
    $status === 'error'
      ? colors.error
      : $status === 'success'
        ? colors.accent
        : $status === 'idle'
          ? colors.onSurfaceVariant
          : colors.primary};
  box-shadow: 0 0 14px ${({ $status }) =>
    $status === 'error'
      ? colors.error
      : $status === 'success'
        ? colors.accent
        : $status === 'idle'
          ? withAlpha(colors.onSurfaceVariant, .45)
          : colors.primary};
  ${({ $status }) => $status === 'success' && css`
    animation: ${collapseToCore} .72s cubic-bezier(.22, .8, .3, 1) forwards;
  `}

  @media (prefers-reduced-motion: reduce) {
    ${({ $status }) => $status === 'success' && css`
      transform: translateY(var(--orbit-collapse-distance)) scale(.25);
      opacity: 0;
    `}
  }
`;
const Core = styled.div`
  width: 64px;
  height: 64px;
  box-sizing: border-box;
  border-radius: 50%;
  overflow: hidden;
  display: grid;
  place-items: center;
  font-size: 26px;
  color: ${colors.accent};
  border: 1px solid ${withAlpha(colors.accent, .3)};
  background: ${withAlpha(colors.surfaceRaised, .88)};
  box-shadow: 0 20px 55px ${withAlpha(colors.black, .35)};
`;

const SkeletonGrid = styled.div`
  display: grid;
  grid-template-columns: 1.2fr .8fr;
  grid-template-rows: 58px 82px;
  gap: 10px;
  margin: 28px auto 28px;
  width: min(440px, 100%);
`;
const SkeletonCard = styled.div<{ $delay: number; $wide?: boolean }>`
  border-radius: 12px;
  border: 1px solid ${colors.outlineVariant};
  background: linear-gradient(100deg,
    ${withAlpha(colors.surfaceRaised, .72)} 28%,
    ${withAlpha(colors.primarySoft, .2)} 45%,
    ${withAlpha(colors.surfaceRaised, .72)} 62%);
  background-size: 220% 100%;
  animation: ${sweep} 1.7s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;
  ${({ $wide }) => $wide && css`grid-column: 1 / -1;`}
`;

const SignalBox = styled.div`
  width: min(440px, 100%);
  height: 126px;
  margin: 28px auto 28px;
  position: relative;
  border: 1px solid ${colors.outlineVariant};
  border-radius: 16px;
  background: linear-gradient(180deg, ${withAlpha(colors.surfaceRaised, .88)}, ${withAlpha(colors.surface, .66)});
  overflow: hidden;
`;
const SignalLine = styled.div<{ $top: number }>`
  position: absolute;
  left: 34px;
  right: 34px;
  top: ${({ $top }) => $top}px;
  height: 1px;
  background: linear-gradient(90deg, transparent, ${withAlpha(colors.primarySoft, .25)}, transparent);
`;
const SignalDot = styled.span<{ $top: number; $delay: number; $accent?: boolean }>`
  position: absolute;
  left: 34px;
  top: ${({ $top }) => $top - 4}px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $accent }) => $accent ? colors.accent : colors.primary};
  box-shadow: 0 0 14px ${({ $accent }) => $accent ? colors.accent : colors.primary};
  animation: ${travel} 2.1s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;
`;
const Steps = styled.div<{ $slots: number }>`
  width: min(360px, 100%);
  height: ${({ $slots }) => Math.max(0, $slots * 18 + Math.max(0, $slots - 1) * 2)}px;
  margin-left: auto;
  margin-right: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  margin-top: 16px;
  text-align: left;
`;
const RequestItem = styled.div<{ $status: ApiRequestProgressItem['status'] }>`
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 7px;
  align-items: center;
  width: 100%;
  min-width: 0;
  height: 18px;
  overflow: hidden;
  color: ${({ $status }) => $status === 'error' ? colors.errorSoft : colors.onSurfaceVariant};
  ${({ $status }) => $status === 'success' && css`
    animation: ${clearResolvedRequest} .72s ease forwards;
  `}

  @media (prefers-reduced-motion: reduce) {
    ${({ $status }) => $status === 'success' && css`
      opacity: 0;
    `}
  }
`;
const RequestIcon = styled.span<{ $status: ApiRequestProgressItem['status'] }>`
  width: 16px;
  display: inline-block;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: ${({ $status }) => $status === 'error' ? colors.errorSoft : $status === 'success' ? colors.accent : colors.primarySoft};
  animation: ${({ $status }) => $status === 'pending' ? drift : 'none'} 1.5s ease-in-out infinite;
`;
const RequestCopy = styled.span`
  min-width: 0;
  display: block;
  font-size: 11px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ICONS: Record<string, string> = {
  shield: '◆', route: '⌘', dashboard: '▦', opportunity: '◇', taxonomy: '⌗',
  storm: 'ϟ', filter: '≡', pulse: '⌁', palette: '◉',
};

export default function DashboardLoadingConcept({
  variant,
  requests,
  lifecycleComplete = false,
  completionRequestIds,
  onAnimationsComplete,
}: {
  variant: DashboardLoadingConceptVariant;
  requests?: ApiRequestProgressItem[];
  /** True only after the owning data lifecycle has settled. */
  lifecycleComplete?: boolean;
  /** Restrict the blocking animation gate to critical request IDs. Defaults to every visible request. */
  completionRequestIds?: string[];
  /** Fires after all tracked requests settle and successful orbit collapses finish. */
  onAnimationsComplete?: () => void;
}) {
  const liveRequests = useMarketplaceHomepageRequestProgress();
  const visibleRequests = requests ?? liveRequests;
  const requestSlotCount = requests?.length ?? Object.keys(MARKETPLACE_HOMEPAGE_REQUESTS).length;
  const [collapsedRequestIds, setCollapsedRequestIds] = useState<Set<string>>(() => new Set());
  const completionSent = useRef(false);
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const activeIds = new Set(visibleRequests.map((request) => request.id));
    setCollapsedRequestIds((current) => {
      const next = new Set(Array.from(current).filter((id) => activeIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [visibleRequests]);

  useEffect(() => {
    if (!lifecycleComplete) {
      completionSent.current = false;
      return;
    }
    const completionRequests = completionRequestIds?.length
      ? visibleRequests.filter((request) => completionRequestIds.includes(request.id))
      : visibleRequests;
    const allRequestsSettled = completionRequests.length > 0
      && completionRequests.every((request) => request.status === 'success' || request.status === 'error');
    const successfulRequestsCollapsed = reducedMotion || completionRequests
      .filter((request) => request.status === 'success')
      .every((request) => collapsedRequestIds.has(request.id));
    if (allRequestsSettled && successfulRequestsCollapsed && !completionSent.current) {
      completionSent.current = true;
      onAnimationsComplete?.();
    }
  }, [collapsedRequestIds, completionRequestIds, lifecycleComplete, onAnimationsComplete, reducedMotion, visibleRequests]);
  const orbitRequests = visibleRequests.length > 0
    ? visibleRequests
    : [{ id: 'dashboard', status: 'pending' } as ApiRequestProgressItem];
  const orbitMinSize = 54;
  const orbitMaxSize = 184;
  const orbitStep = orbitRequests.length > 1
    ? (orbitMaxSize - orbitMinSize) / (orbitRequests.length - 1)
    : 0;
  const visual = variant === 'orbit' ? (
    <Orbit aria-label={`${visibleRequests.length} homepage requests`}>
      {orbitRequests.map((request, index) => {
        const ringSize = orbitMinSize + orbitStep * index;
        return (
        <Ring
          key={request.id}
          $size={ringSize}
          $status={request.status}
          $reverse={index % 2 === 1}
          $duration={2.8 + index * .42}
          $delay={-index * .37}
          title={`${request.label}: ${request.status}`}
        >
          <OrbitCircle
            $status={request.status}
            onAnimationEnd={() => {
              if (request.status !== 'success') return;
              setCollapsedRequestIds((current) => {
                if (current.has(request.id)) return current;
                const next = new Set(current);
                next.add(request.id);
                return next;
              });
            }}
          />
          <OrbitNode $status={request.status} $ringSize={ringSize} />
        </Ring>
        );
      })}
      <Core aria-hidden="true">⌁</Core>
    </Orbit>
  ) : variant === 'skeleton' ? (
    <SkeletonGrid aria-hidden="true">
      <SkeletonCard $delay={0} $wide /><SkeletonCard $delay={.18} /><SkeletonCard $delay={.36} />
    </SkeletonGrid>
  ) : (
    <SignalBox aria-hidden="true">
      {[30, 62, 94].map((top) => <SignalLine key={top} $top={top} />)}
      <SignalDot $top={30} $delay={0} /><SignalDot $top={62} $delay={.45} $accent /><SignalDot $top={94} $delay={.9} />
    </SignalBox>
  );
  const copy = {
    orbit: ['Connecting your market', 'Resolving portfolio, risk and capital signals.'],
    skeleton: ['Building your dashboard', 'Arranging your workspace around the latest market data.'],
    signals: ['Reading the market', 'Scanning live risk, capacity and opportunity signals.'],
  }[variant];

  return (
    <Stage aria-live="polite" aria-busy="true">
      <Content>
        <Eyebrow>Ensured Marketplace</Eyebrow>
        <Title>{copy[0]}</Title>
        <Detail>{copy[1]}</Detail>
        {visual}
        {requestSlotCount > 0 && (
          <Steps $slots={requestSlotCount} aria-label="Homepage request progress">
            {visibleRequests.map((request) => {
              return (
                <RequestItem key={request.id} $status={request.status} title={request.error ?? request.description}>
                  <RequestIcon $status={request.status} aria-hidden="true">
                    {request.status === 'success' ? '✓' : request.status === 'error' ? '!' : ICONS[request.icon] ?? '•'}
                  </RequestIcon>
                  <RequestCopy>{request.status === 'error' ? request.errorLabel : request.label}</RequestCopy>
                </RequestItem>
              );
            })}
          </Steps>
        )}
      </Content>
    </Stage>
  );
}
