/**
 * Shared formatting + priority helpers for the backend-configured submission
 * boards (the underwriting queue and the pipeline-processing Kanban).
 *
 * These were originally defined inline in `routes/underwritingSubmissions.ts`;
 * they are extracted here so the pipeline board (`pipeline/board/service.ts`)
 * can reuse the exact same logic instead of duplicating it.
 */

export type SubmissionPriority = 'urgent' | 'high' | 'normal';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function humanize(value: string | null | undefined): string {
  if (!value) {
    return 'Unspecified';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatRelativeTime(dateLike: Date | string | null | undefined): string {
  if (!dateLike) {
    return 'Recently';
  }

  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function normalizeScore(score: unknown): number | null {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  if (numeric > 1) {
    return Math.max(0, Math.min(1, numeric / 100));
  }

  return Math.max(0, Math.min(1, numeric));
}

export function computePriority(args: { triageScore?: unknown; premium: number; exposure: number; status: string }): SubmissionPriority {
  const normalizedScore = normalizeScore(args.triageScore);
  if (normalizedScore !== null) {
    if (normalizedScore <= 0.35) {
      return 'urgent';
    }

    if (normalizedScore <= 0.65) {
      return 'high';
    }
  }

  if (args.status === 'submitted' || args.status === 'draft') {
    if (args.premium >= 12000000 || args.exposure >= 220000000) {
      return 'urgent';
    }

    if (args.premium >= 6000000 || args.exposure >= 120000000) {
      return 'high';
    }
  }

  if (args.status === 'modeling' && (args.premium >= 8000000 || args.exposure >= 150000000)) {
    return 'high';
  }

  return 'normal';
}
