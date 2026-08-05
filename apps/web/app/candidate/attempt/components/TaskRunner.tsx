'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../components/PageHeader';
import { Card } from '../../../components/Card';
import { StatusBadge } from '../../../components/StatusBadge';
import { AsyncBoundary } from '../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../lib/api-client';
import { useAsync } from '../../../lib/useAsync';
import type { AttemptView, TaskKind } from '../../../lib/types';

const KIND_COPY: Record<TaskKind, { emptyHint: string; mono: boolean; primary: string }> = {
  document: {
    emptyHint: 'Write your structured response here.',
    mono: false,
    primary: 'Save response',
  },
  code: {
    emptyHint: '// Write your solution here, then run the sample tests from the Plugin tab.',
    mono: true,
    primary: 'Save response',
  },
  sheet: {
    emptyHint: 'ledgerA,ledgerB,discrepancy\n…',
    mono: true,
    primary: 'Save workbook',
  },
};

export function TaskRunner({
  attemptId,
  kind,
}: {
  attemptId: string;
  kind: TaskKind;
}): React.JSX.Element {
  const headingId = useId();
  const fieldId = useId();
  const loader = useCallback(() => apiClient.getAttempt(attemptId), [attemptId]);
  const { state, reload, setData } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <AsyncBoundary state={state} onRetry={reload} label="this task">
        {(attempt) => {
          const task = attempt.tasks.find((t) => t.kind === kind);
          if (task === undefined) {
            return (
              <Card as="article">
                <p style={{ margin: 0 }}>This task is not part of your assessment.</p>
              </Card>
            );
          }
          return (
            <TaskEditor
              key={task.id}
              attempt={attempt}
              attemptId={attemptId}
              kind={kind}
              headingId={headingId}
              fieldId={fieldId}
              initialResponse={task.response}
              taskId={task.id}
              title={task.title}
              prompt={task.prompt}
              savedAt={task.savedAt}
              flagged={task.flagged}
              onSaved={setData}
            />
          );
        }}
      </AsyncBoundary>
    </section>
  );
}

function TaskEditor(props: {
  attempt: AttemptView;
  attemptId: string;
  kind: TaskKind;
  headingId: string;
  fieldId: string;
  initialResponse: string;
  taskId: string;
  title: string;
  prompt: string;
  savedAt: string | null;
  flagged: boolean;
  onSaved: (attempt: AttemptView) => void;
}): React.JSX.Element {
  const { attemptId, kind, headingId, fieldId, taskId, title, prompt } = props;
  const copy = KIND_COPY[kind];
  const [response, setResponse] = useState(props.initialResponse);
  const [savedAt, setSavedAt] = useState(props.savedAt);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDirty(response !== props.initialResponse);
  }, [response, props.initialResponse]);

  async function save(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiClient.saveTask(attemptId, taskId, response);
      const task = updated.tasks.find((t) => t.id === taskId);
      setSavedAt(task?.savedAt ?? new Date().toISOString());
      setDirty(false);
      props.onSaved(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your response.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 4)' }}>
      <PageHeader
        title={title}
        headingId={headingId}
        description={prompt}
        actions={props.flagged ? <StatusBadge tone="purple">Flagged</StatusBadge> : undefined}
      />
      <Card as="article" aria-label="Your response">
        <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 3)' }}>
          <label htmlFor={fieldId} className="visually-hidden">
            {title} response
          </label>
          <textarea
            id={fieldId}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder={copy.emptyHint}
            rows={kind === 'document' ? 12 : 16}
            spellCheck={kind === 'document'}
            style={{
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--color-line)',
              padding: 'calc(var(--space-unit) * 3)',
              fontFamily: copy.mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
              fontSize: copy.mono ? '0.9rem' : 'inherit',
              lineHeight: 1.6,
              color: 'var(--color-ink)',
              background: 'var(--color-paper)',
              resize: 'vertical',
            }}
          />
          {error ? (
            <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
              {error}
            </p>
          ) : null}
          <div
            style={{
              display: 'flex',
              gap: 'calc(var(--space-unit) * 3)',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            <span role="status" style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
              {saving
                ? 'Saving…'
                : dirty
                  ? 'Unsaved changes'
                  : savedAt
                    ? `Saved ${new Date(savedAt).toLocaleTimeString('en-GB', { timeStyle: 'short' })}`
                    : 'Not yet saved'}
            </span>
            <div style={{ display: 'flex', gap: 'calc(var(--space-unit) * 2)', flexWrap: 'wrap' }}>
              {kind === 'code' ? (
                <Link
                  href={`/candidate/attempt/${attemptId}/plugin`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    minBlockSize: 'var(--target-min)',
                    paddingInline: 'calc(var(--space-unit) * 3)',
                  }}
                >
                  Run tests
                </Link>
              ) : null}
              <Button disabled={saving || !dirty} onClick={() => void save()}>
                {saving ? 'Saving…' : copy.primary}
              </Button>
            </div>
          </div>
        </div>
      </Card>
      <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
        This is your own work. Provenance is recorded for the human reviewer. Use the AI panel only
        as a labelled aid — it never scores you.
      </p>
    </div>
  );
}
