'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, InvitationStatus, InvitationView } from '../../lib/types';

const TONE: Record<InvitationStatus, BadgeTone> = {
  draft: 'neutral',
  sent: 'info',
  accepted: 'success',
  expired: 'warning',
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

function formatDate(iso: string | null): string {
  return iso === null ? '—' : new Date(iso).toLocaleDateString('en-GB', { dateStyle: 'medium' });
}

export default function InvitationsPage(): React.JSX.Element {
  const headingId = useId();
  const emailId = useId();
  const campId = useId();
  const load = useCallback(() => apiClient.getInvitations(), []);
  const { state, reload, setData } = useAsync<Collection<InvitationView>>(load);
  const [email, setEmail] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(current: Collection<InvitationView>): Promise<void> {
    if (!email.includes('@') || campaignName.trim().length < 2) {
      setError('A valid email and campaign are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const inv = await apiClient.sendInvitation(email.trim(), campaignName.trim());
      setData({ items: [inv, ...current.items], total: current.total + 1 });
      setEmail('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send the invitation.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Invitations"
        description="Assessment invitations sent to candidates and their current status."
      />
      <AsyncBoundary state={state} onRetry={reload} label="invitations">
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
                <div style={{ flex: '1 1 200px' }}>
                  <label htmlFor={emailId} style={{ fontWeight: 600, display: 'block' }}>
                    Candidate email
                  </label>
                  <input
                    id={emailId}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                <Button disabled={busy} onClick={() => void send(data)}>
                  Send invitation
                </Button>
              </div>
              {error ? (
                <p role="alert" style={{ margin: '12px 0 0', color: 'var(--color-red)' }}>
                  {error}
                </p>
              ) : null}
            </Card>
            {data.items.map((inv) => (
              <Card key={inv.id} as="article" aria-label={inv.email}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{inv.email}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {inv.campaignName} · sent {formatDate(inv.sentAt)}
                    </p>
                  </div>
                  <StatusBadge tone={TONE[inv.status]}>{inv.status}</StatusBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
