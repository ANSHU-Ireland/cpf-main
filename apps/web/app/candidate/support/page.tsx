'use client';
import { useCallback, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import type { Collection } from '../../lib/types';
import { apiClient } from '../../lib/api-client';

interface SupportTicket {
  readonly id: string;
  readonly subject: string;
  readonly category: string;
  readonly status: 'open' | 'in_progress' | 'resolved' | 'closed';
  readonly priority: 'low' | 'medium' | 'high';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export default function CandidateSupportPage() {
  const headingId = useId();
  const router = useRouter();
  const [data, setData] = useState<Collection<SupportTicket> | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loader = useCallback(async () => {
    const tickets = await apiClient.getCandidateTickets();
    setData(tickets);
    return tickets;
  }, []);

  const { state, reload } = useAsync<Collection<SupportTicket>>(loader);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const subject = (formData.get('subject') as string) || '';
    const category = (formData.get('category') as string) || '';
    const description = (formData.get('description') as string) || '';

    if (!subject.trim() || !category.trim() || description.trim().length < 20) return;

    await apiClient.createCandidateTicket({
      subject: subject.trim(),
      category: category.trim(),
      description: description.trim(),
    });

    form.reset();
    setShowForm(false);
    const updated = await apiClient.getCandidateTickets();
    setData(updated);
  };

  const statusTone = {
    open: 'info',
    in_progress: 'warning',
    resolved: 'success',
    closed: 'neutral',
  } as const;

  const priorityTone = {
    low: 'neutral',
    medium: 'warning',
    high: 'danger',
  } as const;

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Candidate support"
        description="Raise queries, report incidents and track resolution."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="Support tickets"
        isEmpty={(data) => !data || data.total === 0}
        emptyTitle="No support tickets"
        emptyBody="Your support requests will appear here."
      >
        {() => (
          <div className="space-y-6">
            <Card aria-label="Support actions">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-ink">Your support requests</h2>
                  <p className="text-sm text-muted mt-1">
                    {data?.total || 0} {data?.total === 1 ? 'ticket' : 'tickets'}
                  </p>
                </div>
                {!showForm && (
                  <Button variant="primary" onClick={() => setShowForm(true)}>
                    Create ticket
                  </Button>
                )}
              </div>
            </Card>

            {showForm && (
              <Card aria-label="New support ticket">
                <h2 className="text-base font-semibold text-ink mb-4">Create support ticket</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="subject" className={labelStyle}>
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      required
                      minLength={4}
                      placeholder="Brief summary of your issue"
                      className={fieldStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor="category" className={labelStyle}>
                      Category
                    </label>
                    <select id="category" name="category" required className={fieldStyle}>
                      <option value="">Select category</option>
                      <option value="Technical">Technical issue</option>
                      <option value="Application">Application query</option>
                      <option value="Assessment">Assessment support</option>
                      <option value="Account">Account access</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="description" className={labelStyle}>
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      required
                      minLength={20}
                      rows={6}
                      placeholder="Provide detailed information about your issue (minimum 20 characters)"
                      className={fieldStyle}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" variant="primary">
                      Submit ticket
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {data && data.items.length > 0 && (
              <div className="space-y-3">
                {data.items.map((ticket: SupportTicket) => (
                  <div
                    key={ticket.id}
                    onClick={() => router.push(`/candidate/support/${ticket.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Card aria-label={ticket.subject}>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-ink">{ticket.subject}</h3>
                            <p className="text-sm text-muted mt-1">{ticket.category}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <StatusBadge tone={statusTone[ticket.status]}>
                              {ticket.status.replace('_', ' ')}
                            </StatusBadge>
                            <StatusBadge tone={priorityTone[ticket.priority]}>
                              {ticket.priority}
                            </StatusBadge>
                          </div>
                        </div>
                        <div className="flex gap-4 text-xs text-muted">
                          <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                          <span>Updated: {new Date(ticket.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
