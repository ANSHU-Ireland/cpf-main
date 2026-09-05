import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as getEvidence, POST as postEvidence } from './evidence/route.js';
import { GET as getTraceability } from './traceability/route.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function authenticatedRequest(path: string, init?: RequestInit): Request {
  return new Request(`http://web.test${path}`, {
    ...init,
    headers: { authorization: 'Bearer auditor-session', ...init?.headers },
  });
}

describe('audit evidence web adapter', () => {
  it('reads canonical evidence collections from the platform API', async () => {
    const page = { items: [{ id: 'collection-1', requirementIds: [] }], total: 1 };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(page));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('CPF_API_BASE_URL', 'https://platform.example.test');

    const response = await getEvidence(authenticatedRequest('/api/audit/evidence'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(page);
    expect((fetchMock.mock.calls[0]?.[0] as URL).href).toBe(
      'https://platform.example.test/audit/evidence-collections',
    );
  });

  it('wraps the screen fields in the approved GenericCommand envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: 'collection-1' }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('CPF_API_BASE_URL', 'https://platform.example.test');
    const request = authenticatedRequest('/api/audit/evidence', {
      method: 'POST',
      body: JSON.stringify({ title: 'Release evidence', purpose: 'Controlled UAT release' }),
    });

    const response = await postEvidence(request);

    expect(response.status).toBe(200);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      reason: 'Create a purpose-scoped evidence collection.',
      expectedVersion: 0,
      data: {
        title: 'Release evidence',
        purpose: 'Controlled UAT release',
        framework: 'EU AI Act',
      },
    });
  });

  it('rejects incomplete collection input before transport', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const request = authenticatedRequest('/api/audit/evidence', {
      method: 'POST',
      body: JSON.stringify({ title: 'x', purpose: '' }),
    });

    expect((await postEvidence(request)).status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('audit traceability web adapter', () => {
  it('assembles the screen from approved collection and point-read operations', async () => {
    const firstId = '11111111-1111-4111-8111-111111111111';
    const secondId = '22222222-2222-4222-8222-222222222222';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { items: [{ requirementIds: [firstId, secondId, firstId] }], total: 1 },
          { headers: { 'x-correlation-id': 'trace-1' } },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({
          requirementId: 'FR-AUD-01',
          requirementTitle: 'Purpose-scoped evidence access',
          controls: ['CTRL-FR-AUD-01'],
          surfaces: ['AUD-01'],
          endpoints: ['/audit/evidence-collections'],
          evidence: ['Repository test'],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          requirementId: 'FR-AUD-03',
          requirementTitle: 'Requirement traceability',
          status: 'blocked',
          coverage: 'unlinked',
          controls: ['CTRL-FR-AUD-03'],
          surfaces: ['AUD-02'],
          endpoints: ['/audit/traceability/{requirementId}'],
          evidence: ['UAT journey'],
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('CPF_API_BASE_URL', 'https://platform.example.test');

    const response = await getTraceability(authenticatedRequest('/api/audit/traceability'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      total: 2,
      items: [
        { requirementId: 'FR-AUD-01', description: 'Purpose-scoped evidence access' },
        {
          requirementId: 'FR-AUD-03',
          description: 'Requirement traceability',
          status: 'blocked',
          coverage: 'unlinked',
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
