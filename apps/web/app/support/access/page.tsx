'use client';
import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import { apiClient } from '../../lib/api-client';

interface JitAccessSession {
  readonly id: string;
  readonly grantedTo: string;
  readonly scope: string;
  readonly justification: string;
  readonly grantedAt: string;
  readonly expiresAt: string;
  readonly status: 'active' | 'expired' | 'revoked';
  readonly actions: Array<{
    readonly id: string;
    readonly action: string;
    readonly timestamp: string;
    readonly outcome: string;
  }>;
}

export default function JitAccessSessionPage() {
  const headingId = useId();
  const [data, setData] = useState<{ sessions: JitAccessSession[] } | null>(null);
  const [showRequest, setShowRequest] = useState(false);

  const loader = useCallback(async () => {
    const result = await apiClient.getJitAccessSessions();
    setData(result);
    return result;
  }, []);

  const { state, reload } = useAsync<{ sessions: JitAccessSession[] }>(loader);

  const handleRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const scope = (formData.get('scope') as string) || '';
    const justification = (formData.get('justification') as string) || '';

    if (!scope.trim() || justification.trim().length < 20) return;

    await apiClient.requestJitAccess(scope.trim(), justification.trim());
    const updated = await apiClient.getJitAccessSessions();
    setData(updated);
    setShowRequest(false);
  };

  const handleRevoke = async (sessionId: string) => {
    await apiClient.revokeJitAccess(sessionId);
    const updated = await apiClient.getJitAccessSessions();
    setData(updated);
  };

  const statusTone = {
    active: 'success',
    expired: 'neutral',
    revoked: 'danger',
  } as const;

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="JIT access session"
        description="Grant time-bound elevated permissions with audit trail."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="JIT access sessions"
        isEmpty={(data) => !data || data.sessions.length === 0}
        emptyTitle="No access sessions"
        emptyBody="Just-in-time access sessions will appear here."
      >
        {() => (
          <div className="space-y-6">
            <Card
              aria-label="Request access"
              style={{ borderLeft: '3px solid var(--color-amber)' }}
            >
              <div className="space-y-3">
                <div>
                  <StatusBadge tone="warning">Privileged access</StatusBadge>
                  <h2 className="text-base font-semibold text-ink mt-2">Just-in-time access</h2>
                </div>
                <p className="text-sm text-ink">
                  Request temporary elevated permissions with explicit justification. All actions
                  are logged and audited.
                </p>
                {!showRequest && (
                  <Button variant="primary" onClick={() => setShowRequest(true)}>
                    Request access
                  </Button>
                )}
              </div>
            </Card>

            {showRequest && (
              <Card aria-label="Access request form">
                <h2 className="text-base font-semibold text-ink mb-4">Request elevated access</h2>
                <form onSubmit={handleRequest} className="space-y-4">
                  <div>
                    <label htmlFor="scope" className={labelStyle}>
                      Scope
                    </label>
                    <select id="scope" name="scope" required className={fieldStyle}>
                      <option value="">Select scope</option>
                      <option value="candidate_data">Candidate data access</option>
                      <option value="assessment_override">Assessment override</option>
                      <option value="system_config">System configuration</option>
                      <option value="audit_logs">Audit log access</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="justification" className={labelStyle}>
                      Justification
                    </label>
                    <textarea
                      id="justification"
                      name="justification"
                      required
                      minLength={20}
                      rows={4}
                      placeholder="Explain why elevated access is needed (minimum 20 characters)"
                      className={fieldStyle}
                    />
                    <p className="text-xs text-muted mt-2">
                      Access will expire after 30 minutes. All actions are logged.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" variant="primary">
                      Request access
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setShowRequest(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {data && data.sessions.length > 0 && (
              <div className="space-y-4">
                {data.sessions.map((session) => (
                  <Card key={session.id} aria-label={`Session: ${session.scope}`}>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-semibold text-ink">{session.scope}</h3>
                            <StatusBadge tone={statusTone[session.status]}>
                              {session.status}
                            </StatusBadge>
                          </div>
                          <p className="text-sm text-muted">Granted to: {session.grantedTo}</p>
                        </div>
                        {session.status === 'active' && (
                          <Button
                            variant="danger"

                            onClick={() => handleRevoke(session.id)}
                          >
                            Revoke
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-muted">Justification:</span>
                          <p className="text-sm text-ink mt-1">{session.justification}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium text-muted">Granted at:</span>
                            <p className="text-sm text-ink mt-1">
                              {new Date(session.grantedAt).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-muted">Expires at:</span>
                            <p className="text-sm text-ink mt-1">
                              {new Date(session.expiresAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {session.actions.length > 0 && (
                        <div className="pt-4 border-t border-line">
                          <h4 className="text-sm font-medium text-ink mb-3">Actions taken</h4>
                          <div className="space-y-2">
                            {session.actions.map((action) => (
                              <div
                                key={action.id}
                                className="flex items-center justify-between text-sm py-2"
                              >
                                <span className="text-ink">{action.action}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-muted">{action.outcome}</span>
                                  <span className="text-muted">
                                    {new Date(action.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
