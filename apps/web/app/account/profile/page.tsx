'use client';

import { useCallback, useId } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';

export default function ProfilePage(): React.JSX.Element {
  const headingId = useId();
  const loader = useCallback(() => apiClient.getProfile(), []);
  const { state, reload } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Profile"
        headingId={headingId}
        description="Your identity and organisation membership in this workspace."
      />
      <AsyncBoundary state={state} onRetry={reload} label="your profile">
        {(profile) => (
          <Card aria-label="Profile details">
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(140px, auto) 1fr',
                gap: 'calc(var(--space-unit) * 3)',
                margin: 0,
              }}
            >
              <dt style={{ color: 'var(--color-muted)' }}>Name</dt>
              <dd style={{ margin: 0 }}>{profile.displayName}</dd>
              <dt style={{ color: 'var(--color-muted)' }}>Email</dt>
              <dd style={{ margin: 0 }}>{profile.email}</dd>
              <dt style={{ color: 'var(--color-muted)' }}>Account type</dt>
              <dd style={{ margin: 0 }}>{profile.userType}</dd>
              <dt style={{ color: 'var(--color-muted)' }}>Status</dt>
              <dd style={{ margin: 0 }}>
                <StatusBadge tone={profile.status === 'active' ? 'success' : 'neutral'}>
                  {profile.status}
                </StatusBadge>
              </dd>
              <dt style={{ color: 'var(--color-muted)' }}>Organisation</dt>
              <dd style={{ margin: 0 }}>
                {profile.tenant ? profile.tenant.tenantName : 'No organisation in this context'}
              </dd>
              {profile.tenant ? (
                <>
                  <dt style={{ color: 'var(--color-muted)' }}>Roles</dt>
                  <dd style={{ margin: 0 }}>
                    <ul
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 'var(--space-unit)',
                        listStyle: 'none',
                        margin: 0,
                        padding: 0,
                      }}
                    >
                      {profile.tenant.roles.map((role) => (
                        <li key={role}>
                          <StatusBadge tone="info">{role}</StatusBadge>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </>
              ) : null}
            </dl>
          </Card>
        )}
      </AsyncBoundary>
    </section>
  );
}
