'use client';

import { useCallback, useId } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../../components/PageHeader';
import { Card } from '../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../components/StatusBadge';
import { AsyncBoundary } from '../../../components/AsyncBoundary';
import { apiClient } from '../../../lib/api-client';
import { useAsync } from '../../../lib/useAsync';
import type { AttemptTaskView, TaskKind, TaskStatus } from '../../../lib/types';

const STATUS_TONE: Record<TaskStatus, BadgeTone> = {
  not_started: 'neutral',
  in_progress: 'warning',
  saved: 'success',
  flagged: 'purple',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  saved: 'Saved',
  flagged: 'Flagged',
};

const KIND_SLUG: Record<TaskKind, string> = {
  document: 'document',
  code: 'code',
  sheet: 'sheet',
};

export default function AttemptOverviewPage({
  params,
}: {
  params: { id: string };
}): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const loader = useCallback(() => apiClient.getAttempt(id), [id]);
  const { state, reload } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Assessment overview"
        headingId={headingId}
        description="Your sections and tasks. Open any task to work on it — the timer and autosave keep running."
      />
      <AsyncBoundary state={state} onRetry={reload} label="your assessment">
        {(attempt) => {
          const byId = new Map<string, AttemptTaskView>(attempt.tasks.map((t) => [t.id, t]));
          const nextTask = attempt.tasks.find((t) => t.status !== 'saved');
          return (
            <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 5)' }}>
              {nextTask ? (
                <Card as="article" aria-label="Next task">
                  <div
                    style={{
                      display: 'flex',
                      gap: 'calc(var(--space-unit) * 3)',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>
                      Next: <strong>{nextTask.title}</strong>
                    </span>
                    <Link
                      href={`/candidate/attempt/${id}/task/${KIND_SLUG[nextTask.kind]}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        minBlockSize: 'var(--target-min)',
                        paddingInline: 'calc(var(--space-unit) * 3)',
                        borderRadius: 'var(--radius-control)',
                        background: 'var(--color-blue)',
                        color: 'var(--color-paper)',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      Open next task
                    </Link>
                  </div>
                </Card>
              ) : null}

              {attempt.sections.map((section) => (
                <Card key={section.id} as="article" aria-label={section.title}>
                  <h2 style={{ marginBlockStart: 0, fontSize: '1.1rem' }}>{section.title}</h2>
                  <ul
                    style={{
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'calc(var(--space-unit) * 2)',
                    }}
                  >
                    {section.taskIds.map((taskId) => {
                      const task = byId.get(taskId);
                      if (task === undefined) return null;
                      return (
                        <li key={taskId}>
                          <Link
                            href={`/candidate/attempt/${id}/task/${KIND_SLUG[task.kind]}`}
                            style={{
                              display: 'flex',
                              gap: 'calc(var(--space-unit) * 3)',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: 'calc(var(--space-unit) * 3)',
                              borderRadius: 'var(--radius-control)',
                              border: '1px solid var(--color-line)',
                              textDecoration: 'none',
                              color: 'var(--color-ink)',
                            }}
                          >
                            <span>{task.title}</span>
                            <StatusBadge tone={STATUS_TONE[task.status]}>
                              {STATUS_LABEL[task.status]}
                            </StatusBadge>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              ))}
            </div>
          );
        }}
      </AsyncBoundary>
    </section>
  );
}
