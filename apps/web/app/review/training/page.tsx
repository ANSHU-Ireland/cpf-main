'use client';

import { useCallback, useId } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, TrainingModuleView, TrainingStatus } from '../../lib/types';

const STATUS_TONE: Record<TrainingStatus, BadgeTone> = {
  not_started: 'neutral',
  in_progress: 'warning',
  complete: 'success',
  expired: 'danger',
};

const STATUS_LABEL: Record<TrainingStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
  expired: 'Expired',
};

export default function TrainingPage(): React.JSX.Element {
  const headingId = useId();
  const load = useCallback(() => apiClient.getTraining(), []);
  const { state, reload } = useAsync<Collection<TrainingModuleView>>(load);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Training and eligibility"
        description="Required modules must be complete before you are eligible to review certain assessments."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="training modules"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No modules"
        emptyBody="There are no training modules assigned to you right now."
      >
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 3)' }}
          >
            {data.items.map((module) => (
              <Card key={module.id} as="article" aria-label={module.title}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1rem' }}>
                      {module.title}
                      {module.required ? (
                        <span
                          style={{
                            marginLeft: 'calc(var(--space-unit) * 2)',
                            fontSize: '0.75rem',
                            color: 'var(--color-muted)',
                          }}
                        >
                          Required
                        </span>
                      ) : null}
                    </h2>
                    {module.completedAt ? (
                      <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                        Completed{' '}
                        {new Date(module.completedAt).toLocaleDateString('en-GB', {
                          dateStyle: 'long',
                        })}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge tone={STATUS_TONE[module.status]}>
                    {STATUS_LABEL[module.status]}
                  </StatusBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
