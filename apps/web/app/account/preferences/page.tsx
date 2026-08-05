'use client';

import { useCallback, useId, useState, type FormEvent } from 'react';
import { Button, Field, Input } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { DensityPreference, PreferencesView, ThemePreference } from '../../lib/types';

const THEME_OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Match system' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'high_contrast', label: 'High contrast' },
];

const DENSITY_OPTIONS: readonly { value: DensityPreference; label: string }[] = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
];

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function PreferencesForm({ initial }: { initial: PreferencesView }): React.JSX.Element {
  const selectId = useId();
  const [form, setForm] = useState<PreferencesView>(initial);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaveState('saving');
    setError(null);
    try {
      const updated = await apiClient.updatePreferences(form);
      setForm(updated);
      setSaveState('saved');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save preferences.');
      setSaveState('error');
    }
  }

  return (
    <Card aria-label="Preference settings">
      <form
        onSubmit={onSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 5)' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-unit)' }}>
          <label htmlFor={`${selectId}-theme`} style={{ fontWeight: 600 }}>
            Theme
          </label>
          <select
            id={`${selectId}-theme`}
            value={form.theme}
            onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value as ThemePreference }))}
            style={{
              minBlockSize: 'var(--target-min)',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--color-line)',
              paddingInline: 'calc(var(--space-unit) * 3)',
              background: 'var(--color-paper)',
              color: 'var(--color-ink)',
              fontFamily: 'inherit',
            }}
          >
            {THEME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-unit)' }}>
          <label htmlFor={`${selectId}-density`} style={{ fontWeight: 600 }}>
            Density
          </label>
          <select
            id={`${selectId}-density`}
            value={form.density}
            onChange={(e) =>
              setForm((f) => ({ ...f, density: e.target.value as DensityPreference }))
            }
            style={{
              minBlockSize: 'var(--target-min)',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--color-line)',
              paddingInline: 'calc(var(--space-unit) * 3)',
              background: 'var(--color-paper)',
              color: 'var(--color-ink)',
              fontFamily: 'inherit',
            }}
          >
            {DENSITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <Field label="Locale">
          {({ id }) => (
            <Input
              id={id}
              value={form.locale}
              onChange={(e) => setForm((f) => ({ ...f, locale: e.target.value }))}
            />
          )}
        </Field>

        <Field label="Timezone">
          {({ id }) => (
            <Input
              id={id}
              value={form.timezone}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            />
          )}
        </Field>

        <label
          style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--space-unit) * 2)' }}
        >
          <input
            type="checkbox"
            checked={form.reducedMotion}
            onChange={(e) => setForm((f) => ({ ...f, reducedMotion: e.target.checked }))}
            style={{ inlineSize: '1.15rem', blockSize: '1.15rem' }}
          />
          <span>Reduce motion and animation</span>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--space-unit) * 3)' }}>
          <Button type="submit" disabled={saveState === 'saving'}>
            {saveState === 'saving' ? 'Saving…' : 'Save preferences'}
          </Button>
          {saveState === 'saved' ? (
            <span role="status" style={{ color: 'var(--color-sage)' }}>
              Preferences saved.
            </span>
          ) : null}
          {saveState === 'error' && error ? (
            <span role="alert" style={{ color: 'var(--color-red)' }}>
              {error}
            </span>
          ) : null}
        </div>
      </form>
    </Card>
  );
}

export default function PreferencesPage(): React.JSX.Element {
  const headingId = useId();
  const loader = useCallback(() => apiClient.getPreferences(), []);
  const { state, reload } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Preferences"
        headingId={headingId}
        description="Personalise how the workspace looks and behaves for you."
      />
      <AsyncBoundary state={state} onRetry={reload} label="your preferences">
        {(prefs) => <PreferencesForm initial={prefs} />}
      </AsyncBoundary>
    </section>
  );
}
