import { describe, it, expect } from 'vitest';
import type { Actor, GetOrganizationResult } from '@cpf/org';
import { handleGetOrganization, type OrganizationService } from './organization.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: ['employer_admin'] };

const orgDto = {
  id: 'tenant-1',
  slug: 'acme',
  legalName: 'Acme Ltd',
  displayName: 'Acme',
  status: 'active' as const,
  dataRegion: 'EU',
  defaultTimezone: 'Europe/Dublin',
  branding: {},
  settings: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  suspendedAt: null,
  terminatedAt: null,
};

const ok: GetOrganizationResult = { ok: true, organization: orgDto };

function service(result: GetOrganizationResult): OrganizationService {
  return { getOrganization: () => Promise.resolve(result) };
}

describe('handleGetOrganization', () => {
  it('returns 200 with the organisation and echoes the correlation id', async () => {
    const res = await handleGetOrganization(service(ok), {
      actor,
      query: {},
      correlationId: 'corr-1',
    });
    expect(res.status).toBe(200);
    expect(res.headers['X-Correlation-ID']).toBe('corr-1');
    expect(res.body).toEqual(orgDto);
  });

  it('returns 422 for an invalid limit', async () => {
    const res = await handleGetOrganization(service(ok), { actor, query: { limit: '0' } });
    expect(res.status).toBe(422);
    expect(res.headers['Content-Type']).toBe('application/problem+json');
  });

  it('maps a 404 result to problem+json', async () => {
    const res = await handleGetOrganization(service({ ok: false, status: 404 }), {
      actor,
      query: {},
    });
    expect(res.status).toBe(404);
    expect(res.headers['Content-Type']).toBe('application/problem+json');
  });

  it('maps a 403 result to problem+json', async () => {
    const res = await handleGetOrganization(service({ ok: false, status: 403, reason: 'denied' }), {
      actor,
      query: {},
    });
    expect(res.status).toBe(403);
  });
});
