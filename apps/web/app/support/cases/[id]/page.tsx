'use client';
import { useCallback, useId, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../components/PageHeader';
import { Card } from '../../../components/Card';
import { AsyncBoundary } from '../../../components/AsyncBoundary';
import { StatusBadge } from '../../../components/StatusBadge';
import { useAsync } from '../../../lib/useAsync';
import { apiClient } from '../../../lib/api-client';
import type { SupportCaseDetail } from '../../../lib/types';

export default function SupportCaseWorkspacePage() {
  const headingId = useId();
  const params = useParams<{ id: string }>();
  const caseId = params?.id || '';
  const [data, setData] = useState<SupportCaseDetail | null>(null);
  const [showReply, setShowReply] = useState(false);

  const loader = useCallback(async () => {
    const caseDetail = await apiClient.getSupportCase(caseId);
    setData(caseDetail);
    return caseDetail;
  }, [caseId]);

  const { state, reload } = useAsync<SupportCaseDetail>(loader);

  const handleReply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const content = (formData.get('content') as string) || '';
    const internal = formData.get('internal') === 'on';

    if (content.trim().length < 10) return;

    await apiClient.addSupportMessage(caseId, content.trim(), internal);
    setData((current) =>
      current
        ? {
            ...current,
            messages: [
              ...current.messages,
              {
                id: `uat-message-${Date.now()}`,
                author: 'Support agent',
                content: content.trim(),
                timestamp: new Date().toISOString(),
                internal,
              },
            ],
          }
        : current,
    );
    form.reset();
    setShowReply(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    await apiClient.updateSupportCaseStatus(caseId, newStatus);
    setData((current) =>
      current
        ? {
            ...current,
            status: newStatus as SupportCaseDetail['status'],
          }
        : current,
    );
  };

  const priorityTone = {
    low: 'neutral',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  } as const;

  const statusTone = {
    new: 'info',
    assigned: 'warning',
    in_progress: 'warning',
    escalated: 'danger',
    resolved: 'success',
  } as const;

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title={data?.ticketNumber || 'Support case'}
        description="Investigate, message candidate and resolve with audit trail."
        headingId={headingId}
      />

      <AsyncBoundary state={state} onRetry={reload} label="Support case">
        {() => (
          <div className="space-y-6">
            <Card aria-label="Case details">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-ink">{data?.subject}</h2>
                    <p className="text-sm text-muted mt-1">{data?.category}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge tone={priorityTone[data?.priority || 'low']}>
                      {data?.priority ?? ''}
                    </StatusBadge>
                    <StatusBadge tone={statusTone[data?.status || 'new']}>
                      {data?.status?.replace('_', ' ') ?? ''}
                    </StatusBadge>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-4 pt-4 border-t border-line">
                  <div>
                    <dt className="text-sm font-medium text-muted">Requester</dt>
                    <dd className="text-sm text-ink mt-1">{data?.requester}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted">Assigned to</dt>
                    <dd className="text-sm text-ink mt-1">{data?.assignedTo || 'Unassigned'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted">Created</dt>
                    <dd className="text-sm text-ink mt-1">
                      {data?.createdAt && new Date(data.createdAt).toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted">Ticket number</dt>
                    <dd className="text-sm text-ink mt-1">{data?.ticketNumber}</dd>
                  </div>
                </dl>

                <div className="pt-4 border-t border-line">
                  <h3 className="text-sm font-medium text-ink mb-2">Description</h3>
                  <p className="text-sm text-ink">{data?.description}</p>
                </div>

                <div className="flex gap-2 pt-4 border-t border-line">
                  <select
                    value={data?.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={fieldStyle + ' w-48'}
                  >
                    <option value="new">New</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In progress</option>
                    <option value="escalated">Escalated</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <Button variant="primary" onClick={() => setShowReply(!showReply)}>
                    {showReply ? 'Cancel reply' : 'Add message'}
                  </Button>
                </div>
              </div>
            </Card>

            {showReply && (
              <Card aria-label="Reply to case">
                <h3 className="text-base font-semibold text-ink mb-4">Add message</h3>
                <form onSubmit={handleReply} className="space-y-4">
                  <div>
                    <label htmlFor="content" className={labelStyle}>
                      Message
                    </label>
                    <textarea
                      id="content"
                      name="content"
                      required
                      minLength={10}
                      rows={6}
                      placeholder="Type your message (minimum 10 characters)"
                      className={fieldStyle}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="internal"
                      name="internal"
                      className="rounded border-line text-blue focus:ring-blue"
                    />
                    <label htmlFor="internal" className="text-sm text-ink">
                      Internal note (not visible to requester)
                    </label>
                  </div>
                  <Button type="submit" variant="primary">
                    Send message
                  </Button>
                </form>
              </Card>
            )}

            <Card aria-label="Message history">
              <h3 className="text-base font-semibold text-ink mb-4">Message history</h3>
              <div className="space-y-4">
                {data?.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-md ${
                      message.internal ? 'bg-amber-soft border border-amber' : 'bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <span className="text-sm font-medium text-ink">{message.author}</span>
                      <div className="flex items-center gap-2">
                        {message.internal && <StatusBadge tone="warning">Internal</StatusBadge>}
                        <span className="text-xs text-muted">
                          {new Date(message.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-ink whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
