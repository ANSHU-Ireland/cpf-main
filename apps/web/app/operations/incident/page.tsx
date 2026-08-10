'use client';
import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import { apiClient } from '../../lib/api-client';

interface SecurityIncident {
  readonly id: string;
  readonly title: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly status: 'active' | 'contained' | 'resolved';
  readonly detectedAt: string;
}

interface KillSwitchStatus {
  readonly enabled: boolean;
  readonly reason?: string;
  readonly enabledAt?: string;
  readonly enabledBy?: string;
}

export default function SecurityIncidentPage() {
  const headingId = useId();
  const [data, setData] = useState<{
    incidents: SecurityIncident[];
    killSwitch: KillSwitchStatus;
  } | null>(null);
  const [showKillConfirm, setShowKillConfirm] = useState(false);

  const loader = useCallback(async () => {
    const result = await apiClient.getSecurityStatus();
    setData(result);
    return result;
  }, []);

  const { state, reload } = useAsync<{
    incidents: SecurityIncident[];
    killSwitch: KillSwitchStatus;
  }>(loader);

  const handleKillSwitch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const reason = (formData.get('reason') as string) || '';

    if (reason.trim().length < 20) return;

    await apiClient.activateKillSwitch(reason.trim());
    const updated = await apiClient.getSecurityStatus();
    setData(updated);
    setShowKillConfirm(false);
  };

  const handleDeactivate = async () => {
    await apiClient.deactivateKillSwitch();
    const updated = await apiClient.getSecurityStatus();
    setData(updated);
  };

  const handleEscalate = async (incidentId: string) => {
    await apiClient.escalateSecurityIncident(incidentId);
    const updated = await apiClient.getSecurityStatus();
    setData(updated);
  };

  const severityTone = {
    low: 'neutral',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  } as const;

  const statusTone = {
    active: 'danger',
    contained: 'warning',
    resolved: 'success',
  } as const;

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Security incident and kill switch"
        description="Respond to incidents and emergency shutdown."
        headingId={headingId}
      />

      <AsyncBoundary state={state} onRetry={reload} label="Security status">
        {() => (
          <div className="space-y-6">
            <Card
              aria-label="Kill switch status"
              style={{
                borderLeft: `3px solid var(--color-${data?.killSwitch.enabled ? 'red' : 'sage'})`,
              }}
            >
              <div className="space-y-4">
                <div>
                  <StatusBadge tone={data?.killSwitch.enabled ? 'danger' : 'success'}>
                    {data?.killSwitch.enabled ? 'System disabled' : 'System operational'}
                  </StatusBadge>
                  <h2 className="text-base font-semibold text-ink mt-2">Emergency kill switch</h2>
                </div>

                {data?.killSwitch.enabled ? (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm text-red font-medium">
                        ⚠️ System is currently disabled. All assessments are suspended.
                      </p>
                      <div>
                        <span className="text-sm font-medium text-muted">Reason:</span>
                        <p className="text-sm text-ink mt-1">{data.killSwitch.reason}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-muted">Enabled at:</span>
                          <p className="text-sm text-ink mt-1">
                            {data.killSwitch.enabledAt &&
                              new Date(data.killSwitch.enabledAt).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted">Enabled by:</span>
                          <p className="text-sm text-ink mt-1">{data.killSwitch.enabledBy}</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="primary" onClick={handleDeactivate}>
                      Deactivate kill switch
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-ink">
                      The kill switch immediately disables all assessment activity. Use only in
                      genuine emergency situations (security breach, data integrity issue, critical
                      system failure).
                    </p>
                    {!showKillConfirm && (
                      <Button variant="danger" onClick={() => setShowKillConfirm(true)}>
                        Activate kill switch
                      </Button>
                    )}
                  </>
                )}
              </div>
            </Card>

            {showKillConfirm && !data?.killSwitch.enabled && (
              <Card
                aria-label="Confirm kill switch"
                style={{ borderLeft: '3px solid var(--color-red)' }}
              >
                <h2 className="text-base font-semibold text-ink mb-4">
                  Confirm emergency shutdown
                </h2>
                <form onSubmit={handleKillSwitch} className="space-y-4">
                  <div className="p-3 bg-red-soft rounded-md">
                    <p className="text-sm text-red font-medium">
                      This will immediately stop all active assessments. Candidates will be unable
                      to continue. This action is logged and audited.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="reason" className={labelStyle}>
                      Reason for emergency shutdown
                    </label>
                    <textarea
                      id="reason"
                      name="reason"
                      required
                      minLength={20}
                      rows={4}
                      placeholder="Provide detailed justification (minimum 20 characters)"
                      className={fieldStyle}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" variant="danger">
                      Confirm activation
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowKillConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            <Card aria-label="Security incidents">
              <h2 className="text-base font-semibold text-ink mb-4">Active security incidents</h2>
              {data && data.incidents.length === 0 ? (
                <p className="text-sm text-muted">No active security incidents</p>
              ) : (
                <div className="space-y-3">
                  {data?.incidents.map((incident) => (
                    <div
                      key={incident.id}
                      className="flex items-start justify-between gap-4 p-3 rounded-md bg-neutral-50"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge tone={severityTone[incident.severity]}>
                            {incident.severity}
                          </StatusBadge>
                          <StatusBadge tone={statusTone[incident.status]}>
                            {incident.status}
                          </StatusBadge>
                        </div>
                        <h3 className="text-sm font-semibold text-ink">{incident.title}</h3>
                        <p className="text-xs text-muted">
                          Detected: {new Date(incident.detectedAt).toLocaleString()}
                        </p>
                      </div>
                      {incident.status === 'active' && (
                        <Button variant="danger" onClick={() => handleEscalate(incident.id)}>
                          Escalate
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
