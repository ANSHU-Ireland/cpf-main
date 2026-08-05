'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, MemberStatus, MemberView } from '../../lib/types';

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

const TONE: Record<MemberStatus, BadgeTone> = {
  active: 'success',
  invited: 'info',
  suspended: 'danger',
};

export default function MembersPage(): React.JSX.Element {
  const headingId = useId();
  const emailId = useId();
  const roleId = useId();
  const load = useCallback(() => apiClient.getMembers(), []);
  const { state, reload, setData } = useAsync<Collection<MemberView>>(load);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('recruiter');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function invite(current: Collection<MemberView>): Promise<void> {
    if (!email.includes('@')) {
      setError('A valid email is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const member = await apiClient.inviteMember(email.trim(), role);
      setData({ items: [...current.items, member], total: current.total + 1 });
      setEmail('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not invite this member.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Team members"
        description="People with access to this employer workspace and their roles."
      />
      <AsyncBoundary state={state} onRetry={reload} label="members">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card>
              <div
                style={{
                  display: 'flex',
                  gap: 'calc(var(--space-unit) * 3)',
                  flexWrap: 'wrap',
                  alignItems: 'flex-end',
                }}
              >
                <div style={{ flex: '1 1 220px' }}>
                  <label htmlFor={emailId} style={{ fontWeight: 600, display: 'block' }}>
                    Invite by email
                  </label>
                  <input
                    id={emailId}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div style={{ flex: '0 1 180px' }}>
                  <label htmlFor={roleId} style={{ fontWeight: 600, display: 'block' }}>
                    Role
                  </label>
                  <select
                    id={roleId}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={fieldStyle}
                  >
                    <option value="employer_admin">Admin</option>
                    <option value="recruiter">Recruiter</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <Button disabled={busy} onClick={() => void invite(data)}>
                  {busy ? 'Inviting…' : 'Invite'}
                </Button>
              </div>
              {error ? (
                <p role="alert" style={{ margin: '12px 0 0', color: 'var(--color-red)' }}>
                  {error}
                </p>
              ) : null}
            </Card>
            {data.items.map((member) => (
              <Card key={member.id} as="article" aria-label={member.name}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{member.name}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {member.email} · {member.roles.join(', ')}
                    </p>
                  </div>
                  <StatusBadge tone={TONE[member.status]}>{member.status}</StatusBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
