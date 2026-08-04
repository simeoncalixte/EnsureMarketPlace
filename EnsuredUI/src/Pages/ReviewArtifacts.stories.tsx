import React, { useEffect, useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { getApiBase } from '../lib/api';

type ArtifactKey = 'call-graph' | 'erd';

type ReviewArtifactFrameProps = {
  artifactKey: ArtifactKey;
  title: string;
  description: string;
};

type LoadState =
  | { status: 'checking' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

function resolveReviewUrl(artifactKey: ArtifactKey): string {
  return `${getApiBase()}/api/review/${artifactKey}`;
}

function ReviewArtifactFrame({ artifactKey, title, description }: ReviewArtifactFrameProps) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'checking' });
  const reviewUrl = useMemo(() => resolveReviewUrl(artifactKey), [artifactKey]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadState({ status: 'checking' });

    fetch(reviewUrl, {
      method: 'GET',
      headers: { Accept: 'text/html' },
      signal: controller.signal,
    })
      .then(async (response) => {
        const contentType = response.headers.get('content-type') ?? '';
        if (!response.ok) {
          throw new Error(`Review artifact returned ${response.status} ${response.statusText || ''}`.trim());
        }
        if (!contentType.includes('text/html')) {
          throw new Error(`Review artifact returned ${contentType || 'an unknown content type'} instead of text/html.`);
        }
        setLoadState({ status: 'ready' });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        const detail = error instanceof Error ? error.message : 'Unknown load failure.';
        setLoadState({
          status: 'error',
          message: `Could not load ${title}. Start the EnsuredAPI server, regenerate the artifact if needed, and confirm ${reviewUrl} is reachable. ${detail}`,
        });
      });

    return () => {
      controller.abort();
    };
  }, [reviewUrl, title]);

  return (
    <main style={styles.shell}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Review artifact</p>
          <h1 style={styles.title}>{title}</h1>
          <p style={styles.description}>{description}</p>
        </div>
        <a href={reviewUrl} target="_blank" rel="noreferrer" style={styles.link}>
          Open route
        </a>
      </header>

      {loadState.status === 'checking' ? (
        <section style={styles.messagePanel} role="status" aria-live="polite">
          Checking {reviewUrl}
        </section>
      ) : null}

      {loadState.status === 'error' ? (
        <section style={styles.errorPanel} role="alert">
          <strong>Unable to display review artifact.</strong>
          <span>{loadState.message}</span>
        </section>
      ) : null}

      {loadState.status === 'ready' ? (
        <iframe title={title} src={reviewUrl} style={styles.iframe} />
      ) : null}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    background: '#f6f8fa',
    color: '#0f172a',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 24,
    padding: '20px 24px',
    borderBottom: '1px solid #e3e8ef',
    background: '#ffffff',
  },
  eyebrow: {
    margin: '0 0 6px',
    color: '#64748b',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  title: {
    margin: 0,
    fontSize: 22,
    lineHeight: 1.2,
  },
  description: {
    margin: '8px 0 0',
    color: '#64748b',
    maxWidth: 760,
  },
  link: {
    flex: 'none',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    color: '#0f172a',
    fontWeight: 700,
    padding: '9px 12px',
    textDecoration: 'none',
    background: '#ffffff',
  },
  iframe: {
    width: '100%',
    height: '100%',
    minHeight: 720,
    border: 0,
    background: '#ffffff',
  },
  messagePanel: {
    margin: 24,
    alignSelf: 'start',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    background: '#ffffff',
    color: '#475569',
    padding: 16,
  },
  errorPanel: {
    margin: 24,
    alignSelf: 'start',
    display: 'grid',
    gap: 8,
    border: '1px solid #fca5a5',
    borderRadius: 8,
    background: '#fff7f7',
    color: '#991b1b',
    padding: 16,
  },
};

const meta: Meta<typeof ReviewArtifactFrame> = {
  title: 'Review/Architecture Artifacts',
  component: ReviewArtifactFrame,
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof ReviewArtifactFrame>;

export const CallGraph: Story = {
  args: {
    artifactKey: 'call-graph',
    title: 'Call Graph',
    description: 'Generated call graph for API routes, functions, model usages, and call edges.',
  },
};

export const EntityRelationshipDiagram: Story = {
  args: {
    artifactKey: 'erd',
    title: 'Entity Relationship Diagram',
    description: 'Generated ERD for database tables, fields, keys, and relationships.',
  },
};
