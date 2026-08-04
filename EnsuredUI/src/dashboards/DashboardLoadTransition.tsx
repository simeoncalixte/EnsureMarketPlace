import React, { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';
import styled from 'styled-components';

type TransitionPhase = 'loading' | 'holding' | 'exiting' | 'complete';

const MINIMUM_VISIBLE_MS = 900;
const COMPLETION_HOLD_MS = 780;
const CROSSFADE_MS = 460;

const DashboardViewReadyContext = createContext(true);

/** True once the dashboard entrance lifecycle is complete and geometry is stable. */
export const useDashboardViewReady = () => useContext(DashboardViewReadyContext);

const TransitionRoot = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: inherit;
  min-width: 0;
`;

const LoaderLayer = styled.div<{ $phase: TransitionPhase }>`
  position: ${({ $phase }) => $phase === 'loading' ? 'relative' : 'absolute'};
  inset: ${({ $phase }) => $phase === 'loading' ? 'auto' : '0'};
  z-index: 2;
  width: 100%;
  height: 100%;
  min-height: inherit;
  opacity: ${({ $phase }) => $phase === 'exiting' || $phase === 'complete' ? 0 : 1};
  visibility: ${({ $phase }) => $phase === 'complete' ? 'hidden' : 'visible'};
  pointer-events: ${({ $phase }) => $phase === 'loading' || $phase === 'holding' ? 'auto' : 'none'};
  transition: opacity ${CROSSFADE_MS}ms cubic-bezier(.22, .8, .3, 1), visibility 0s linear ${CROSSFADE_MS}ms;
`;

const ContentLayer = styled.div<{ $phase: TransitionPhase }>`
  position: relative;
  z-index: 1;
  opacity: ${({ $phase }) => $phase === 'exiting' || $phase === 'complete' ? 1 : 0};
  transform: ${({ $phase }) => $phase === 'exiting' || $phase === 'complete' ? 'translateY(0)' : 'translateY(8px)'};
  pointer-events: ${({ $phase }) => $phase === 'complete' ? 'auto' : 'none'};
  transition:
    opacity ${CROSSFADE_MS}ms cubic-bezier(.22, .8, .3, 1),
    transform ${CROSSFADE_MS}ms cubic-bezier(.22, .8, .3, 1);

  @media (prefers-reduced-motion: reduce) {
    transform: none;
    transition: none;
  }
`;

/**
 * Keeps a completed loader alive for its semantic completion animation, then
 * crossfades to content. Timers represent lifecycle boundaries, not fake API
 * progress: the hold begins only after the real `loading` flag settles.
 */
export default function DashboardLoadTransition({
  loading,
  animationComplete,
  loader,
  children,
}: {
  loading: boolean;
  animationComplete: boolean;
  loader: React.ReactNode;
  children: React.ReactNode;
}) {
  const [phase, setPhase] = useState<TransitionPhase>(loading ? 'loading' : 'complete');
  const [delayComplete, setDelayComplete] = useState(!loading);
  const startedAt = useRef(loading ? performance.now() : 0);
  const previousLoading = useRef(loading);

  useLayoutEffect(() => {
    const wasLoading = previousLoading.current;
    previousLoading.current = loading;
    let holdTimer: number | undefined;

    if (loading) {
      if (!wasLoading) startedAt.current = performance.now();
      setPhase('loading');
      setDelayComplete(false);
      return undefined;
    }

    if (!wasLoading) {
      return undefined;
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const visibleFor = performance.now() - startedAt.current;
    const holdFor = reduceMotion
      ? 180
      : Math.max(COMPLETION_HOLD_MS, MINIMUM_VISIBLE_MS - visibleFor);
    setPhase('holding');
    holdTimer = window.setTimeout(() => {
      setDelayComplete(true);
    }, holdFor);

    return () => {
      if (holdTimer !== undefined) window.clearTimeout(holdTimer);
    };
  }, [loading]);

  useLayoutEffect(() => {
    if (loading || !delayComplete || !animationComplete) return undefined;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let exitTimer: number | undefined;
    const frame = window.requestAnimationFrame(() => {
      setPhase('exiting');
      exitTimer = window.setTimeout(() => setPhase('complete'), reduceMotion ? 0 : CROSSFADE_MS);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (exitTimer !== undefined) window.clearTimeout(exitTimer);
    };
  }, [animationComplete, delayComplete, loading]);

  return (
    <TransitionRoot data-loading-phase={phase}>
      {phase !== 'complete' && <LoaderLayer $phase={phase}>{loader}</LoaderLayer>}
      {!loading && (
        <DashboardViewReadyContext.Provider value={phase === 'complete'}>
          <ContentLayer $phase={phase}>{children}</ContentLayer>
        </DashboardViewReadyContext.Provider>
      )}
    </TransitionRoot>
  );
}
