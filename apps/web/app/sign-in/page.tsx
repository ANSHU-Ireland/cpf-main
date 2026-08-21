'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Field, Input } from '@cpf/ui';
import { AuthCard } from '../components/AuthCard';
import { apiClient, ApiError } from '../lib/api-client';

type Status = 'idle' | 'submitting';

const DEMO_PASSWORD = 'CPF-DEMO-2026';
const DEMO_WORKSPACES = [
  {
    label: 'Candidate',
    description: 'Applications, scheduling, notices, assessment runtime and data rights.',
    email: 'candidate.one@northstar.invalid',
    href: '/candidate',
  },
  {
    label: 'Reviewer',
    description: 'Assignment queue, evidence review, rubric scoring and submission.',
    email: 'reviewer@northstar.invalid',
    href: '/review',
  },
  {
    label: 'Employer',
    description: 'Campaigns, candidates, invitations, decisions and reporting.',
    email: 'admin@northstar.invalid',
    href: '/employer',
  },
  {
    label: 'Platform admin',
    description: 'Tenants, models, assessments, jobs, audit and privileged access.',
    email: 'admin@northstar.invalid',
    href: '/admin',
  },
  {
    label: 'Governance',
    description: 'AI systems, risk, conformity, incidents and post-market records.',
    email: 'admin@northstar.invalid',
    href: '/governance',
  },
  {
    label: 'Operations',
    description: 'Service health, integration delivery and incident controls.',
    email: 'admin@northstar.invalid',
    href: '/operations',
  },
  {
    label: 'Support',
    description: 'Support queue, case handling and justified access workflows.',
    email: 'admin@northstar.invalid',
    href: '/support',
  },
] as const;

export default function SignInPage(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  async function submitCredentials(
    nextEmail: string,
    nextPassword: string,
    workspace?: string,
  ): Promise<void> {
    setStatus('submitting');
    setFormError(null);
    try {
      const { mfaRequired, redirectTo } = await apiClient.signIn(
        nextEmail,
        nextPassword,
        workspace,
      );
      router.push(mfaRequired ? '/mfa' : (redirectTo ?? '/account/profile'));
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Unable to sign in. Please try again.';
      setFormError(message);
      setStatus('idle');
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextFieldErrors: { email?: string; password?: string } = {};
    if (!email.includes('@')) nextFieldErrors.email = 'Enter a valid email address.';
    if (password.length < 8) nextFieldErrors.password = 'Enter your password.';
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;

    await submitCredentials(email, password);
  }

  return (
    <AuthCard
      title="Sign in"
      headingId="signin-heading"
      intro="Choose a synthetic role for the click-through demo, or enter one of the demo accounts."
      footer={
        <span>
          Trouble signing in? <Link href="/forgot-password">Reset your password</Link>.
        </span>
      }
    >
      <section aria-labelledby="demo-workspaces-heading" style={{ marginBottom: 28 }}>
        <h2 id="demo-workspaces-heading" style={{ margin: '0 0 8px', fontSize: 18 }}>
          Open a demo workspace
        </h2>
        <p style={{ margin: '0 0 16px', color: 'var(--color-muted)', fontSize: 13 }}>
          All identities and records are fabricated. Shared password:{' '}
          <strong>{DEMO_PASSWORD}</strong>
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 10,
          }}
        >
          {DEMO_WORKSPACES.map((workspace) => (
            <button
              key={workspace.label}
              type="button"
              disabled={status === 'submitting'}
              onClick={() => void submitCredentials(workspace.email, DEMO_PASSWORD, workspace.href)}
              style={{
                minHeight: 96,
                padding: 14,
                textAlign: 'left',
                border: '1px solid var(--color-line)',
                borderRadius: 'var(--radius-control)',
                background: 'var(--color-paper)',
                color: 'var(--color-ink)',
                cursor: status === 'submitting' ? 'wait' : 'pointer',
              }}
            >
              <strong style={{ display: 'block', color: 'var(--color-blue)', marginBottom: 6 }}>
                {workspace.label}
              </strong>
              <span style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--color-muted)' }}>
                {workspace.description}
              </span>
            </button>
          ))}
        </div>
      </section>
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
              placeholder="admin@northstar.invalid"
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
              placeholder={DEMO_PASSWORD}
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
