'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Field, Input } from '@cpf/ui';
import { AuthCard } from '../components/AuthCard';
import { apiClient, ApiError } from '../lib/api-client';

type Status = 'idle' | 'submitting';

const DEMO_PASSWORD = 'CPF-UAT-ChangeMe-2026!';
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
    email: 'platform.admin@cpf-uat.invalid',
    href: '/admin',
  },
  {
    label: 'Governance',
    description: 'AI systems, risk, conformity, incidents and post-market records.',
    email: 'governance@tenant-01.cpf-uat.invalid',
    href: '/governance',
  },
  {
    label: 'Operations',
    description: 'Service health, integration delivery and incident controls.',
    email: 'operations@tenant-01.cpf-uat.invalid',
    href: '/operations',
  },
  {
    label: 'Support',
    description: 'Support queue, case handling and justified access workflows.',
    email: 'support@tenant-01.cpf-uat.invalid',
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
      const { mfaRequired, passwordResetRequired, redirectTo } = await apiClient.signIn(
        nextEmail,
        nextPassword,
        workspace,
      );
      router.push(
        mfaRequired
          ? '/mfa'
          : passwordResetRequired
            ? '/account/security?passwordResetRequired=true'
            : (redirectTo ?? '/account/profile'),
      );
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
      intro="Choose a seeded UAT role, or enter any account from the generated credential manifest."
      maxWidth="1040px"
      footer={
        <span>
          Trouble signing in? <Link href="/forgot-password">Reset your password</Link>.
        </span>
      }
    >
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.8fr)]">
        <section aria-labelledby="demo-workspaces-heading">
          <div className="mb-4">
            <h2 id="demo-workspaces-heading" className="m-0 text-lg font-semibold text-ink">
              Open a demo workspace
            </h2>
            <p className="mb-0 mt-2 max-w-2xl text-sm text-muted">
              Pick the job you want to explore. All identities and records are fabricated for UAT;
              temporary passwords must be changed before live use.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DEMO_WORKSPACES.map((workspace) => (
              <button
                key={workspace.label}
                type="button"
                disabled={status === 'submitting'}
                onClick={() =>
                  void submitCredentials(workspace.email, DEMO_PASSWORD, workspace.href)
                }
                className="group min-h-28 rounded-control border border-line bg-paper p-4 text-left transition-colors hover:border-blue hover:bg-blue-soft disabled:cursor-wait"
              >
                <strong className="mb-2 block text-sm font-semibold text-blue group-hover:underline">
                  {workspace.label}
                </strong>
                <span className="block text-sm leading-5 text-muted">{workspace.description}</span>
              </button>
            ))}
          </div>
        </section>
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-4 rounded-surface border border-line bg-soft p-6"
        >
          <div>
            <h2 className="m-0 text-lg font-semibold text-ink">Use credentials</h2>
            <p className="mb-0 mt-2 text-sm text-muted">
              Shared UAT password: <strong className="text-ink">{DEMO_PASSWORD}</strong>
            </p>
          </div>
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
          <Button type="submit" disabled={status === 'submitting'} style={{ width: '100%' }}>
            {status === 'submitting' ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </AuthCard>
  );
}
