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
import type { AssessmentStatus, AssessmentView, Collection, RiskTier } from '../../lib/types';

const TONE: Record<AssessmentStatus, BadgeTone> = {
  draft: 'neutral',
  in_review: 'info',
  active: 'success',
  suspended: 'warning',
  retired: 'neutral',
};

const RISK_TONE: Record<RiskTier, BadgeTone> = {
  minimal: 'neutral',
  limited: 'info',
  high: 'warning',
};

const TIERS: readonly RiskTier[] = ['minimal', 'limited', 'high'];

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

export default function AssessmentsPage(): React.JSX.Element {
  const headingId = useId();
  const nameId = useId();
  const roleId = useId();
  const tierId = useId();
  const searchId = useId();
  const load = useCallback(() => apiClient.getAssessments(), []);
  const { state, reload, setData } = useAsync<Collection<AssessmentView>>(load);
  const [name, setName] = useState('');
  const [roleFamily, setRoleFamily] = useState('');
  const [tier, setTier] = useState<RiskTier>('limited');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(current: Collection<AssessmentView>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const created = await apiClient.createAssessment(name.trim(), roleFamily.trim(), tier);
      setData({ items: [created, ...current.items], total: current.total + 1 });
      setName('');
      setRoleFamily('');
      setTier('limited');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create the assessment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Assessment catalogue"
        description="Find assessments by owner, status, role family and risk. No AI output on this surface."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="assessments"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No assessments yet"
        emptyBody="Create the first assessment to begin."
      >
        {(data) => {
          const filtered = data.items.filter((a) =>
            `${a.name} ${a.owner} ${a.roleFamily}`
              .toLowerCase()
              .includes(query.trim().toLowerCase()),
          );
          return (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(var(--space-unit) * 4)',
              }}
            >
              <Card as="section" aria-label="Create assessment">
                <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Create assessment</h2>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'calc(var(--space-unit) * 3)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label htmlFor={nameId} style={{ fontWeight: 600 }}>
                      Display name
                    </label>
                    <input
                      id={nameId}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={fieldStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label htmlFor={roleId} style={{ fontWeight: 600 }}>
                      Role family
                    </label>
                    <input
                      id={roleId}
                      value={roleFamily}
                      onChange={(e) => setRoleFamily(e.target.value)}
                      style={fieldStyle}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label htmlFor={tierId} style={{ fontWeight: 600 }}>
                      Risk tier
                    </label>
                    <select
                      id={tierId}
                      value={tier}
                      onChange={(e) => setTier(e.target.value as RiskTier)}
                      style={fieldStyle}
                    >
                      {TIERS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  {error ? (
                    <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                      {error}
                    </p>
                  ) : null}
                  <div>
                    <Button
                      disabled={busy || name.trim().length < 2 || roleFamily.trim().length < 2}
                      onClick={() => void create(data)}
                    >
                      {busy ? 'Creating…' : 'Create assessment'}
                    </Button>
                  </div>
                </div>
              </Card>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label htmlFor={searchId} style={{ fontWeight: 600 }}>
                  Search
                </label>
                <input
                  id={searchId}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Owner, status, role family or risk"
                  style={fieldStyle}
                />
              </div>
              {filtered.map((a) => (
                <Card key={a.id} as="article" aria-label={a.name}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 'calc(var(--space-unit) * 2)',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{a.name}</h2>
                      <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                        {a.roleFamily} · {a.owner} · updated{' '}
                        {new Date(a.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <StatusBadge tone={RISK_TONE[a.riskTier]}>{`${a.riskTier} risk`}</StatusBadge>
                      <StatusBadge tone={TONE[a.status]}>{a.status}</StatusBadge>
                    </div>
                  </div>
                  <div style={{ marginTop: 'calc(var(--space-unit) * 3)' }}>
                    <Link href={`/admin/assessments/${a.id}`} style={linkStyle}>
                      Open assessment
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
