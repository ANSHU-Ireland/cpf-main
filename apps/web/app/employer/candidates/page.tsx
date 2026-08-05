'use client';

import { useCallback, useId, useState } from 'react';
import Link from 'next/link';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { CandidateDirStatus, Collection, EmployerCandidateView } from '../../lib/types';

const TONE: Record<CandidateDirStatus, BadgeTone> = {
  active: 'success',
  invited: 'info',
  withdrawn: 'neutral',
  merged: 'neutral',
};

const fieldStyle: React.CSSProperties = {
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-line)',
  padding: 'calc(var(--space-unit) * 2) calc(var(--space-unit) * 3)',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  color: 'var(--color-ink)',
  background: 'var(--color-paper)',
  width: '100%',
  boxSizing: 'border-box',
};

const linkStyle: React.CSSProperties = {
  color: 'var(--color-blue)',
  fontWeight: 600,
  textDecoration: 'none',
};

export default function CandidatesPage(): React.JSX.Element {
  const headingId = useId();
  const nameId = useId();
  const campId = useId();
  const load = useCallback(() => apiClient.getEmployerCandidates(), []);
  const { state, reload, setData } = useAsync<Collection<EmployerCandidateView>>(load);
  const [displayName, setDisplayName] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(current: Collection<EmployerCandidateView>): Promise<void> {
    if (displayName.trim().length < 2 || campaignName.trim().length < 2) {
      setError('A candidate name and campaign are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const candidate = await apiClient.addEmployerCandidate(
        displayName.trim(),
        campaignName.trim(),
      );
      setData({ items: [...current.items, candidate], total: current.total + 1 });
      setDisplayName('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add the candidate.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Candidates"
        description="Candidates are shown by pseudonymous reference. (Note: this directory's API contract is a known baseline gap.)"
      />
      <div>
        <Link href="/employer/candidates/import" style={linkStyle}>
          Import candidates
        </Link>
      </div>
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="candidates"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No candidates"
        emptyBody="Add or import candidates to get started."
      >
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card>
              <div
                style={{
                  display: 'flex',
                  gap: 'calc(var(--space-unit) * 3)',
                  flexWrap: 'wrap',
                  alignItems: 'flex-end',
                }}
              >
                <div style={{ flex: '1 1 180px' }}>
                  <label htmlFor={nameId} style={{ fontWeight: 600, display: 'block' }}>
                    Candidate name
                  </label>
                  <input
                    id={nameId}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div style={{ flex: '1 1 180px' }}>
                  <label htmlFor={campId} style={{ fontWeight: 600, display: 'block' }}>
                    Campaign
                  </label>
                  <input
                    id={campId}
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <Button disabled={busy} onClick={() => void add(data)}>
                  Add candidate
                </Button>
              </div>
              {error ? (
                <p role="alert" style={{ margin: '12px 0 0', color: 'var(--color-red)' }}>
                  {error}
                </p>
              ) : null}
            </Card>
            {data.items.map((c) => (
              <Card key={c.id} as="article" aria-label={c.reference}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{c.reference}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {c.campaignName} · {c.applicationCount} application(s)
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <StatusBadge tone={TONE[c.status]}>{c.status}</StatusBadge>
                    <Link href={`/employer/candidates/${c.id}`} style={linkStyle}>
                      Open
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
