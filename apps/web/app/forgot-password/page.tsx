'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button, Field, Input } from '@cpf/ui';
import { AuthCard } from '../components/AuthCard';

export default function ForgotPasswordPage(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    // Neutral response prevents account enumeration regardless of whether the address exists.
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard title="Check your email" headingId="forgot-sent-heading">
        <p role="status" style={{ margin: 0 }}>
          If an account exists for <strong>{email}</strong>, we’ve sent a link to reset your
          password. The link expires in 30 minutes.
        </p>
        <p style={{ margin: 0 }}>
          <Link href="/sign-in">Back to sign in</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      headingId="forgot-heading"
      intro="Enter your email and we’ll send you a reset link."
      footer={<Link href="/sign-in">Back to sign in</Link>}
    >
      <form
        onSubmit={onSubmit}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
      >
        <Field label="Email" required error={error ?? undefined}>
          {({ id, invalid, describedBy }) => (
            <Input
              id={id}
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              invalid={invalid}
              aria-describedby={describedBy}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit">Send reset link</Button>
      </form>
    </AuthCard>
  );
}
