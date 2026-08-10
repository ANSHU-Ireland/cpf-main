'use client';

import { useId, useState, type FormEvent } from 'react';
import { Button, Field, Input } from '@cpf/ui';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';

type ChallengeState = 'idle' | 'sent' | 'verified';

export default function AccountEmailPage(): React.JSX.Element {
  const headingId = useId();
  const [email, setEmail] = useState('alex.morgan@example.com');
  const [pendingEmail, setPendingEmail] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<ChallengeState>('idle');

  function requestChange(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (pendingEmail.trim() === '') return;
    setChallenge('sent');
    setCode('');
  }

  function verify(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (code.trim().length < 6) return;
    setEmail(pendingEmail);
    setPendingEmail('');
    setChallenge('verified');
  }

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        headingId={headingId}
        title="Email verification and change"
        description="Verify or change the account email through a signed challenge."
      />
      <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 4)' }}>
        <Card aria-label="Current email">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'calc(var(--space-unit) * 3)',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                Current email
              </p>
              <p style={{ margin: '4px 0 0', fontWeight: 600 }}>{email}</p>
            </div>
            <StatusBadge tone="success">Verified</StatusBadge>
          </div>
        </Card>

        <Card aria-label="Change email">
          <h2 style={{ margin: '0 0 8px', fontSize: '1.125rem' }}>Change email</h2>
          <p style={{ margin: '0 0 20px', color: 'var(--color-muted)' }}>
            We will send a six-digit challenge to the new address before making the change.
          </p>
          <form
            onSubmit={requestChange}
            style={{ display: 'grid', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Field label="New email address" required>
              {({ id, invalid, describedBy }) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="email"
                  required
                  value={pendingEmail}
                  invalid={invalid}
                  aria-describedby={describedBy}
                  onChange={(event) => {
                    setPendingEmail(event.target.value);
                    setChallenge('idle');
                  }}
                />
              )}
            </Field>
            <div>
              <Button type="submit" disabled={pendingEmail.trim() === ''}>
                Send verification challenge
              </Button>
            </div>
          </form>
        </Card>

        {challenge === 'sent' ? (
          <Card aria-label="Verify challenge">
            <h2 style={{ margin: '0 0 8px', fontSize: '1.125rem' }}>Verify the new address</h2>
            <p style={{ margin: '0 0 20px', color: 'var(--color-muted)' }}>
              Challenge sent to {pendingEmail}. For this synthetic build, any six characters verify.
            </p>
            <form onSubmit={verify} style={{ display: 'grid', gap: 'calc(var(--space-unit) * 4)' }}>
              <Field label="Verification code" required hint="Enter the six-digit challenge.">
                {({ id, invalid, describedBy }) => (
                  <Input
                    id={id}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={code}
                    invalid={invalid}
                    aria-describedby={describedBy}
                    onChange={(event) => setCode(event.target.value)}
                  />
                )}
              </Field>
              <div>
                <Button type="submit" disabled={code.trim().length < 6}>
                  Verify email
                </Button>
              </div>
            </form>
          </Card>
        ) : null}

        {challenge === 'verified' ? (
          <p role="status" style={{ margin: 0, color: 'var(--color-sage)', fontWeight: 600 }}>
            Email verified and updated.
          </p>
        ) : null}
      </div>
    </section>
  );
}
