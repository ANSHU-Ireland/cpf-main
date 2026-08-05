'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input } from '@cpf/ui';
import { AuthCard } from '../components/AuthCard';

export default function MfaPage(): React.JSX.Element {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setError(null);
    setSubmitting(true);
    // Synthetic verification: any 6-digit code completes the demo challenge.
    router.push('/account/profile');
  }

  return (
    <AuthCard
      title="Two-factor authentication"
      headingId="mfa-heading"
      intro="Enter the 6-digit code from your authenticator app."
      footer={<span>In this demo, any 6-digit code is accepted.</span>}
    >
      <form
        onSubmit={onSubmit}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
      >
        <Field label="Authentication code" required error={error ?? undefined}>
          {({ id, invalid, describedBy }) => (
            <Input
              id={id}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              invalid={invalid}
              aria-describedby={describedBy}
              onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, ''))}
              style={{ letterSpacing: '0.4em', fontVariantNumeric: 'tabular-nums' }}
            />
          )}
        </Field>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Verifying…' : 'Verify'}
        </Button>
      </form>
    </AuthCard>
  );
}
