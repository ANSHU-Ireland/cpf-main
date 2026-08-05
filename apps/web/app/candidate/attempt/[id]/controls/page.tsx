'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { AttemptControlsView, AttemptView } from '../../../../lib/types';

interface ControlsData {
  readonly attempt: AttemptView;
  readonly controls: AttemptControlsView;
}

function Controls({
  attemptId,
  data,
  onReload,
}: {
  attemptId: string;
  data: ControlsData;
  onReload: () => void;
}): React.JSX.Element {
  const [controls, setControls] = useState(data.controls);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const flagged = new Set(controls.flaggedTaskIds);

  async function act(
    key: string,
    action: 'flag' | 'break' | 'end_break',
    taskId?: string,
  ): Promise<void> {
    setPending(key);
    setError(null);
    try {
      const next = await apiClient.controlsAction(attemptId, action, taskId);
      setControls(next);
      onReload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update your controls.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 5)' }}>
      {error ? (
        <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
          {error}
        </p>
      ) : null}

      <Card as="article" aria-label="Flag tasks for later">
        <h2 style={{ marginBlockStart: 0, fontSize: '1.1rem' }}>Flag tasks</h2>
        <p style={{ marginBlockStart: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          Flag a task to revisit it before you submit. Flags are recorded on the server.
        </p>
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
          {data.attempt.tasks.map((task) => {
            const isFlagged = flagged.has(task.id);
            return (
              <li
                key={task.id}
                style={{
                  display: 'flex',
                  gap: 'calc(var(--space-unit) * 2)',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                }}
              >
                <span>
                  {task.title} {isFlagged ? <StatusBadge tone="purple">Flagged</StatusBadge> : null}
                </span>
                <Button
                  variant="secondary"
                  disabled={pending === `flag-${task.id}`}
                  onClick={() => void act(`flag-${task.id}`, 'flag', task.id)}
                >
                  {isFlagged ? 'Remove flag' : 'Flag task'}
                </Button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card as="article" aria-label="Request a break">
        <h2 style={{ marginBlockStart: 0, fontSize: '1.1rem' }}>Break</h2>
        <p style={{ marginBlockStart: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          Breaks are permitted and server-recorded. Breaks remaining:{' '}
          <strong>{controls.breaksRemaining}</strong>.
        </p>
        {controls.breakStatus === 'active' ? (
          <div
            style={{
              display: 'flex',
              gap: 'calc(var(--space-unit) * 3)',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <StatusBadge tone="warning">Break in progress</StatusBadge>
            <Button disabled={pending === 'end'} onClick={() => void act('end', 'end_break')}>
              {pending === 'end' ? 'Resuming…' : 'End break and resume'}
            </Button>
          </div>
        ) : (
          <Button
            disabled={pending === 'break' || controls.breaksRemaining <= 0}
            onClick={() => void act('break', 'break')}
          >
            {controls.breaksRemaining <= 0 ? 'No breaks remaining' : 'Request break'}
          </Button>
        )}
      </Card>
    </div>
  );
}

export default function ControlsPage({ params }: { params: { id: string } }): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const loader = useCallback(async (): Promise<ControlsData> => {
    const [attempt, controls] = await Promise.all([
      apiClient.getAttempt(id),
      apiClient.getControls(id),
    ]);
    return { attempt, controls };
  }, [id]);
  const { state, reload } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Flags and break"
        headingId={headingId}
        description="Flag tasks to revisit and request a permitted break without losing your place."
      />
      <AsyncBoundary state={state} onRetry={reload} label="your controls">
        {(data) => <Controls attemptId={id} data={data} onReload={reload} />}
      </AsyncBoundary>
    </section>
  );
}
