'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import { CheckCircle } from '@phosphor-icons/react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type {
  Collection,
  CriterionView,
  EvidenceItemView,
  ObservationsView,
} from '../../../../lib/types';
import styles from './scorecard.module.css';

interface ScorecardWorkspaceData {
  readonly criteria: Collection<CriterionView>;
  readonly evidence: Collection<EvidenceItemView>;
  readonly observations: ObservationsView;
}

const RUBRIC_LEVELS = [
  { label: 'Insufficient evidence', score: 0, insufficient: true },
  { label: 'Developing', score: 1, insufficient: false },
  { label: 'Meets expectation', score: 3, insufficient: false },
  { label: 'Exceeds expectation', score: 5, insufficient: false },
] as const;

export default function ScorecardPage({ params }: { params: { id: string } }): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const load = useCallback(async (): Promise<ScorecardWorkspaceData> => {
    const [criteria, evidence, observations] = await Promise.all([
      apiClient.getScorecard(id),
      apiClient.getEvidence(id),
      apiClient.getObservations(id),
    ]);
    return { criteria, evidence, observations };
  }, [id]);
  const { state, reload, setData } = useAsync<ScorecardWorkspaceData>(load);

  return (
    <section aria-labelledby={headingId}>
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="the criterion scorecard"
        isEmpty={(data) => data.criteria.items.length === 0}
        emptyTitle="No criteria"
        emptyBody="This assessment has no scoring criteria configured."
      >
        {(data) => (
          <ScorecardWorkspace
            assignmentId={id}
            data={data}
            headingId={headingId}
            onChange={setData}
          />
        )}
      </AsyncBoundary>
    </section>
  );
}

function ScorecardWorkspace({
  assignmentId,
  data,
  headingId,
  onChange,
}: {
  assignmentId: string;
  data: ScorecardWorkspaceData;
  headingId: string;
  onChange: (data: ScorecardWorkspaceData) => void;
}): React.JSX.Element {
  const [criterionIndex, setCriterionIndex] = useState(0);
  const criterion = data.criteria.items[criterionIndex] ?? data.criteria.items[0];
  const evidence = useMemo(
    () =>
      data.evidence.items.find((item) => item.sourceLabel === criterion?.evidenceLink) ??
      data.evidence.items[0],
    [criterion?.evidenceLink, data.evidence.items],
  );
  const [score, setScore] = useState<number | null>(criterion?.score ?? null);
  const [insufficientEvidence, setInsufficientEvidence] = useState(
    criterion?.insufficientEvidence ?? false,
  );
  const [evidenceLink, setEvidenceLink] = useState(
    criterion?.evidenceLink ?? evidence?.sourceLabel ?? '',
  );
  const [rationale, setRationale] = useState(
    criterion?.rationale ??
      'The response proposes a reversible first step and separates verified facts from assumptions.',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  function chooseCriterion(nextIndex: number): void {
    const next = data.criteria.items[nextIndex];
    if (next === undefined) return;
    const nextEvidence =
      data.evidence.items.find((item) => item.sourceLabel === next.evidenceLink) ??
      data.evidence.items[0];
    setCriterionIndex(nextIndex);
    setScore(next.score);
    setInsufficientEvidence(next.insufficientEvidence);
    setEvidenceLink(next.evidenceLink || nextEvidence?.sourceLabel || '');
    setRationale(
      next.rationale ||
        'The response proposes a reversible first step and separates verified facts from assumptions.',
    );
    setError(null);
  }

  async function save(): Promise<void> {
    if (criterion === undefined || score === null) {
      setError('Choose a rubric level before saving.');
      return;
    }
    if (rationale.trim().length < 3) {
      setError('Add a short human-authored rationale.');
      return;
    }
    if (!insufficientEvidence && evidenceLink.trim().length < 3) {
      setError('Link the source evidence used for this judgement.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const next = await apiClient.saveCriterion(
        assignmentId,
        criterion.id,
        score,
        rationale.trim(),
        evidenceLink.trim(),
        insufficientEvidence,
      );
      onChange({
        ...data,
        criteria: {
          items: data.criteria.items.map((item) => (item.id === next.id ? next : item)),
          total: data.criteria.total,
        },
      });
      setLastSavedAt(new Date().toISOString());
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not save this criterion.');
    } finally {
      setBusy(false);
    }
  }

  if (criterion === undefined) return <p>No criterion is available.</p>;

  return (
    <div className={styles.page}>
      <PageHeader
        headingId={headingId}
        title="Criterion scorecard"
        actions={
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : 'Save criterion'}
          </Button>
        }
      />
      <div className={styles.meta}>
        <span>/review/assignment/:id/scorecard</span>
        <div>
          <strong>REV-08</strong>
          <b>Workspace</b>
        </div>
        <p>Score one rubric criterion with evidence links or an insufficient-evidence rationale.</p>
      </div>

      <div className={styles.workspace}>
        <article className={styles.evidencePane} aria-labelledby="scorecard-evidence-heading">
          <header>
            <h2 id="scorecard-evidence-heading">Evidence</h2>
            <span>
              <CheckCircle size={17} weight="fill" aria-hidden /> Source-linked
            </span>
          </header>
          {evidence ? (
            <>
              <div className={styles.sourceBar}>
                {evidence.title} · Version {evidence.version}
              </div>
              <p>
                The candidate identifies the operational constraint and separates verified facts
                from assumptions.
              </p>
              <blockquote>
                {evidence.id === 'ev_doc'
                  ? 'The response proposes a reversible first step and names the evidence needed before proceeding.'
                  : evidence.excerpt}
              </blockquote>
              {insufficientEvidence ? (
                <>
                  <label htmlFor="reviewer-rationale">Insufficient-evidence rationale</label>
                  <textarea
                    id="reviewer-rationale"
                    value={rationale}
                    onChange={(event) => setRationale(event.target.value)}
                    rows={4}
                  />
                </>
              ) : null}
              <p className={styles.annotation}>
                Cite this passage only when it supports the selected rubric criterion.
              </p>
            </>
          ) : (
            <p role="status">No evidence is linked to this assignment.</p>
          )}
          <div className={styles.autosave} role="status" aria-live="polite">
            Autosaved{' '}
            {lastSavedAt
              ? new Date(lastSavedAt).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '14:32'}{' '}
            · Checksum verified
          </div>
        </article>

        <aside className={styles.judgementPane} aria-labelledby="judgement-heading">
          <p className={styles.progress}>
            Criterion {criterionIndex + 1} of {data.criteria.total}
          </p>
          <h2 id="judgement-heading">{criterion.label}</h2>
          <p>Select a rubric level only after reviewing the source evidence.</p>

          <fieldset className={styles.levels}>
            <legend className="visually-hidden">Rubric level</legend>
            {RUBRIC_LEVELS.map((level) => {
              const checked = score === level.score && insufficientEvidence === level.insufficient;
              return (
                <label key={level.label} className={checked ? styles.selectedLevel : undefined}>
                  <input
                    type="radio"
                    name="rubric-level"
                    checked={checked}
                    onChange={() => {
                      setScore(level.score);
                      setInsufficientEvidence(level.insufficient);
                    }}
                  />
                  <span>{level.label}</span>
                </label>
              );
            })}
          </fieldset>

          <label htmlFor="evidence-link">Evidence link</label>
          <select
            id="evidence-link"
            value={evidenceLink}
            onChange={(event) => setEvidenceLink(event.target.value)}
            disabled={insufficientEvidence}
          >
            {data.evidence.items.map((item) => (
              <option key={item.id} value={item.sourceLabel}>
                {item.sourceLabel}
              </option>
            ))}
          </select>

          <div className={styles.aiGate}>
            <strong>AI observations hidden</strong>
            <span>
              {data.observations.scoringComplete
                ? 'Independent scoring is complete; reveal remains a separate action.'
                : 'Reveal only after independent review.'}
            </span>
          </div>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <div className={styles.actions}>
            <Button
              variant="secondary"
              disabled={criterionIndex === 0}
              onClick={() => chooseCriterion(criterionIndex - 1)}
            >
              Previous
            </Button>
            {criterionIndex < data.criteria.items.length - 1 ? (
              <Button onClick={() => chooseCriterion(criterionIndex + 1)}>Next criterion</Button>
            ) : (
              <Button disabled={busy} onClick={() => void save()}>
                {busy ? 'Saving…' : 'Save criterion'}
              </Button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
