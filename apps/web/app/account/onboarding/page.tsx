'use client';

import { useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';

const STEPS = ['Basics', 'Configuration', 'Review', 'Confirm'] as const;
const TASKS = [
  {
    id: 'notice',
    title: 'Read the workspace notice',
    detail: 'Review how CPF uses assessment data.',
  },
  {
    id: 'profile',
    title: 'Confirm your profile',
    detail: 'Check your display name and account email.',
  },
  {
    id: 'preferences',
    title: 'Choose preferences',
    detail: 'Set timezone, locale and motion preferences.',
  },
] as const;

export default function AccountOnboardingPage(): React.JSX.Element {
  const headingId = useId();
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<ReadonlySet<string>>(() => new Set());

  function toggleTask(id: string): void {
    setCompleted((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allTasksComplete = completed.size === TASKS.length;

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        headingId={headingId}
        title="Notices and onboarding"
        description="Complete role-specific notices and onboarding tasks."
      />
      <ol
        aria-label="Onboarding progress"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          listStyle: 'none',
          margin: '0 0 28px',
          padding: 0,
        }}
      >
        {STEPS.map((label, index) => (
          <li
            key={label}
            style={{
              textAlign: 'center',
              color: index <= step ? 'var(--color-blue)' : 'var(--color-muted)',
            }}
          >
            <span
              aria-current={index === step ? 'step' : undefined}
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 32,
                height: 32,
                margin: '0 auto 8px',
                borderRadius: '50%',
                border: `1px solid ${index <= step ? 'var(--color-blue)' : 'var(--color-line)'}`,
                background: index === step ? 'var(--color-blue)' : 'var(--color-paper)',
                color: index === step ? 'var(--color-paper)' : 'inherit',
                fontWeight: 700,
              }}
            >
              {index + 1}
            </span>
            <span style={{ fontWeight: index === step ? 600 : 400 }}>{label}</span>
          </li>
        ))}
      </ol>

      <Card aria-label={`${STEPS[step]} step`}>
        <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>{STEPS[step]}</h2>
        {step === 0 ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {TASKS.map((task) => (
              <label
                key={task.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  padding: 16,
                  border: '1px solid var(--color-line)',
                  borderRadius: 'var(--radius-control)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={completed.has(task.id)}
                  onChange={() => toggleTask(task.id)}
                  style={{ width: 20, height: 20 }}
                />
                <span>
                  <strong style={{ display: 'block' }}>{task.title}</strong>
                  <span style={{ color: 'var(--color-muted)' }}>{task.detail}</span>
                </span>
              </label>
            ))}
          </div>
        ) : null}
        {step === 1 ? (
          <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, margin: 0 }}>
            <dt style={{ color: 'var(--color-muted)' }}>Role journey</dt>
            <dd style={{ margin: 0 }}>Candidate</dd>
            <dt style={{ color: 'var(--color-muted)' }}>Locale</dt>
            <dd style={{ margin: 0 }}>English (Ireland)</dd>
            <dt style={{ color: 'var(--color-muted)' }}>Timezone</dt>
            <dd style={{ margin: 0 }}>Europe/Dublin</dd>
          </dl>
        ) : null}
        {step === 2 ? (
          <div>
            <p style={{ marginTop: 0 }}>
              All required notices and preferences are ready to acknowledge.
            </p>
            <p style={{ marginBottom: 0, color: 'var(--color-muted)' }}>
              {completed.size} of {TASKS.length} tasks complete.
            </p>
          </div>
        ) : null}
        {step === 3 ? (
          <div role="status">
            <p style={{ marginTop: 0, fontWeight: 600, color: 'var(--color-sage)' }}>
              Onboarding complete
            </p>
            <p style={{ marginBottom: 0 }}>
              Your acknowledgement has been recorded in the synthetic audit trail.
            </p>
          </div>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 24 }}>
          <Button
            variant="secondary"
            disabled={step === 0}
            onClick={() => setStep((value) => Math.max(0, value - 1))}
          >
            Back
          </Button>
          <Button
            disabled={(step === 0 && !allTasksComplete) || step === STEPS.length - 1}
            onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))}
          >
            {step === 2 ? 'Acknowledge and continue' : 'Continue'}
          </Button>
        </div>
      </Card>
    </section>
  );
}
