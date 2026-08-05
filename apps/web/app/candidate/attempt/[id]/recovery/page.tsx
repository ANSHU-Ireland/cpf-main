'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../../components/StatusBadge';
import { apiClient } from '../../../../lib/api-client';

type RecoveryState = 'offline' | 'reconnecting' | 'checksum_conflict' | 'recovered';

const STATE_META: Record<RecoveryState, { tone: BadgeTone; label: string; body: string }> = {
  offline: {
    tone: 'danger',
    label: 'Offline',
    body: 'Your connection dropped. Your last saved work is safe on the server. Nothing you have submitted is lost.',
  },
  reconnecting: {
    tone: 'warning',
    label: 'Reconnecting',
    body: 'Re-establishing a secure connection and reconciling your latest autosave with the server.',
  },
  checksum_conflict: {
    tone: 'warning',
    label: 'Checksum conflict',
    body: 'The server copy is newer than this device. We will keep the server copy to avoid overwriting saved work.',
  },
  recovered: {
    tone: 'success',
    label: 'Recovered',
    body: 'You are back in sync. You can safely resume your assessment where you left off.',
  },
};

export default function RecoveryPage({ params }: { params: { id: string } }): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const router = useRouter();
  const [recovery, setRecovery] = useState<RecoveryState>('offline');
  const [busy, setBusy] = useState(false);

  async function resume(): Promise<void> {
    setBusy(true);
    setRecovery('reconnecting');
    try {
      await apiClient.getAttempt(id);
      setRecovery('recovered');
    } catch {
      setRecovery('offline');
    } finally {
      setBusy(false);
    }
  }

  const meta = STATE_META[recovery];

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Incident and recovery"
        headingId={headingId}
        description="Recover from a connectivity or service incident without losing work."
      />
      <Card as="article" aria-label="Recovery status">
        <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 3)' }}>
          <div>
            <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
          </div>
          <p role="status" style={{ margin: 0 }}>
            {meta.body}
          </p>
          <div style={{ display: 'flex', gap: 'calc(var(--space-unit) * 2)', flexWrap: 'wrap' }}>
            {recovery === 'recovered' ? (
              <Button onClick={() => router.push(`/candidate/attempt/${id}`)}>
                Return to assessment
              </Button>
            ) : (
              <Button disabled={busy} onClick={() => void resume()}>
                {busy ? 'Reconnecting…' : 'Resume safely'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}
