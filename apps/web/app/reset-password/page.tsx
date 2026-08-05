'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button, Field, Input } from '@cpf/ui';
import { AuthCard } from '../components/AuthCard';

export default function ResetPasswordPage(): React.JSX.Element {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [done, setDone] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const next: { password?: string; confirm?: string } = {};
    if (password.length < 12) next.password = 'Use at least 12 characters.';
    if (confirm !== password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setDone(true);
  }

  if (done) {
    return (
      <AuthCard title="Password updated" headingId="reset-done-heading">
        <p role="status" style={{ margin: 0 }}>
          Your password has been changed. You can now sign in with your new password.
        </p>
        <p style={{ margin: 0 }}>
          <Link href="/sign-in">Go to sign in</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Choose a new password"
      headingId="reset-heading"
      intro="Your new password must be at least 12 characters."
    >
      <form
        onSubmit={onSubmit}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
      >
        <Field label="New password" required error={errors.password}>
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
        <Field label="Confirm new password" required error={errors.confirm}>
          {({ id, invalid, describedBy }) => (
            <Input
              id={id}
              type="password"
              autoComplete="new-password"
              value={confirm}
              invalid={invalid}
              aria-describedby={describedBy}
              onChange={(e) => setConfirm(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit">Update password</Button>
      </form>
    </AuthCard>
  );
}
