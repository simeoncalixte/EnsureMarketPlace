import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { useNavigate } from 'react-router'
import OnboardingChecklist, { type OnboardingStep } from '../../xds/components/OnboardingChecklist'
import { useAuthMe } from '../../lib/useAuthMe'
import { getAppetite, type AppetiteProfile } from '../../api/organizations'
import { listChannels, type ApiChannel } from '../../api/ingestionChannels'
import { getSubmissions } from '../../api/underwriting'

// ─── Completion predicates (single source of truth for "done") ──────────────────

/** Appetite is "done" when a profile exists with real bounds configured. */
export function isAppetiteDone(profile: AppetiteProfile | null | undefined): boolean {
  if (!profile) return false
  return (
    profile.totalDeployableCapital != null ||
    (Array.isArray(profile.allowedLinesOfBusiness) && profile.allowedLinesOfBusiness.length > 0) ||
    (Array.isArray(profile.preferredPerils) && profile.preferredPerils.length > 0)
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
  loadAppetite: (orgId: number) => Promise<AppetiteProfile | null>
  loadChannels: (orgId: number) => Promise<ApiChannel[]>
  loadSubmissionCount: () => Promise<number>
}

const defaultLoaders: OnboardingLoaders = {
  loadAppetite: (orgId) => getAppetite(orgId).catch(() => null),
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

// ─── Dismissal persistence ──────────────────────────────────────────────────────

export const dismissedKey = (orgId: number | null | undefined): string =>
  `insurer_onboarding_dismissed_${orgId ?? 'unknown'}`

function readDismissed(orgId: number | null | undefined): boolean {
  try {
    return window.localStorage.getItem(dismissedKey(orgId)) === 'true'
  } catch {
    return false
  }
}

function writeDismissed(orgId: number | null | undefined): void {
  try {
    window.localStorage.setItem(dismissedKey(orgId), 'true')
  } catch {
    /* ignore storage failures */
  }
}

// Spacing wrapper (only mounted when the panel actually renders, so a hidden
// panel adds no layout). The xds component itself stays layout-agnostic/pure.
const PanelWrap = styled.div`
  margin-bottom: 24px;
`

// ─── Container ──────────────────────────────────────────────────────────────────

export type InsurerOnboardingProps = {
  /** Fully bypasses data loading; renders these steps verbatim (for stories/tests). */
  stepsOverride?: OnboardingStep[]
  /** Injectable loaders so stories/tests stay deterministic without MSW. */
  loaders?: Partial<OnboardingLoaders>
}

/**
 * Thin, data-wired onboarding panel for insurers.
 *
 * Self-gating: renders nothing unless the user is an insurer, the panel has not
 * been dismissed, and there is at least one incomplete step. Additive — when it
 * returns null the host page is unchanged.
 */
export const InsurerOnboarding: React.FC<InsurerOnboardingProps> = ({ stepsOverride, loaders }) => {
  const { user } = useAuthMe()
  const navigate = useNavigate()

  const isInsurer = user?.role === 'insurer'
  const orgId = user?.organizationId ?? null

  const [dismissed, setDismissed] = useState(false)
  const [appetiteDone, setAppetiteDone] = useState(false)
  const [channelsDone, setChannelsDone] = useState(false)
  const [submissionsDone, setSubmissionsDone] = useState(false)

  // Hydrate dismissal once the org id is known.
  useEffect(() => {
    if (stepsOverride) return
    setDismissed(readDismissed(orgId))
  }, [orgId, stepsOverride])

  // Load completion state from the three APIs (skipped when overridden / not an insurer).
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

  const handleDismiss = () => {
    writeDismissed(orgId)
    setDismissed(true)
  }

  // Build the live steps. The first incomplete step becomes 'current'; the rest
  // stay 'todo' so only one primary CTA is shown at a time.
  const steps: OnboardingStep[] = stepsOverride ?? buildSteps({
    appetiteDone,
    channelsDone,
    submissionsDone,
    navigate,
  })

  // ── Self-gating ──
  if (!stepsOverride && !isInsurer) return null
  if (dismissed) return null
  const allComplete = steps.length > 0 && steps.every((s) => s.status === 'complete')
  if (allComplete) return null
  if (steps.length === 0) return null

  return (
    <PanelWrap>
      <OnboardingChecklist
        title="Finish setting up your account"
        subtitle="A few steps to start receiving and pricing submissions."
        steps={steps}
        onDismiss={handleDismiss}
      />
    </PanelWrap>
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
      onAction: () => navigate('/insurer/appetite'),
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
