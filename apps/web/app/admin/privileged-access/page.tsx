'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { AccessGrantStatus, AccessGrantView, Collection } from '../../lib/types';

const TONE: Record<AccessGrantStatus, BadgeTone> = {
  requested: 'info',
  approved: 'info',
  active: 'success',
  expired: 'neutral',
  revoked: 'danger',
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

function fmt(iso: string | null): string {
  return iso === null ? '—' : new Date(iso).toLocaleString();
}

export default function PrivilegedAccessPage(): React.JSX.Element {
  const headingId = useId();
  const scopeId = useId();
  const justId = useId();
  const load = useCallback(() => apiClient.getAccessGrants(), []);
  const { state, reload, setData } = useAsync<Collection<AccessGrantView>>(load);
  const [scope, setScope] = useState('');
  const [justification, setJustification] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestGrant(current: Collection<AccessGrantView>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const created = await apiClient.requestAccessGrant(scope.trim(), justification.trim());
      setData({ items: [created, ...current.items], total: current.total + 1 });
      setScope('');
      setJustification('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not request the grant.');
    } finally {
      setBusy(false);
    }
  }

  async function act(
    current: Collection<AccessGrantView>,
    id: string,
    action: 'approve' | 'revoke',
  ): Promise<void> {
    setBusyId(id);
    setError(null);
    try {
      const updated = await apiClient.actOnAccessGrant(id, action);
      setData({
        items: current.items.map((g) => (g.id === updated.id ? updated : g)),
        total: current.total,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update the grant.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Privileged access grant"
        description="Create time-bound, justified, approved and visible JIT access. No AI output on this surface."
      />
      <Card as="section" aria-label="Human authority checkpoint">
        <div
          style={{
            borderLeft: '3px solid var(--color-amber)',
            paddingLeft: 'calc(var(--space-unit) * 3)',
          }}
        >
          <h2 style={{ margin: '0 0 4px', fontSize: '1rem' }}>Human authority checkpoint</h2>
          <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            An authorised approver grants time-bound access. There is no silent impersonation —
            every grant is justified, approved and visible in the audit trail.
          </p>
        </div>
      </Card>
      <AsyncBoundary state={state} onRetry={reload} label="access grants">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card as="section" aria-label="Request grant">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Request grant</h2>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 3)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'calc(var(--space-unit) * 1)',
                  }}
                >
                  <label htmlFor={scopeId} style={{ fontWeight: 600 }}>
                    Scope
                  </label>
                  <input
                    id={scopeId}
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    placeholder="tenant:acme read-only"
                    style={fieldStyle}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'calc(var(--space-unit) * 1)',
                  }}
                >
                  <label htmlFor={justId} style={{ fontWeight: 600 }}>
                    Justification
                  </label>
                  <textarea
                    id={justId}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    rows={3}
                    placeholder="Explain why this access is needed and link the ticket."
                    style={fieldStyle}
                  />
                </div>
                {error ? (
                  <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                    {error}
                  </p>
                ) : null}
                <div>
                  <Button
                    disabled={busy || scope.trim().length < 2 || justification.trim().length < 12}
                    onClick={() => void requestGrant(data)}
                  >
                    {busy ? 'Requesting…' : 'Request grant'}
                  </Button>
                </div>
              </div>
            </Card>
            {data.items.map((g) => (
              <Card key={g.id} as="article" aria-label={g.scope}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: '1 1 260px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{g.scope}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {g.requester} · {g.justification}
                    </p>
                    <p
                      style={{
                        margin: '4px 0 0',
                        color: 'var(--color-muted)',
                        fontSize: '0.85rem',
                      }}
                    >
                      Expires {fmt(g.expiresAt)}
                      {g.approver !== null ? ` · approved by ${g.approver}` : ''}
                    </p>
                  </div>
                  <StatusBadge tone={TONE[g.status]}>{g.status}</StatusBadge>
                </div>
                {g.status === 'requested' || g.status === 'active' ? (
                  <div
                    style={{
                      marginTop: 'calc(var(--space-unit) * 3)',
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {g.status === 'requested' ? (
                      <Button
                        variant="secondary"
                        disabled={busyId === g.id}
                        onClick={() => void act(data, g.id, 'approve')}
                      >
                        {busyId === g.id ? 'Working…' : 'Approve (time-bound)'}
                      </Button>
                    ) : null}
                    <Button
                      variant="danger"
                      disabled={busyId === g.id}
                      onClick={() => void act(data, g.id, 'revoke')}
                    >
                      Revoke
                    </Button>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
