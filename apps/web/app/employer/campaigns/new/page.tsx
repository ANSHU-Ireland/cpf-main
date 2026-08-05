'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../components/PageHeader';
import { Card } from '../../../components/Card';
import { apiClient, ApiError } from '../../../lib/api-client';

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

export default function NewCampaignPage(): React.JSX.Element {
  const headingId = useId();
  const nameId = useId();
  const roleId = useId();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const campaign = await apiClient.createCampaign(name.trim(), roleTitle.trim());
      router.push(`/employer/campaigns/${campaign.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create the campaign.');
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="New campaign"
        description={`Step ${String(step)} of 2. New campaigns start as drafts and cannot be activated until preflight checks pass.`}
      />
      <Card>
        {step === 1 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'calc(var(--space-unit) * 4)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(var(--space-unit) * 2)',
              }}
            >
              <label htmlFor={nameId} style={{ fontWeight: 600 }}>
                Campaign name
              </label>
              <input
                id={nameId}
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={fieldStyle}
              />
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(var(--space-unit) * 2)',
              }}
            >
              <label htmlFor={roleId} style={{ fontWeight: 600 }}>
                Role title
              </label>
              <input
                id={roleId}
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                style={fieldStyle}
              />
            </div>
            <div>
              <Button
                disabled={name.trim().length < 2 || roleTitle.trim().length < 2}
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'calc(var(--space-unit) * 4)',
            }}
          >
            <div>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.05rem' }}>Review</h2>
              <p style={{ margin: 0, color: 'var(--color-muted)' }}>
                <strong>{name}</strong> — {roleTitle}
              </p>
              <p style={{ margin: '8px 0 0', color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                You will resolve reviewer coverage, DPIA and other preflight checks before this
                campaign can go live.
              </p>
            </div>
            {error ? (
              <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                {error}
              </p>
            ) : null}
            <div style={{ display: 'flex', gap: 'calc(var(--space-unit) * 3)', flexWrap: 'wrap' }}>
              <Button variant="secondary" disabled={busy} onClick={() => setStep(1)}>
                Back
              </Button>
              <Button disabled={busy} onClick={() => void create()}>
                {busy ? 'Creating…' : 'Create campaign'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
