'use client';

import { useCallback, useId, useState } from 'react';
import Link from 'next/link';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, TenantStatus, TenantView } from '../../lib/types';

const TONE: Record<TenantStatus, BadgeTone> = {
  active: 'success',
  trial: 'info',
  suspended: 'warning',
  archived: 'neutral',
};

const fieldStyle: React.CSSProperties = {
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-line)',
  padding: 'calc(var(--space-unit) * 2) calc(var(--space-unit) * 3)',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  color: 'var(--color-ink)',
  background: 'var(--color-paper)',
  width: '100%',
  boxSizing: 'border-box',
};

const linkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 'var(--target-min)',
  padding: '0 calc(var(--space-unit) * 4)',
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-blue)',
  color: 'var(--color-blue)',
  textDecoration: 'none',
  fontWeight: 600,
};

export default function TenantsPage(): React.JSX.Element {
  const headingId = useId();
  const nameId = useId();
  const slugId = useId();
  const regionId = useId();
  const load = useCallback(() => apiClient.getTenants(), []);
  const { state, reload, setData } = useAsync<Collection<TenantView>>(load);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [dataRegion, setDataRegion] = useState('EU');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(current: Collection<TenantView>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const created = await apiClient.createTenant(name.trim(), slug.trim(), dataRegion.trim());
      setData({ items: [created, ...current.items], total: current.total + 1 });
      setName('');
      setSlug('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create the tenant.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Tenant directory"
        description="Search and provision tenants without entering tenant context. No AI output on this surface."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="tenants"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No tenants yet"
        emptyBody="Provision the first tenant to begin."
      >
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card as="section" aria-label="Create tenant">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Create tenant</h2>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 3)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'calc(var(--space-unit) * 1)',
                  }}
                >
                  <label htmlFor={nameId} style={{ fontWeight: 600 }}>
                    Name
                  </label>
                  <input
                    id={nameId}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'calc(var(--space-unit) * 1)',
                  }}
                >
                  <label htmlFor={regionId} style={{ fontWeight: 600 }}>
                    Data region
                  </label>
                  <input
                    id={regionId}
                    value={dataRegion}
                    onChange={(e) => setDataRegion(e.target.value)}
                    placeholder="EU"
                    style={fieldStyle}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'calc(var(--space-unit) * 1)',
                  }}
                >
                  <label htmlFor={slugId} style={{ fontWeight: 600 }}>
                    Slug
                  </label>
                  <input
                    id={slugId}
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="lowercase-hyphenated"
                    style={fieldStyle}
                  />
                </div>
                {error ? (
                  <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                    {error}
                  </p>
                ) : null}
                <div>
                  <Button
                    disabled={
                      busy ||
                      name.trim().length < 2 ||
                      slug.trim().length < 2 ||
                      dataRegion.trim().length < 2
                    }
                    onClick={() => void create(data)}
                  >
                    {busy ? 'Creating…' : 'Create tenant'}
                  </Button>
                </div>
              </div>
            </Card>
            {data.items.map((t) => (
              <Card key={t.id} as="article" aria-label={t.name}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{t.name}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {t.slug} · {t.plan} · {t.staffCount} staff
                    </p>
                  </div>
                  <StatusBadge tone={TONE[t.status]}>{t.status}</StatusBadge>
                </div>
                <div style={{ marginTop: 'calc(var(--space-unit) * 3)' }}>
                  <Link href={`/admin/tenants/${t.id}`} style={linkStyle}>
                    Open tenant
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
