'use client';
import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsync } from '../../lib/useAsync';
import type { Collection } from '../../lib/types';
import { apiClient } from '../../lib/api-client';

interface NotificationPreference {
  readonly id: string;
  readonly channel: 'email' | 'in_app' | 'sms';
  readonly category: string;
  readonly enabled: boolean;
  readonly mandatory: boolean;
}

export default function AccountNotificationsPage() {
  const headingId = useId();
  const [data, setData] = useState<Collection<NotificationPreference> | null>(null);

  const loader = useCallback(async () => {
    const prefs = await apiClient.getNotificationPreferences();
    setData(prefs);
    return prefs;
  }, []);

  const { state, reload } = useAsync<Collection<NotificationPreference>>(loader);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates: Array<{
      channel: string;
      category: string;
      enabled: boolean;
    }> = [];

    data?.items.forEach((pref) => {
      if (!pref.mandatory) {
        const enabled = formData.get(`${pref.channel}-${pref.category}`) === 'on';
        updates.push({
          channel: pref.channel,
          category: pref.category,
          enabled,
        });
      }
    });

    await apiClient.updateNotificationPreferences(updates);
    const updated = await apiClient.getNotificationPreferences();
    setData(updated);
  };

  const groupedByChannel = data?.items.reduce(
    (acc, pref) => {
      if (!acc[pref.channel]) acc[pref.channel] = [];
      acc[pref.channel]?.push(pref);
      return acc;
    },
    {} as Record<string, NotificationPreference[]>,
  );

  const channelLabels = {
    email: 'Email',
    in_app: 'In-app notifications',
    sms: 'SMS',
  };

  return (
    <>
      <PageHeader
        title="Notification preferences"
        description="Control channel and event-level communications."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="Notification preferences"
        isEmpty={(data) => !data || data.total === 0}
        emptyTitle="No preferences available"
        emptyBody="Notification preferences will appear here."
      >
        {() => (
          <form onSubmit={handleSave}>
            <Card aria-label="Notification preferences">
              <h2 className="text-base font-semibold text-ink mb-4">Manage preferences</h2>
              <div className="space-y-6">
                {groupedByChannel &&
                  Object.entries(groupedByChannel).map(([channel, prefs]) => (
                    <div key={channel} className="space-y-3">
                      <h3 className="text-sm font-medium text-ink">
                        {channelLabels[channel as keyof typeof channelLabels]}
                      </h3>
                      <div className="space-y-2">
                        {prefs.map((pref) => (
                          <div key={pref.id} className="flex items-center justify-between py-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <label htmlFor={pref.id} className="text-sm text-ink">
                                  {pref.category}
                                </label>
                                {pref.mandatory && (
                                  <span className="text-xs text-muted">(Required)</span>
                                )}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              id={pref.id}
                              name={`${pref.channel}-${pref.category}`}
                              defaultChecked={pref.enabled}
                              disabled={pref.mandatory}
                              className="rounded border-line text-blue focus:ring-blue disabled:opacity-50"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="mt-6 pt-4 border-t border-line">
                <p className="text-sm text-muted mb-4">
                  Mandatory notifications cannot be disabled. Changes take effect immediately.
                </p>
                <Button type="submit" variant="primary">
                  Save preferences
                </Button>
              </div>
            </Card>
          </form>
        )}
      </AsyncBoundary>
    </>
  );
}
