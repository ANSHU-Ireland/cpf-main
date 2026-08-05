'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Field, Input } from '@cpf/ui';
import { AuthCard } from '../components/AuthCard';
import { apiClient, ApiError } from '../lib/api-client';

type Status = 'idle' | 'submitting';

export default function SignInPage(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextFieldErrors: { email?: string; password?: string } = {};
    if (!email.includes('@')) nextFieldErrors.email = 'Enter a valid email address.';
    if (password.length < 8) nextFieldErrors.password = 'Enter your password.';
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;

    setStatus('submitting');
    setFormError(null);
    try {
      const { mfaRequired } = await apiClient.signIn(email, password);
      router.push(mfaRequired ? '/mfa' : '/account/profile');
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Unable to sign in. Please try again.';
      setFormError(message);
      setStatus('idle');
    }
  }

  return (
    <AuthCard
      title="Sign in"
      headingId="signin-heading"
      intro="Use your workspace credentials to continue."
      footer={
        <span>
          Trouble signing in? <Link href="/forgot-password">Reset your password</Link>.
        </span>
      }
    >
      <form
        onSubmit={onSubmit}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
      >
        {formError ? (
          <p
            role="alert"
            style={{
              margin: 0,
              padding: 'calc(var(--space-unit) * 2) calc(var(--space-unit) * 3)',
              background: 'var(--color-red-soft)',
              color: 'var(--color-red)',
              borderRadius: 'var(--radius-control)',
            }}
          >
            {formError}
          </p>
        ) : null}
        <Field label="Email" required error={fieldErrors.email}>
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
        <Field label="Password" required error={fieldErrors.password}>
          {({ id, invalid, describedBy }) => (
            <Input
              id={id}
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              invalid={invalid}
              aria-describedby={describedBy}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthCard>
  );
}
