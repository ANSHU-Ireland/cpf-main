'use client';

import { useId, useState } from 'react';
import { Button, Field, Input } from '@cpf/ui';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';

type ExportState = 'ready' | 'queued' | 'processing' | 'complete';

export default function AccountPrivacyPage(): React.JSX.Element {
  const headingId = useId();
  const [exportState, setExportState] = useState<ExportState>('ready');
  const [confirmation, setConfirmation] = useState('');
  const [deactivated, setDeactivated] = useState(false);

  function requestExport(): void {
    setExportState('queued');
    window.setTimeout(() => setExportState('processing'), 500);
    window.setTimeout(() => setExportState('complete'), 1200);
  }

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        headingId={headingId}
        title="Data export and deactivation"
        description="Exercise account export and deactivation controls."
      />
      <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 4)' }}>
        <Card aria-label="Record summary">
          <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem' }}>Record summary</h2>
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 20,
              margin: 0,
            }}
          >
            <div>
              <dt style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>Status</dt>
              <dd style={{ margin: '4px 0 0' }}>
                <StatusBadge tone={deactivated ? 'danger' : 'success'}>
                  {deactivated ? 'Deactivated' : 'Ready'}
                </StatusBadge>
              </dd>
            </div>
            <div>
              <dt style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>Owner</dt>
              <dd style={{ margin: '4px 0 0', fontWeight: 600 }}>All users</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>Last updated</dt>
              <dd style={{ margin: '4px 0 0', fontWeight: 600 }}>10 Aug 2026, 14:32</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>Reference</dt>
              <dd style={{ margin: '4px 0 0', fontWeight: 600 }}>ACC-05-2026-0042</dd>
            </div>
          </dl>
        </Card>

        <Card aria-label="Data export">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 20,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ maxWidth: '58ch' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.125rem' }}>Export your account data</h2>
              <p style={{ margin: 0, color: 'var(--color-muted)' }}>
                Create a portable archive of profile, preference, notice and audit records
                associated with this account.
              </p>
            </div>
            <Button
              disabled={exportState === 'queued' || exportState === 'processing'}
              onClick={requestExport}
            >
              {exportState === 'ready'
                ? 'Request export'
                : exportState === 'complete'
                  ? 'Request another export'
                  : 'Preparing export…'}
            </Button>
          </div>
          {exportState !== 'ready' ? (
            <p
              role="status"
              style={{
                margin: '16px 0 0',
                color: exportState === 'complete' ? 'var(--color-sage)' : 'var(--color-blue)',
                fontWeight: 600,
              }}
            >
              {exportState === 'complete'
                ? 'Export ready. A secure download notice has been created.'
                : `Export ${exportState}.`}
            </p>
          ) : null}
        </Card>

        <Card aria-label="Account deactivation">
          <h2 style={{ margin: '0 0 8px', fontSize: '1.125rem' }}>Deactivate account</h2>
          <p style={{ margin: '0 0 20px', color: 'var(--color-muted)' }}>
            Deactivation signs you out and prevents future access. Audit records are retained under
            the platform policy.
          </p>
          {deactivated ? (
            <p role="status" style={{ margin: 0, color: 'var(--color-red)', fontWeight: 600 }}>
              Account deactivation recorded.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              <Field
                label="Type DEACTIVATE to confirm"
                hint="This synthetic action is reversible when the page reloads."
              >
                {({ id, invalid, describedBy }) => (
                  <Input
                    id={id}
                    value={confirmation}
                    invalid={invalid}
                    aria-describedby={describedBy}
                    onChange={(event) => setConfirmation(event.target.value)}
                  />
                )}
              </Field>
              <div>
                <Button
                  variant="danger"
                  disabled={confirmation !== 'DEACTIVATE'}
                  onClick={() => setDeactivated(true)}
                >
                  Deactivate account
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
