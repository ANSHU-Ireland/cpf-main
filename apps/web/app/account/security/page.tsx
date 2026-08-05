'use client';

import { useCallback, useId } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { SecuritySeverity } from '../../lib/types';

const SEVERITY_TONE: Record<SecuritySeverity, BadgeTone> = {
  info: 'info',
  warning: 'warning',
  critical: 'danger',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SecurityPage(): React.JSX.Element {
  const headingId = useId();
  const loader = useCallback(() => apiClient.getSecurityEvents(), []);
  const { state, reload } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Security activity"
        headingId={headingId}
        description="Recent security-relevant events on your account."
      />
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
                    <span>{event.description}</span>
                    <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                      {formatDate(event.occurredAt)}
                    </span>
                  </div>
                  <StatusBadge tone={SEVERITY_TONE[event.severity]}>{event.severity}</StatusBadge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </AsyncBoundary>
    </section>
  );
}
