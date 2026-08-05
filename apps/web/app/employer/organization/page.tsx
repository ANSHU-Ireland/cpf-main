'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { EmployerOrgProfileView } from '../../lib/types';

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

export default function OrganizationPage(): React.JSX.Element {
  const headingId = useId();
  const load = useCallback(() => apiClient.getEmployerOrg(), []);
  const { state, reload, setData } = useAsync<EmployerOrgProfileView>(load);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Organisation profile"
        description="Details used across candidate-facing communications."
      />
      <AsyncBoundary state={state} onRetry={reload} label="organisation">
        {(org) => <OrgForm org={org} onSaved={setData} />}
      </AsyncBoundary>
    </div>
  );
}

function OrgForm({
  org,
  onSaved,
}: {
  org: EmployerOrgProfileView;
  onSaved: (next: EmployerOrgProfileView) => void;
}): React.JSX.Element {
  const displayId = useId();
  const legalId = useId();
  const tzId = useId();
  const emailId = useId();
  const [displayName, setDisplayName] = useState(org.displayName);
  const [legalName, setLegalName] = useState(org.legalName);
  const [defaultTimezone, setDefaultTimezone] = useState(org.defaultTimezone);
  const [supportEmail, setSupportEmail] = useState(org.supportEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDisplayName(org.displayName);
    setLegalName(org.legalName);
    setDefaultTimezone(org.defaultTimezone);
    setSupportEmail(org.supportEmail);
  }, [org]);

  async function save(): Promise<void> {
    if (displayName.trim().length < 2) {
      setError('A display name is required.');
      return;
    }
    if (!supportEmail.includes('@')) {
      setError('A valid support email is required.');
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const next = await apiClient.updateEmployerOrg({
        displayName: displayName.trim(),
        legalName: legalName.trim(),
        defaultTimezone: defaultTimezone.trim(),
        supportEmail: supportEmail.trim(),
      });
      onSaved(next);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the organisation profile.');
    } finally {
      setBusy(false);
    }
  }

  const rows: readonly { id: string; label: string; value: string; set: (v: string) => void }[] = [
    { id: displayId, label: 'Display name', value: displayName, set: setDisplayName },
    { id: legalId, label: 'Legal name', value: legalName, set: setLegalName },
    { id: tzId, label: 'Default timezone', value: defaultTimezone, set: setDefaultTimezone },
    { id: emailId, label: 'Support email', value: supportEmail, set: setSupportEmail },
  ];

  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}>
        {rows.map((row) => (
          <div
            key={row.id}
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 2)' }}
          >
            <label htmlFor={row.id} style={{ fontWeight: 600 }}>
              {row.label}
            </label>
            <input
              id={row.id}
              value={row.value}
              onChange={(e) => row.set(e.target.value)}
              style={fieldStyle}
            />
          </div>
        ))}
        {error ? (
          <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
            {error}
          </p>
        ) : null}
        {saved ? (
          <p role="status" style={{ margin: 0, color: 'var(--color-sage)' }}>
            Organisation profile saved.
          </p>
        ) : null}
        <div>
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
