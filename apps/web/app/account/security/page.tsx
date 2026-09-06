'use client';

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button, Field, Input } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { SecurityEventView, SecuritySeverity } from '../../lib/types';
import { passwordChangedEntry, safeWorkspace, WORKSPACE_NAMES } from '../../lib/workspace-entry';

const SEVERITY_TONE: Record<SecuritySeverity, BadgeTone> = {
  info: 'info',
  warning: 'warning',
  critical: 'danger',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function eventLabel(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function eventSeverity(event: SecurityEventView): SecuritySeverity {
  if (/blocked|denied|failed|locked/i.test(event.outcome)) return 'critical';
  if (/reset|revoked|changed|expired/i.test(`${event.eventType} ${event.outcome}`))
    return 'warning';
  return 'info';
}

export default function SecurityPage(): React.JSX.Element {
  const headingId = useId();
  const loader = useCallback(() => apiClient.getSecurityEvents(), []);
  const { state, reload } = useAsync(loader);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving'>('idle');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [resetRequired, setResetRequired] = useState(false);
  const [workspace, setWorkspace] = useState<string | undefined>();
  const passwordPending = useRef(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setResetRequired(query.get('passwordResetRequired') === 'true');
    setWorkspace(safeWorkspace(query.get('workspace')));
  }, []);

  async function changePassword(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (passwordPending.current) return;
    setPasswordError(null);
    if (currentPassword.length === 0) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (newPassword.length < 12) {
      setPasswordError('Use at least 12 characters for the new password.');
      return;
    }
    if (newPassword !== confirmation) {
      setPasswordError('The new password confirmation does not match.');
      return;
    }
    passwordPending.current = true;
    setPasswordStatus('saving');
    try {
      await apiClient.changePassword(currentPassword, newPassword);
      window.location.assign(passwordChangedEntry(workspace));
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Unable to change password.');
      setPasswordStatus('idle');
      passwordPending.current = false;
    }
  }

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Security and sessions"
        headingId={headingId}
        description="Review sessions and security events with revocation controls."
        actions={
          <Link
            href="/account/sessions"
            className="inline-flex min-h-target items-center rounded-control bg-blue px-5 py-3 font-semibold text-paper"
          >
            Manage signed-in devices
          </Link>
        }
      />
      {resetRequired ? (
        <section
          aria-labelledby="password-required-heading"
          className="mb-5 rounded-control border border-line bg-amber-soft p-5"
        >
          <h2 id="password-required-heading" className="m-0 text-lg font-semibold text-ink">
            Set your password to continue{workspace ? ` to ${WORKSPACE_NAMES[workspace]}` : ''}
          </h2>
          <p className="mb-0 mt-2 text-sm text-ink">
            You signed in with a temporary password. Choose a new password below, then sign in again
            with it. This signs out all sessions for this account. Your saved work is not deleted.
          </p>
        </section>
      ) : null}
      <Card>
        <form
          aria-label="Change account password"
          onSubmit={(event) => void changePassword(event)}
          className="grid max-w-xl gap-4"
        >
          <div>
            <h2 className="m-0 text-lg font-semibold text-ink">Change password</h2>
            <p className="mb-0 mt-2 text-sm text-muted">
              Seeded UAT accounts use a temporary password. Changing it signs out every active
              session so the new credential takes effect cleanly.
            </p>
          </div>
          {passwordError ? (
            <p role="alert" className="m-0 rounded-control bg-red-soft p-3 text-sm text-red">
              {passwordError}
            </p>
          ) : null}
          <Field label="Current password" required>
            {({ id, invalid, describedBy }) => (
              <Input
                id={id}
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                invalid={invalid}
                aria-describedby={describedBy}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            )}
          </Field>
          <Field label="New password" hint="At least 12 characters" required>
            {({ id, invalid, describedBy }) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                invalid={invalid}
                aria-describedby={describedBy}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            )}
          </Field>
          <Field label="Confirm new password" required>
            {({ id, invalid, describedBy }) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                value={confirmation}
                invalid={invalid}
                aria-describedby={describedBy}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            )}
          </Field>
          <div>
            <Button type="submit" disabled={passwordStatus === 'saving'}>
              {passwordStatus === 'saving' ? 'Changing password…' : 'Change password'}
            </Button>
          </div>
        </form>
      </Card>
      <h2 className="mb-3 mt-8 text-lg font-semibold text-ink">Recent security events</h2>
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="security activity"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No recent activity"
        emptyBody="There are no security events to show."
      >
        {(data) => (
          <Card padded={false} aria-label="Security events">
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {data.items.map((event, index) => (
                <li
                  key={event.id}
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 3)',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: 'calc(var(--space-unit) * 4)',
                    borderBlockStart: index === 0 ? 'none' : '1px solid var(--color-line)',
                  }}
                >
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-unit)' }}
                  >
                    <span>
                      {eventLabel(event.eventType)} · {eventLabel(event.outcome)}
                    </span>
                    <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                      {formatDate(event.occurredAt)}
                    </span>
                  </div>
                  <StatusBadge tone={SEVERITY_TONE[eventSeverity(event)]}>
                    {eventSeverity(event)}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </AsyncBoundary>
    </section>
  );
}
