'use client';

import { useId, useState, type FormEvent } from 'react';
import { Button, Field, Input } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';

export default function SupportPage(): React.JSX.Element {
  const headingId = useId();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ subject?: string; message?: string }>({});
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const next: { subject?: string; message?: string } = {};
    if (subject.trim() === '') next.subject = 'Enter a subject.';
    if (message.trim().length < 10) next.message = 'Add a few more details (10+ characters).';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSent(true);
    setSubject('');
    setMessage('');
  }

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Support"
        headingId={headingId}
        description="Find help or contact the support team."
      />
      <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 5)' }}>
        <Card as="article" aria-label="Help resources">
          <h2 style={{ marginBlockStart: 0, fontSize: '1.1rem' }}>Common questions</h2>
          <ul style={{ margin: 0, paddingInlineStart: 'calc(var(--space-unit) * 5)' }}>
            <li>Update your password from the sign-in screen’s “Reset your password” link.</li>
            <li>Review devices signed in to your account under Sessions.</li>
            <li>Acknowledge policy updates from Notices to clear outstanding actions.</li>
          </ul>
        </Card>

        <Card as="article" aria-label="Contact support">
          <h2 style={{ marginBlockStart: 0, fontSize: '1.1rem' }}>Contact support</h2>
          {sent ? (
            <p role="status" style={{ margin: 0, color: 'var(--color-sage)' }}>
              Thanks — your message has been sent. Our team will reply by email.
            </p>
          ) : (
            <form
              onSubmit={onSubmit}
              noValidate
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(var(--space-unit) * 4)',
              }}
            >
              <Field label="Subject" required error={errors.subject}>
                {({ id, invalid, describedBy }) => (
                  <Input
                    id={id}
                    value={subject}
                    invalid={invalid}
                    aria-describedby={describedBy}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                )}
              </Field>
              <Field label="How can we help?" required error={errors.message}>
                {({ id, invalid, describedBy }) => (
                  <textarea
                    id={id}
                    value={message}
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    style={{
                      borderRadius: 'var(--radius-control)',
                      border: `1px solid ${invalid ? 'var(--color-red)' : 'var(--color-line)'}`,
                      padding: 'calc(var(--space-unit) * 2) calc(var(--space-unit) * 3)',
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      color: 'var(--color-ink)',
                      background: 'var(--color-paper)',
                      resize: 'vertical',
                    }}
                  />
                )}
              </Field>
              <div>
                <Button type="submit">Send message</Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </section>
  );
}
