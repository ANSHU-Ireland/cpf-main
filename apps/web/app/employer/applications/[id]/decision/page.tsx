'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { DecisionDraftView, DecisionOutcome } from '../../../../lib/types';

const fieldStyle: React.CSSProperties = {
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-line)',
  padding: 'calc(var(--space-unit) * 3)',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  color: 'var(--color-ink)',
  background: 'var(--color-paper)',
  width: '100%',
  boxSizing: 'border-box',
};

const OUTCOME_LABEL: Record<DecisionOutcome, string> = {
  progress: 'Progress',
  hold: 'Hold',
  live_verification: 'Live verification',
  reattempt: 'Reattempt',
  not_progress: 'Do not progress',
  withdrawn: 'Withdrawn',
};

const OUTCOME_TONE: Record<DecisionOutcome, BadgeTone> = {
  progress: 'success',
  hold: 'warning',
  live_verification: 'info',
  reattempt: 'purple',
  not_progress: 'neutral',
  withdrawn: 'neutral',
};

const TABS = ['Decision', 'Evidence', 'Controls', 'History'] as const;
type Tab = (typeof TABS)[number];

export default function DecisionPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const load = useCallback(() => apiClient.getDecision(id), [id]);
  const { state, reload, setData } = useAsync<DecisionDraftView>(load);

  return (
    <AsyncBoundary state={state} onRetry={reload} label="decision">
      {(draft) => <DecisionWorkspace id={id} draft={draft} onSaved={setData} />}
    </AsyncBoundary>
  );
}

function DecisionWorkspace({
  id,
  draft,
  onSaved,
}: {
  readonly id: string;
  readonly draft: DecisionDraftView;
  readonly onSaved: (next: DecisionDraftView) => void;
}): React.JSX.Element {
  const headingId = useId();
  const outcomeId = useId();
  const rationaleId = useId();
  const evidenceId = useId();
  const [activeTab, setActiveTab] = useState<Tab>('Decision');
  const [outcome, setOutcome] = useState<DecisionOutcome | ''>(draft.outcome ?? '');
  const [rationale, setRationale] = useState(draft.rationale);
  const [evidenceText, setEvidenceText] = useState(draft.evidenceLinks.join('\n'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const editable = draft.status === 'draft' || draft.status === 'returned';

  useEffect(() => {
    setOutcome(draft.outcome ?? '');
    setRationale(draft.rationale);
    setEvidenceText(draft.evidenceLinks.join('\n'));
  }, [draft]);

  async function save(): Promise<void> {
    if (!editable) return;
    if (outcome === '') {
      setError('Choose an outcome deliberately.');
      return;
    }
    if (rationale.trim().length < 10) {
      setError('A written rationale of at least 10 characters is required.');
      return;
    }
    const evidenceLinks = evidenceText
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const next = await apiClient.saveDecision(id, outcome, rationale.trim(), evidenceLinks);
      onSaved(next);
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not save the human decision.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 5)' }}>
      <PageHeader
        headingId={headingId}
        title="Decision draft"
        description="Start empty; record outcome, rationale and evidence from an authorised human."
        actions={
          editable ? (
            <Button disabled={busy} onClick={() => void save()}>
              {busy ? 'Saving…' : 'Save human decision'}
            </Button>
          ) : null
        }
      />
      <div style={{ display: 'flex', gap: 'calc(var(--space-unit) * 2)', alignItems: 'center' }}>
        <StatusBadge tone="info">EMP-20</StatusBadge>
        <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>Governance</span>
      </div>

      <Card style={{ padding: 'calc(var(--space-unit) * 6)' }}>
        <section
          aria-label="Human authority checkpoint"
          style={{
            background: 'var(--color-amber-soft)',
            borderRadius: 'var(--radius-control)',
            padding: 'calc(var(--space-unit) * 4)',
            marginBottom: 'calc(var(--space-unit) * 5)',
          }}
        >
          <strong style={{ color: 'var(--color-amber)' }}>Human authority checkpoint</strong>
          <p style={{ margin: 'var(--space-unit) 0 0' }}>
            Human-authored decision; outcome is never preselected and a separate approver must issue
            it.
          </p>
        </section>

        <nav
          aria-label="Decision workspace sections"
          style={{ display: 'flex', gap: 28, overflowX: 'auto' }}
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? 'page' : undefined}
              style={{
                minHeight: 44,
                padding: '0 0 10px',
                border: 0,
                borderBottom: `3px solid ${activeTab === tab ? 'var(--color-blue)' : 'var(--color-line)'}`,
                background: 'transparent',
                color: activeTab === tab ? 'var(--color-blue)' : 'var(--color-muted)',
                font: 'inherit',
                fontWeight: 650,
                cursor: 'pointer',
              }}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'calc(var(--space-unit) * 5)' }}>
          {activeTab === 'Decision' ? (
            !draft.reviewComplete ? (
              <p style={{ margin: 0, color: 'var(--color-muted)' }}>
                Review must be complete before a decision can be drafted for {draft.candidateRef}.
              </p>
            ) : !editable ? (
              <DecisionSummary draft={draft} id={id} />
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 4)',
                }}
              >
                <p style={{ margin: 0, color: 'var(--color-muted)' }}>
                  {draft.candidateRef} · {draft.campaignName}
                </p>
                <label htmlFor={outcomeId} style={{ fontWeight: 650 }}>
                  Outcome
                </label>
                <select
                  id={outcomeId}
                  value={outcome}
                  onChange={(event) => setOutcome(event.target.value as DecisionOutcome | '')}
                  style={fieldStyle}
                >
                  <option value="">No selection — choose deliberately</option>
                  {Object.entries(OUTCOME_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <label htmlFor={rationaleId} style={{ fontWeight: 650 }}>
                  Rationale and cited evidence
                </label>
                <textarea
                  id={rationaleId}
                  value={rationale}
                  onChange={(event) => setRationale(event.target.value)}
                  rows={6}
                  placeholder="Explain the decision in plain language and link only the evidence needed for this purpose."
                  style={{ ...fieldStyle, resize: 'vertical' }}
                />
                <label htmlFor={evidenceId} style={{ fontWeight: 650 }}>
                  Evidence references{' '}
                  <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>
                    (optional, one per line)
                  </span>
                </label>
                <textarea
                  id={evidenceId}
                  value={evidenceText}
                  onChange={(event) => setEvidenceText(event.target.value)}
                  rows={3}
                  placeholder="scorecard:submitted-review"
                  style={{ ...fieldStyle, resize: 'vertical' }}
                />
              </div>
            )
          ) : activeTab === 'Evidence' ? (
            <PanelText
              title="Purpose-bound evidence"
              body={
                draft.evidenceLinks.length === 0
                  ? 'No evidence references have been added. Only cite evidence required for this decision.'
                  : draft.evidenceLinks.join(' · ')
              }
            />
          ) : activeTab === 'Controls' ? (
            <PanelText
              title="Decision controls"
              body="Outcome starts empty, rationale is mandatory, secondary approval is required, and the drafter cannot self-approve."
            />
          ) : (
            <PanelText
              title="Decision history"
              body={
                draft.decisionId === null
                  ? 'No decision events have been recorded.'
                  : `Decision ${draft.decisionId} is ${draft.status.replace('_', ' ')}.`
              }
            />
          )}
        </div>

        <section
          aria-label="AI boundary"
          style={{
            background: 'var(--color-purple-soft)',
            borderRadius: 'var(--radius-control)',
            padding: 'calc(var(--space-unit) * 4)',
            marginTop: 'calc(var(--space-unit) * 5)',
          }}
        >
          <strong style={{ color: 'var(--color-purple)' }}>AI boundary</strong>
          <p style={{ margin: 'var(--space-unit) 0 0' }}>No AI output on this surface.</p>
        </section>

        {error ? (
          <p role="alert" style={{ color: 'var(--color-red)' }}>
            {error}
          </p>
        ) : null}
        {saved ? (
          <p role="status" style={{ color: 'var(--color-sage)' }}>
            Human decision saved for approval.
          </p>
        ) : null}
        {editable && activeTab === 'Decision' ? (
          <footer
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              marginTop: 28,
            }}
          >
            <Button variant="secondary" disabled={busy} onClick={() => void save()}>
              Save draft
            </Button>
            <Button disabled={busy} onClick={() => void save()}>
              Save human decision
            </Button>
          </footer>
        ) : null}
      </Card>
    </div>
  );
}

function DecisionSummary({
  draft,
  id,
}: {
  readonly draft: DecisionDraftView;
  readonly id: string;
}): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <strong>{draft.candidateRef}</strong>
          <p style={{ margin: '4px 0 0', color: 'var(--color-muted)' }}>{draft.rationale}</p>
        </div>
        {draft.outcome !== null ? (
          <StatusBadge tone={OUTCOME_TONE[draft.outcome]}>
            {OUTCOME_LABEL[draft.outcome]}
          </StatusBadge>
        ) : null}
      </div>
      {draft.status === 'issued' ? (
        <p role="status" style={{ margin: 0, color: 'var(--color-sage)' }}>
          This human decision has been issued.
        </p>
      ) : (
        <p style={{ margin: 0 }}>
          This decision is awaiting separate approval.{' '}
          <Link
            href={`/employer/applications/${id}/approval`}
            style={{ color: 'var(--color-blue)', fontWeight: 650 }}
          >
            Go to approval
          </Link>
        </p>
      )}
    </div>
  );
}

function PanelText({
  title,
  body,
}: {
  readonly title: string;
  readonly body: string;
}): React.JSX.Element {
  return (
    <section>
      <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{title}</h2>
      <p style={{ margin: '8px 0 0', color: 'var(--color-muted)' }}>{body}</p>
    </section>
  );
}
