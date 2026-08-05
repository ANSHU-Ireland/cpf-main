'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, ReviewerAdminStatus, ReviewerAdminView } from '../../lib/types';

const TONE: Record<ReviewerAdminStatus, BadgeTone> = {
  active: 'success',
  invited: 'info',
  training: 'purple',
  suspended: 'danger',
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

export default function ReviewersPage(): React.JSX.Element {
  const headingId = useId();
  const nameId = useId();
  const discId = useId();
  const load = useCallback(() => apiClient.getEmployerReviewers(), []);
  const { state, reload, setData } = useAsync<Collection<ReviewerAdminView>>(load);
  const [name, setName] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function invite(current: Collection<ReviewerAdminView>): Promise<void> {
    if (name.trim().length < 2 || discipline.trim().length < 2) {
      setError('A name and discipline are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const reviewer = await apiClient.inviteReviewer(name.trim(), discipline.trim());
      setData({ items: [...current.items, reviewer], total: current.total + 1 });
      setName('');
      setDiscipline('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not invite the reviewer.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Reviewers"
        description="Reviewers eligible to assess candidates for your campaigns, with their disciplines and load."
      />
      <AsyncBoundary state={state} onRetry={reload} label="reviewers">
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
                    Reviewer name
                  </label>
                  <input
                    id={nameId}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div style={{ flex: '1 1 160px' }}>
                  <label htmlFor={discId} style={{ fontWeight: 600, display: 'block' }}>
                    Discipline
                  </label>
                  <input
                    id={discId}
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <Button disabled={busy} onClick={() => void invite(data)}>
                  Invite reviewer
                </Button>
              </div>
              {error ? (
                <p role="alert" style={{ margin: '12px 0 0', color: 'var(--color-red)' }}>
                  {error}
                </p>
              ) : null}
            </Card>
            {data.items.map((r) => (
              <Card key={r.id} as="article" aria-label={r.name}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{r.name}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {r.disciplines.join(', ')} · {r.activeAssignments} active
                    </p>
                  </div>
                  <StatusBadge tone={TONE[r.status]}>{r.status}</StatusBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
