'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { CheckCircle, Flag } from '@phosphor-icons/react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../components/PageHeader';
import { AsyncBoundary } from '../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../lib/api-client';
import { useAsync } from '../../../lib/useAsync';
import type { AttemptView } from '../../../lib/types';
import { RuntimeTimer } from '../components/RuntimeTimer';
import styles from './overview.module.css';

export default function AttemptOverviewPage({
  params,
}: {
  params: { id: string };
}): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const loader = useCallback(() => apiClient.getAttempt(id), [id]);
  const { state, reload, setData } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <AsyncBoundary state={state} onRetry={reload} label="your assessment">
        {(attempt) => (
          <AttemptWorkspace
            key={attempt.id}
            attempt={attempt}
            headingId={headingId}
            onChange={setData}
          />
        )}
      </AsyncBoundary>
    </section>
  );
}

function AttemptWorkspace({
  attempt,
  headingId,
  onChange,
}: {
  attempt: AttemptView;
  headingId: string;
  onChange: (attempt: AttemptView) => void;
}): React.JSX.Element {
  const defaultTask =
    attempt.tasks.find((task) => task.status === 'in_progress') ?? attempt.tasks[0];
  const [activeTaskId, setActiveTaskId] = useState(defaultTask?.id ?? '');
  const activeTask = attempt.tasks.find((task) => task.id === activeTaskId) ?? attempt.tasks[0];
  const [response, setResponse] = useState(activeTask?.response ?? '');
  const [saving, setSaving] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const responseId = useId();

  useEffect(() => {
    setResponse(activeTask?.response ?? '');
    setError(null);
  }, [activeTask]);

  const activeIndex = useMemo(
    () =>
      Math.max(
        0,
        attempt.tasks.findIndex((task) => task.id === activeTask?.id),
      ),
    [activeTask?.id, attempt.tasks],
  );
  const section = attempt.sections.find((item) => item.id === activeTask?.sectionId);
  const dirty = response !== (activeTask?.response ?? '');

  async function saveTask(): Promise<AttemptView | null> {
    if (activeTask === undefined) return null;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiClient.saveTask(attempt.id, activeTask.id, response);
      onChange(updated);
      return updated;
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not save this task.');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function toggleFlag(): Promise<void> {
    if (activeTask === undefined) return;
    setFlagging(true);
    setError(null);
    try {
      const controls = await apiClient.controlsAction(attempt.id, 'flag', activeTask.id);
      const flaggedTaskIds = new Set(controls.flaggedTaskIds);
      onChange({
        ...attempt,
        tasks: attempt.tasks.map((task) => {
          const flagged = flaggedTaskIds.has(task.id);
          return {
            ...task,
            flagged,
            status: flagged
              ? ('flagged' as const)
              : task.savedAt === null
                ? ('in_progress' as const)
                : ('saved' as const),
          };
        }),
      });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not update the task flag.');
    } finally {
      setFlagging(false);
    }
  }

  async function openNextTask(): Promise<void> {
    const updated = dirty ? await saveTask() : attempt;
    if (updated === null || updated.tasks.length === 0) return;
    const nextIndex = (activeIndex + 1) % updated.tasks.length;
    const next = updated.tasks[nextIndex];
    if (next !== undefined) setActiveTaskId(next.id);
  }

  if (activeTask === undefined) {
    return <p role="status">No tasks are configured for this assessment.</p>;
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Assessment overview"
        headingId={headingId}
        actions={
          <Button onClick={() => void openNextTask()} disabled={saving}>
            Open next task
          </Button>
        }
      />
      <div className={styles.meta}>
        <span>/candidate/attempt/:id</span>
        <div>
          <strong>RUN-02</strong>
          <b>Runtime</b>
        </div>
        <p>Server-authoritative timer, section map and autosave status.</p>
      </div>

      <article className={styles.workspace} aria-label="Active assessment task">
        <header className={styles.workspaceHeader}>
          <span>{section?.title ?? 'Assessment task'}</span>
          <RuntimeTimer
            deadlineAt={attempt.deadlineAt}
            serverNow={attempt.serverNow}
            status={attempt.status}
          />
        </header>

        <div className={styles.workspaceBody}>
          <div className={styles.briefPane}>
            <div>
              <h2>Task brief</h2>
              <p>{activeTask.prompt}</p>
            </div>
            <label htmlFor={responseId} className="visually-hidden">
              Response for {activeTask.title}
            </label>
            <textarea
              id={responseId}
              className={styles.workingArea}
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              aria-describedby={error ? `${responseId}-error` : undefined}
              spellCheck
            />
            <Button
              variant="secondary"
              onClick={() => void toggleFlag()}
              disabled={flagging}
              aria-pressed={activeTask.flagged}
              style={{ justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Flag size={18} weight={activeTask.flagged ? 'fill' : 'regular'} aria-hidden />
              {flagging ? 'Updating…' : activeTask.flagged ? 'Remove flag' : 'Flag task'}
            </Button>
          </div>

          <aside className={styles.navigator} aria-label="Task navigator">
            <h2>Task navigator</h2>
            <ol>
              {attempt.tasks.map((task, index) => (
                <li key={task.id}>
                  <button
                    type="button"
                    className={task.id === activeTask.id ? styles.activeTask : undefined}
                    aria-current={task.id === activeTask.id ? 'step' : undefined}
                    onClick={() => setActiveTaskId(task.id)}
                  >
                    <span>Task {index + 1}</span>
                    {task.status === 'saved' ? (
                      <CheckCircle size={18} weight="fill" aria-label="Saved" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ol>

            <div className={styles.saveState} role="status" aria-live="polite">
              <strong>{saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved'}</strong>
              <span>
                {dirty
                  ? 'Changes stay in this task until saved.'
                  : `Version ${activeTask.version} · checksum ${activeTask.checksum} verified`}
              </span>
            </div>

            {error ? (
              <p id={`${responseId}-error`} role="alert" className={styles.error}>
                {error}
              </p>
            ) : null}

            <div className={styles.navigatorActions}>
              <Button
                variant="secondary"
                disabled={saving || !dirty}
                onClick={() => void saveTask()}
              >
                {saving ? 'Saving…' : 'Save task'}
              </Button>
              <Button disabled={saving} onClick={() => void openNextTask()}>
                Open next task
              </Button>
            </div>
          </aside>
        </div>
      </article>
    </div>
  );
}
