'use client';

import Link from 'next/link';
import { useCallback, useId } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { AsyncBoundary } from '../components/AsyncBoundary';
import { apiClient } from '../lib/api-client';
import { useAsync } from '../lib/useAsync';
import type { CandidateApplicationView, Collection, ScheduleSlotView } from '../lib/types';

interface HomeData {
  readonly applications: Collection<CandidateApplicationView>;
  readonly schedule: Collection<ScheduleSlotView>;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function SummaryTile({
  href,
  label,
  value,
  hint,
}: {
  href: string;
  label: string;
  value: string;
  hint: string;
}): React.JSX.Element {
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Card style={{ height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-unit)' }}>
          <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>{label}</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 700 }}>{value}</span>
          <span style={{ color: 'var(--color-blue)', fontSize: '0.85rem' }}>{hint}</span>
        </div>
      </Card>
    </Link>
  );
}

export default function CandidateHomePage(): React.JSX.Element {
  const headingId = useId();
  const loader = useCallback(async (): Promise<HomeData> => {
    const [applications, schedule] = await Promise.all([
      apiClient.getApplications(),
      apiClient.getSchedule(),
    ]);
    return { applications, schedule };
  }, []);
  const { state, reload } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Your assessments"
        headingId={headingId}
        description="Track persisted invitations, decisions and the preparation steps for your assessments."
      />
      <AsyncBoundary state={state} onRetry={reload} label="your dashboard">
        {(data) => {
          const open = data.applications.items.filter(
            (a) => a.status !== 'withdrawn' && a.status !== 'decision_available',
          );
          const decisions = data.applications.items.filter(
            (a) => a.status === 'decision_available',
          );
          const nextSlot = data.schedule.items.find((s) => s.selected) ?? data.schedule.items[0];
          return (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(var(--space-unit) * 5)',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gap: 'calc(var(--space-unit) * 4)',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                }}
              >
                <SummaryTile
                  href="/candidate/applications"
                  label="Open applications"
                  value={String(open.length)}
                  hint="View applications"
                />
                <SummaryTile
                  href="/candidate/applications"
                  label="Decisions available"
                  value={String(decisions.length)}
                  hint="Review decisions"
                />
                <SummaryTile
                  href="/candidate/schedule"
                  label="Time slots offered"
                  value={String(data.schedule.total)}
                  hint="Choose a slot"
                />
              </div>

              <Card aria-label="What happens next">
                <h2 style={{ marginBlockStart: 0, fontSize: '1.1rem' }}>What happens next</h2>
                {nextSlot ? (
                  <p style={{ margin: 0 }}>
                    Your next assessment, <strong>{nextSlot.assessmentTitle}</strong>, is
                    {nextSlot.selected ? ' booked for ' : ' available from '}
                    {formatDateTime(nextSlot.startsAt)} ({nextSlot.timezone}). It runs in a
                    supervised desktop environment.{' '}
                    <Link href="/candidate/schedule">Manage scheduling</Link>.
                  </p>
                ) : (
                  <p style={{ margin: 0, color: 'var(--color-muted)' }}>
                    You have no upcoming assessments scheduled.
                  </p>
                )}
                <p style={{ margin: 0 }}>
                  <Link href="/candidate/assessment/readiness">Go to assessment readiness</Link> to
                  run your pre-checks and begin.
                </p>
                <p style={{ marginBlockEnd: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                  Your assessment is reviewed by a qualified person. You will never be scored or
                  ranked automatically, and any AI observations are only ever aids to a human
                  reviewer. <StatusBadge tone="info">Human-reviewed</StatusBadge>
                </p>
              </Card>
            </div>
          );
        }}
      </AsyncBoundary>
    </section>
  );
}
