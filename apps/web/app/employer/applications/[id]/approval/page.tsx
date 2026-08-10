'use client';

import { useCallback, useId, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { ApprovalStatus, DecisionApprovalView, DecisionOutcome } from '../../../../lib/types';

const TONE: Record<ApprovalStatus, BadgeTone> = {
  awaiting_review: 'neutral',
  awaiting_approval: 'warning',
  approved: 'success',
  issued: 'success',
  returned: 'danger',
};

const OUTCOME_LABEL: Record<DecisionOutcome, string> = {
  progress: 'Progress',
  hold: 'Hold',
  live_verification: 'Live verification',
  reattempt: 'Reattempt',
  not_progress: 'Do not progress',
  withdrawn: 'Withdrawn',
};

const TABS = ['Decision', 'Evidence', 'Controls', 'History'] as const;
type Tab = (typeof TABS)[number];

function formatDate(iso: string | null): string {
  return iso === null
    ? '—'
    : new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ApprovalPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const load = useCallback(() => apiClient.getApproval(id), [id]);
  const { state, reload, setData } = useAsync<DecisionApprovalView>(load);

  return (
    <AsyncBoundary state={state} onRetry={reload} label="approval">
      {(approval) => <ApprovalWorkspace id={id} approval={approval} onChanged={setData} />}
    </AsyncBoundary>
  );
}

function ApprovalWorkspace({
  id,
  approval,
  onChanged,
}: {
  readonly id: string;
  readonly approval: DecisionApprovalView;
  readonly onChanged: (next: DecisionApprovalView) => void;
}): React.JSX.Element {
  const headingId = useId();
  const returnId = useId();
  const [activeTab, setActiveTab] = useState<Tab>('Decision');
  const [returnRationale, setReturnRationale] = useState(
    'Please clarify the cited evidence and make the rationale more specific.',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actionable = approval.status === 'awaiting_approval';

  async function act(action: 'approve' | 'return'): Promise<void> {
    if (action === 'return' && returnRationale.trim().length < 10) {
      setError('Explain why the decision is being returned (at least 10 characters).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next =
        action === 'approve'
          ? await apiClient.approveDecision(id)
          : await apiClient.returnDecision(id, returnRationale.trim());
      onChanged(next);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not record the approval action.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 5)' }}>
      <PageHeader
        headingId={headingId}
        title="Decision approval and issue"
        description="Apply separation of duties and issue a versioned human decision and notice."
        actions={
          <Button disabled={!actionable || busy} onClick={() => void act('approve')}>
            {busy ? 'Working…' : 'Approve and issue'}
          </Button>
        }
      />
      <div style={{ display: 'flex', gap: 'calc(var(--space-unit) * 2)', alignItems: 'center' }}>
        <StatusBadge tone="info">EMP-21</StatusBadge>
        <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>Governance</span>
        <span style={{ marginLeft: 'auto', color: 'var(--color-blue)', fontWeight: 650 }}>
          Employer Approver · Priya Shah
        </span>
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
            A distinct authorised human approves when tenant policy requires it. The drafter cannot
            approve their own decision.
          </p>
        </section>

        <nav
          aria-label="Approval workspace sections"
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {approval.outcome !== null ? (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <strong>{approval.candidateRef}</strong>
                    <p style={{ margin: '4px 0 0', color: 'var(--color-muted)' }}>
                      {approval.campaignName}
                      {approval.draftedBy ? ` · drafted by ${approval.draftedBy}` : ''}
                    </p>
                  </div>
                  <StatusBadge tone={TONE[approval.status]}>
                    {approval.status.replace('_', ' ')}
                  </StatusBadge>
                </div>
              ) : null}
              <div>
                <strong>Outcome</strong>
                <div style={{ ...readOnlyField, marginTop: 8 }}>
                  {approval.outcome === null
                    ? 'No selection — choose deliberately'
                    : OUTCOME_LABEL[approval.outcome]}
                </div>
              </div>
              <div>
                <strong>Rationale and cited evidence</strong>
                <div style={{ ...readOnlyField, minHeight: 110, marginTop: 8 }}>
                  {approval.rationale?.trim()
                    ? approval.rationale
                    : 'Explain the decision in plain language and link only the evidence needed for this purpose.'}
                </div>
              </div>
              {actionable ? (
                <div>
                  <label htmlFor={returnId} style={{ fontWeight: 650 }}>
                    Return rationale
                  </label>
                  <textarea
                    id={returnId}
                    rows={3}
                    value={returnRationale}
                    onChange={(event) => setReturnRationale(event.target.value)}
                    style={{
                      ...readOnlyField,
                      width: '100%',
                      boxSizing: 'border-box',
                      marginTop: 8,
                      resize: 'vertical',
                      font: 'inherit',
                      background: 'var(--color-paper)',
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : activeTab === 'Evidence' ? (
            <PanelText
              title="Purpose-bound evidence"
              body={
                approval.evidenceLinks.length === 0
                  ? 'No evidence references were cited.'
                  : approval.evidenceLinks.join(' · ')
              }
            />
          ) : activeTab === 'Controls' ? (
            <PanelText
              title="Approval controls"
              body="Distinct approver identity, immutable audit events, idempotent state transitions, and a queued versioned notice are enforced server-side."
            />
          ) : (
            <PanelText
              title="Decision history"
              body={
                approval.status === 'issued'
                  ? `Approved by ${approval.approver ?? 'an authorised approver'} and issued ${formatDate(approval.issuedAt)}.`
                  : approval.status === 'returned'
                    ? `Returned to the drafter: ${approval.returnRationale ?? 'Rationale required.'}`
                    : `Current state: ${approval.status.replace('_', ' ')}.`
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
        {approval.status === 'issued' ? (
          <p role="status" style={{ color: 'var(--color-sage)', fontWeight: 650 }}>
            Approved by {approval.approver}; the decision notice was queued{' '}
            {formatDate(approval.issuedAt)}.
          </p>
        ) : null}
        {approval.status === 'returned' ? (
          <p role="status" style={{ color: 'var(--color-amber)' }}>
            Returned to the drafter. The decision remains editable and cannot be issued yet.
          </p>
        ) : null}
        {approval.status !== 'issued' ? (
          <footer
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              flexWrap: 'wrap',
              marginTop: 28,
            }}
          >
            <Button
              variant="secondary"
              disabled={!actionable || busy}
              onClick={() => void act('return')}
            >
              Return to drafter
            </Button>
            <Button disabled={!actionable || busy} onClick={() => void act('approve')}>
              Approve and issue
            </Button>
          </footer>
        ) : null}
      </Card>
    </div>
  );
}

const readOnlyField: React.CSSProperties = {
  border: '1px solid var(--color-line)',
  borderRadius: 'var(--radius-control)',
  padding: 'calc(var(--space-unit) * 3)',
  color: 'var(--color-ink)',
  background: 'var(--color-paper)',
};

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
