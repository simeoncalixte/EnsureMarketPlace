import React, { useEffect, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { useNavigate } from 'react-router'
import OnboardingChecklist, { type OnboardingStep } from '../../xds/components/OnboardingChecklist'
import ProgressBar from '../../xds/components/ProgressBar'
import { colors, withAlpha } from '../../xds/colors'
import { radii, spacing, typography } from '../../xds/tokens'
import { useAuthMe } from '../../lib/useAuthMe'
import { listCapacityDefinitions, type CapacityDefinition } from '../../api/governance'
import { listChannels, type ApiChannel } from '../../api/ingestionChannels'
import { getSubmissions } from '../../api/underwriting'

// ─── Completion predicates (single source of truth for "done") ──────────────────

/** Appetite is "done" when the active capacity definition has real bounds set. */
export function isAppetiteDone(definition: CapacityDefinition | null | undefined): boolean {
  if (!definition) return false
  const a = (definition.appetite as Record<string, unknown>) ?? {}
  const hasList = (v: unknown) => Array.isArray(v) && v.length > 0
  return (
    a.maxLineSize != null ||
    hasList(a.allowedLinesOfBusiness) ||
    hasList(a.preferredPerils) ||
    hasList(a.preferredJurisdictions)
  )
}

/** Channels are "done" when at least one enabled + active channel exists. */
export function areChannelsDone(channels: ApiChannel[] | null | undefined): boolean {
  if (!Array.isArray(channels)) return false
  return channels.some((c) => c.enabled && c.status === 'active')
}

/** Submissions are "done" when the board has at least one item. */
export function areSubmissionsDone(itemCount: number): boolean {
  return itemCount > 0
}

// ─── Injectable loaders (default to the real api functions) ─────────────────────

export type OnboardingLoaders = {
  loadAppetite: (orgId: number) => Promise<CapacityDefinition | null>
  loadChannels: (orgId: number) => Promise<ApiChannel[]>
  loadSubmissionCount: () => Promise<number>
}

const defaultLoaders: OnboardingLoaders = {
  loadAppetite: (orgId) =>
    listCapacityDefinitions(orgId)
      .then((defs) => defs.find((d) => d.isActive) ?? defs[0] ?? null)
      .catch(() => null),
  loadChannels: (orgId) => listChannels(orgId).catch(() => []),
  loadSubmissionCount: async () => {
    try {
      const res = await getSubmissions()
      if (!res.ok) return 0
      const data = (await res.json()) as { items?: unknown[] }
      return Array.isArray(data.items) ? data.items.length : 0
    } catch {
      return 0
    }
  },
}

// ─── Collapse-state persistence ──────────────────────────────────────────────────
//
// The checklist no longer permanently dismisses. Instead it lives behind a
// sidebar nudge: "collapsed" means the popover is closed and only the nudge
// (progress indicator) is shown. The nudge persists until setup is actually
// complete, so it keeps drawing the user's attention back to the open steps.

export const collapsedKey = (orgId: number | null | undefined): string =>
  `insurer_onboarding_collapsed_${orgId ?? 'unknown'}`

function readCollapsed(orgId: number | null | undefined): boolean {
  try {
    return window.localStorage.getItem(collapsedKey(orgId)) === 'true'
  } catch {
    return false
  }
}

function writeCollapsed(orgId: number | null | undefined, collapsed: boolean): void {
  try {
    window.localStorage.setItem(collapsedKey(orgId), collapsed ? 'true' : 'false')
  } catch {
    /* ignore storage failures */
  }
}

// ─── Sidebar nudge (the attention-grabbing indicator) ────────────────────────────

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 ${withAlpha(colors.primary, 0.0)}; }
  50% { box-shadow: 0 0 0 4px ${withAlpha(colors.primary, 0.16)}; }
`

const NudgeButton = styled.button`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${spacing.xs}px;
  text-align: left;
  padding: ${spacing.sm}px ${spacing.md}px;
  border: 1px solid ${withAlpha(colors.primary, 0.35)};
  border-radius: ${radii.md}px;
  background: ${withAlpha(colors.primary, 0.08)};
  color: ${colors.onSurfaceStrong};
  cursor: pointer;
  animation: ${pulse} 2.4s ease-in-out infinite;
  transition: background 160ms ease, border-color 160ms ease;

  &:hover {
    background: ${withAlpha(colors.primary, 0.14)};
    border-color: ${withAlpha(colors.primary, 0.55)};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${withAlpha(colors.primary, 0.45)};
  }
`

const NudgeTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${spacing.sm}px;
`

const NudgeTitle = styled.span`
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.sm}px;
  font-weight: ${typography.weights.semibold};
  color: ${colors.onSurfaceStrong};
`

const NudgeCount = styled.span`
  font-family: ${typography.fontFamily};
  font-size: ${typography.sizes.xs}px;
  font-weight: ${typography.weights.semibold};
  color: ${colors.primarySoft};
  white-space: nowrap;
`

export type OnboardingNudgeProps = {
  completed: number
  total: number
  onOpen: () => void
}

/** Compact progress indicator that lives in the sidebar and opens the popover. */
export const OnboardingNudge: React.FC<OnboardingNudgeProps> = ({ completed, total, onOpen }) => (
  <NudgeButton type="button" onClick={onOpen} aria-label="Finish setting up your account">
    <NudgeTopRow>
      <NudgeTitle>Finish account setup</NudgeTitle>
      <NudgeCount>
        {completed}/{total}
      </NudgeCount>
    </NudgeTopRow>
    <ProgressBar value={completed} max={total > 0 ? total : 1} tone="gain" size="sm" />
  </NudgeButton>
)

// ─── Anchored popover (≤400px, originates from the sidebar) ───────────────────────

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 60;
  background: ${withAlpha(colors.scrim, 0.32)};
`

const Popover = styled.div`
  position: fixed;
  left: 1.25rem;
  bottom: 1.25rem;
  z-index: 61;
  width: calc(100vw - 2.5rem);
  max-width: 400px;
  max-height: calc(100vh - 2.5rem);
  overflow-y: auto;
  border-radius: ${radii.lg}px;
  box-shadow: 0 24px 60px ${withAlpha(colors.scrim, 0.45)};

  @media (min-width: 1024px) {
    /* Sit just to the right of the 18rem sidebar so it reads as originating there. */
    left: calc(18rem + 1rem);
  }
`

// ─── Hook: load + derive completion state ─────────────────────────────────────────

export type UseInsurerOnboarding = {
  isInsurer: boolean
  steps: OnboardingStep[]
  completed: number
  total: number
  allComplete: boolean
  orgId: number | null
}

function useOnboardingState(
  stepsOverride: OnboardingStep[] | undefined,
  loaders: Partial<OnboardingLoaders> | undefined,
): UseInsurerOnboarding {
  const { user } = useAuthMe()
  const navigate = useNavigate()

  const isInsurer = user?.role === 'insurer'
  const orgId = user?.organizationId ?? null

  const [appetiteDone, setAppetiteDone] = useState(false)
  const [channelsDone, setChannelsDone] = useState(false)
  const [submissionsDone, setSubmissionsDone] = useState(false)

  useEffect(() => {
    if (stepsOverride || !isInsurer || orgId == null) return
    let cancelled = false
    const l = { ...defaultLoaders, ...loaders }

    void (async () => {
      const [appetite, channels, count] = await Promise.all([
        l.loadAppetite(orgId),
        l.loadChannels(orgId),
        l.loadSubmissionCount(),
      ])
      if (cancelled) return
      setAppetiteDone(isAppetiteDone(appetite))
      setChannelsDone(areChannelsDone(channels))
      setSubmissionsDone(areSubmissionsDone(count))
    })()

    return () => {
      cancelled = true
    }
  }, [stepsOverride, isInsurer, orgId, loaders])

  const steps: OnboardingStep[] =
    stepsOverride ?? buildSteps({ appetiteDone, channelsDone, submissionsDone, navigate })

  const completed = steps.filter((s) => s.status === 'complete').length
  const allComplete = steps.length > 0 && completed === steps.length

  return { isInsurer, steps, completed, total: steps.length, allComplete, orgId }
}

// ─── Container ──────────────────────────────────────────────────────────────────

export type InsurerOnboardingProps = {
  /** Fully bypasses data loading; renders these steps verbatim (for stories/tests). */
  stepsOverride?: OnboardingStep[]
  /** Injectable loaders so stories/tests stay deterministic without MSW. */
  loaders?: Partial<OnboardingLoaders>
}

/**
 * Sidebar-anchored onboarding widget for insurers.
 *
 * Drop it into the sidebar footer. While setup is incomplete it renders a small
 * attention-grabbing nudge (progress indicator) in place; clicking the nudge
 * opens a compact (≤400px) popover anchored to the sidebar with the full
 * checklist. Closing the popover collapses back to the nudge (persisted), so the
 * indicator keeps prompting the user until every step is done.
 *
 * Self-gating: renders nothing unless the user is an insurer and at least one
 * step is incomplete. Additive — when it returns null the host is unchanged.
 */
export const InsurerOnboarding: React.FC<InsurerOnboardingProps> = ({ stepsOverride, loaders }) => {
  const { isInsurer, steps, completed, total, allComplete, orgId } = useOnboardingState(
    stepsOverride,
    loaders,
  )

  // `open` controls the popover. Default to closed (nudge resting state) once the
  // user has collapsed it before; first-time visitors land collapsed too so the
  // popover never hijacks the screen — the pulsing nudge draws them in instead.
  const [open, setOpen] = useState(false)

  // Hydrate the persisted collapse preference (only affects nothing visible yet,
  // but keeps the API symmetric and ready for an auto-open-once policy later).
  useEffect(() => {
    if (stepsOverride) return
    // Reading is enough to keep the key warm; default resting state is collapsed.
    readCollapsed(orgId)
  }, [orgId, stepsOverride])

  const handleOpen = () => {
    writeCollapsed(orgId, false)
    setOpen(true)
  }

  const handleClose = () => {
    writeCollapsed(orgId, true)
    setOpen(false)
  }

  // ── Self-gating ──
  if (!stepsOverride && !isInsurer) return null
  if (total === 0) return null
  if (allComplete) return null

  // Acting on a step (which deep-links elsewhere) should also dismiss the popover
  // so it doesn't linger over the destination page.
  const popoverSteps: OnboardingStep[] = steps.map((s) =>
    s.onAction
      ? {
          ...s,
          onAction: () => {
            handleClose()
            s.onAction?.()
          },
        }
      : s,
  )

  return (
    <>
      {!open && <OnboardingNudge completed={completed} total={total} onOpen={handleOpen} />}
      {open && (
        <>
          <Backdrop onClick={handleClose} />
          <Popover role="dialog" aria-label="Finish setting up your account">
            <OnboardingChecklist
              title="Finish setting up your account"
              subtitle="A few steps to start receiving and pricing submissions."
              steps={popoverSteps}
              onDismiss={handleClose}
              compact
            />
          </Popover>
        </>
      )}
    </>
  )
}

function buildSteps(args: {
  appetiteDone: boolean
  channelsDone: boolean
  submissionsDone: boolean
  navigate: (to: string) => void
}): OnboardingStep[] {
  const { appetiteDone, channelsDone, submissionsDone, navigate } = args

  const raw: Array<Omit<OnboardingStep, 'status'> & { done: boolean }> = [
    {
      id: 'appetite',
      title: 'Define your appetite',
      description: 'Set deployable capital, lines of business, and preferred perils.',
      actionLabel: 'Define appetite',
      onAction: () => navigate('/governance/capacity'),
      done: appetiteDone,
    },
    {
      id: 'channels',
      title: 'Connect an ingestion channel',
      description: 'Wire up a feed so submissions flow in automatically.',
      actionLabel: 'Connect channel',
      onAction: () => navigate('/insurer/pipeline-ingestion'),
      done: channelsDone,
    },
    {
      id: 'submissions',
      title: 'See your first priced submission',
      description: 'Review a submission once your pipeline produces one.',
      actionLabel: 'Open submissions',
      onAction: () => navigate('/underwriting/submissions'),
      done: submissionsDone,
    },
  ]

  let currentAssigned = false
  return raw.map(({ done, ...rest }) => {
    let status: OnboardingStep['status']
    if (done) {
      status = 'complete'
    } else if (!currentAssigned) {
      status = 'current'
      currentAssigned = true
    } else {
      status = 'todo'
    }
    return { ...rest, status }
  })
}

export default InsurerOnboarding
