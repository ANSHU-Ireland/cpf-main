'use client';

import { useCallback, useId, useState } from 'react';
import Link from 'next/link';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { ApplicationStatus, CandidateApplicationView, Collection } from '../../lib/types';

const STATUS_TONE: Record<ApplicationStatus, BadgeTone> = {
  invited: 'info',
  scheduled: 'info',
  in_progress: 'warning',
  submitted: 'neutral',
  under_review: 'purple',
  decision_available: 'success',
  withdrawn: 'neutral',
};

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  invited: 'Invited',
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  submitted: 'Submitted',
  under_review: 'Under review',
  decision_available: 'Decision available',
  withdrawn: 'Withdrawn',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { dateStyle: 'long' });
}

type RequestMode = 'explanation' | 'human_review';

function ApplicationCard({
  application,
  onChanged,
}: {
  application: CandidateApplicationView;
  onChanged: () => void;
}): React.JSX.Element {
  const [mode, setMode] = useState<RequestMode | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const reasonFieldId = useId();

  const canWithdraw =
    application.status !== 'withdrawn' && application.status !== 'decision_available';
  const hasDecision = application.status === 'decision_available' && application.decision !== null;

  async function withdraw(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await apiClient.applicationAction(application.id, 'withdraw', 'Withdrawn by candidate');
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not withdraw this application.');
    } finally {
      setBusy(false);
    }
  }

  async function submitRequest(): Promise<void> {
    if (mode === null) return;
    if (reason.trim().length < 5) {
      setError('Please add a little more detail (5+ characters).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.applicationAction(application.id, mode, reason.trim());
      setConfirmation(
        mode === 'explanation'
          ? 'Your request for an explanation has been logged. A person will respond by email.'
          : 'Your request for a human review has been logged. A reviewer will be in touch.',
      );
      setMode(null);
      setReason('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not submit your request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="article" aria-label={`${application.role} at ${application.employerName}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 3)' }}>
        <div
          style={{
            display: 'flex',
            gap: 'calc(var(--space-unit) * 2)',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{application.role}</h2>
            <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
              {application.employerName} · {application.assessmentTitle}
            </p>
          </div>
          <StatusBadge tone={STATUS_TONE[application.status]}>
            {STATUS_LABEL[application.status]}
          </StatusBadge>
        </div>

        <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
          Invited {formatDate(application.invitedAt)}
          {application.dueAt ? ` · Due ${formatDate(application.dueAt)}` : ''}
        </p>

        {hasDecision && application.decision ? (
          <div
            style={{
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--color-line)',
              background: 'var(--color-soft)',
              padding: 'calc(var(--space-unit) * 4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'calc(var(--space-unit) * 2)',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--space-unit) * 2)' }}
            >
              <strong>Decision: {application.decision.outcome}</strong>
              <StatusBadge tone="info">Made by a person</StatusBadge>
            </div>
            <p style={{ margin: 0 }}>{application.decision.rationale}</p>
            <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
              Decided by {application.decision.decidedBy} on{' '}
              {formatDate(application.decision.issuedAt)}
            </p>
          </div>
        ) : null}

        {confirmation ? (
          <p role="status" style={{ margin: 0, color: 'var(--color-sage)' }}>
            {confirmation}
          </p>
        ) : null}

        {error ? (
          <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
            {error}
          </p>
        ) : null}

        {mode !== null ? (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 2)' }}
          >
            <label htmlFor={reasonFieldId} style={{ fontWeight: 600 }}>
              {mode === 'explanation'
                ? 'What would you like explained?'
                : 'Why would you like a human review?'}
            </label>
            <textarea
              id={reasonFieldId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              style={{
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--color-line)',
                padding: 'calc(var(--space-unit) * 2) calc(var(--space-unit) * 3)',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                color: 'var(--color-ink)',
                background: 'var(--color-paper)',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 'calc(var(--space-unit) * 2)', flexWrap: 'wrap' }}>
              <Button disabled={busy} onClick={() => void submitRequest()}>
                {busy ? 'Sending…' : 'Submit request'}
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setMode(null);
                  setReason('');
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 'calc(var(--space-unit) * 2)', flexWrap: 'wrap' }}>
            {application.status === 'invited' ||
            application.status === 'scheduled' ||
            application.status === 'in_progress' ? (
              <Link
                href="/candidate/assessment/readiness"
                className="inline-flex min-h-target items-center rounded-control bg-blue px-4 font-semibold text-paper no-underline hover:brightness-95"
              >
                {application.status === 'in_progress'
                  ? 'Continue assessment'
                  : 'Prepare assessment'}
              </Link>
            ) : null}
            {hasDecision ? (
              <>
                <Button variant="secondary" onClick={() => setMode('explanation')}>
                  Request an explanation
                </Button>
                <Button variant="secondary" onClick={() => setMode('human_review')}>
                  Request a human review
                </Button>
              </>
            ) : null}
            {canWithdraw ? (
              <Button variant="danger" disabled={busy} onClick={() => void withdraw()}>
                {busy ? 'Withdrawing…' : 'Withdraw'}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
}

function ApplicationsList({
  data,
  onChanged,
}: {
  data: Collection<CandidateApplicationView>;
  onChanged: () => void;
}): React.JSX.Element {
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'calc(var(--space-unit) * 3)',
      }}
    >
      {data.items.map((application) => (
        <li key={application.id}>
          <ApplicationCard application={application} onChanged={onChanged} />
        </li>
      ))}
    </ul>
  );
}

export default function ApplicationsPage(): React.JSX.Element {
  const headingId = useId();
  const loader = useCallback(() => apiClient.getApplications(), []);
  const { state, reload } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Applications"
        headingId={headingId}
        description="Every assessment you have been invited to, its status, and any decision a person has made."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="applications"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No applications yet"
        emptyBody="When an employer invites you to an assessment it will appear here."
      >
        {(data) => <ApplicationsList data={data} onChanged={reload} />}
      </AsyncBoundary>
    </section>
  );
}
