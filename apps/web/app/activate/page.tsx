'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input } from '@cpf/ui';
import { AuthCard } from '../components/AuthCard';

export default function ActivatePage(): React.JSX.Element {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const next: { name?: string; password?: string } = {};
    if (name.trim() === '') next.name = 'Enter your name.';
    if (password.length < 12) next.password = 'Use at least 12 characters.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSubmitting(true);
    router.push('/account/profile');
  }

  return (
    <AuthCard
      title="Activate your account"
      headingId="activate-heading"
      intro="You’ve been invited to the workspace. Set your name and a password to continue."
    >
      <form
        onSubmit={onSubmit}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
      >
        <Field label="Full name" required error={errors.name}>
          {({ id, invalid, describedBy }) => (
            <Input
              id={id}
              name="name"
              autoComplete="name"
              value={name}
              invalid={invalid}
              aria-describedby={describedBy}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Field>
        <Field label="Create a password" required error={errors.password}>
          {({ id, invalid, describedBy }) => (
            <Input
              id={id}
              type="password"
              autoComplete="new-password"
              value={password}
              invalid={invalid}
              aria-describedby={describedBy}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Activating…' : 'Activate account'}
        </Button>
      </form>
    </AuthCard>
  );
}
