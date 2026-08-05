'use client';

import { useCallback, useId } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '../../../components/PageHeader';
import { Card } from '../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../components/StatusBadge';
import { AsyncBoundary } from '../../../components/AsyncBoundary';
import { apiClient } from '../../../lib/api-client';
import { useAsync } from '../../../lib/useAsync';
import type { CandidateDirStatus, CandidateRecordView } from '../../../lib/types';

const TONE: Record<CandidateDirStatus, BadgeTone> = {
  active: 'success',
  invited: 'info',
  withdrawn: 'neutral',
  merged: 'neutral',
};

const linkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 'var(--target-min)',
  padding: '0 calc(var(--space-unit) * 4)',
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-blue)',
  color: 'var(--color-blue)',
  textDecoration: 'none',
  fontWeight: 600,
};

export default function CandidateDetailPage(): React.JSX.Element {
  const headingId = useId();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const load = useCallback(() => apiClient.getEmployerCandidate(id), [id]);
  const { state, reload } = useAsync<CandidateRecordView>(load);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Candidate record"
        description="Operational record only. Clinical accommodation detail is segregated and not shown here."
      />
      <AsyncBoundary state={state} onRetry={reload} label="candidate">
        {(c) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card>
              <div
                style={{
                  display: 'flex',
                  gap: 'calc(var(--space-unit) * 2)',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{c.reference}</h2>
                  <p style={{ margin: 0, color: 'var(--color-muted)' }}>{c.email}</p>
                </div>
                <StatusBadge tone={TONE[c.status]}>{c.status}</StatusBadge>
              </div>
              <p style={{ margin: '12px 0 0', color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                {c.accommodationsNote}
              </p>
              <div style={{ marginTop: 'calc(var(--space-unit) * 4)' }}>
                <Link href={`/employer/candidates/${id}/merge`} style={linkStyle}>
                  Merge duplicate
                </Link>
              </div>
            </Card>
            <Card>
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Applications</h2>
              {c.applications.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--color-muted)' }}>No applications on file.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--color-muted)' }}>
                  {c.applications.map((app) => (
                    <li key={app.id}>
                      {app.campaignName} — {app.status}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
