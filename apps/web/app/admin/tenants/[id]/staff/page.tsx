'use client';

import { useCallback, useId, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { Collection, StaffStatus, TenantStaffView } from '../../../../lib/types';

const TONE: Record<StaffStatus, BadgeTone> = {
  active: 'success',
  invited: 'info',
  suspended: 'warning',
};

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

const linkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 'var(--target-min)',
  padding: '0 calc(var(--space-unit) * 4)',
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-blue)',
  color: 'var(--color-blue)',
  textDecoration: 'none',
  fontWeight: 600,
};

export default function TenantStaffPage(): React.JSX.Element {
  const headingId = useId();
  const emailId = useId();
  const roleId = useId();
  const params = useParams<{ id: string }>();
  const load = useCallback(() => apiClient.getTenantStaff(params.id), [params.id]);
  const { state, reload, setData } = useAsync<Collection<TenantStaffView>>(load);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('recruiter');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function invite(current: Collection<TenantStaffView>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const created = await apiClient.inviteStaff(params.id, email.trim(), role.trim());
      setData({ items: [...current.items, created], total: current.total + 1 });
      setEmail('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not invite the staff member.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Tenant staff and roles"
        description="Manage tenant staff, roles and status from platform context. No AI output on this surface."
      />
      <AsyncBoundary state={state} onRetry={reload} label="staff">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card as="section" aria-label="Invite staff">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Invite staff</h2>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 3)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'calc(var(--space-unit) * 1)',
                  }}
                >
                  <label htmlFor={emailId} style={{ fontWeight: 600 }}>
                    Email
                  </label>
                  <input
                    id={emailId}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'calc(var(--space-unit) * 1)',
                  }}
                >
                  <label htmlFor={roleId} style={{ fontWeight: 600 }}>
                    Role
                  </label>
                  <select
                    id={roleId}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={fieldStyle}
                  >
                    <option value="employer_admin">Employer admin</option>
                    <option value="recruiter">Recruiter</option>
                    <option value="reviewer">Reviewer</option>
                  </select>
                </div>
                {error ? (
                  <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                    {error}
                  </p>
                ) : null}
                <div>
                  <Button
                    disabled={busy || email.trim().length < 3}
                    onClick={() => void invite(data)}
                  >
                    {busy ? 'Inviting…' : 'Invite staff'}
                  </Button>
                </div>
              </div>
            </Card>
            {data.items.map((s) => (
              <Card key={s.id} as="article" aria-label={s.name}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{s.name}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {s.email} · {s.role}
                    </p>
                  </div>
                  <StatusBadge tone={TONE[s.status]}>{s.status}</StatusBadge>
                </div>
              </Card>
            ))}
            <div>
              <Link href={`/admin/tenants/${params.id}`} style={linkStyle}>
                Back to tenant
              </Link>
            </div>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
