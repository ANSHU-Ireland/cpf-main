import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';

const sha256 = createHash('sha256').update('Synthetic QMS adapter test document.').digest('hex');
const input = {
  title: 'Synthetic quality procedure',
  documentCode: 'TEST-TENANT-QMS',
  versionNo: 1,
  documentType: 'quality_procedure',
  policy: 'Synthetic assessment review policy.',
  contentUri: 's3://test-protected-bucket/qms/v1.txt',
  sha256,
  reviewDue: '2027-08-01',
  reason: 'Register a synthetic test version.',
};
const record = {
  id: 'qms-test-1',
  title: input.title,
  status: 'draft',
  createdAt: '2026-09-06T12:00:00Z',
  updatedAt: '2026-09-06T12:00:00Z',
  data: { ...input, status: 'draft', ownerUserId: 'actual-caller' },
};
function request(body?: unknown) {
  return new Request('http://web.test/api/governance/qms', {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      cookie: 'cpf_session=governance-session',
      'content-type': 'application/json',
      'idempotency-key': 'qms-test-command',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('canonical QMS web adapter', () => {
  it('loads tenant data with the caller session and exposes returned canonical document fields', async () => {
    vi.stubEnv('CPF_API_BASE_URL', 'https://platform.test');
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ items: [record], total: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      items: [
        {
          title: input.title,
          documentCode: input.documentCode,
          contentUri: input.contentUri,
          sha256,
          ownerUserId: 'actual-caller',
          status: 'draft',
        },
      ],
      total: 1,
    });
    expect((fetchMock.mock.calls[0]?.[0] as URL).pathname).toBe('/governance/qms-documents');
    const headers = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers;
    expect(headers.get('authorization')).toBe('Bearer governance-session');
  });

  it('creates only a draft with the supplied content evidence, then reads that document again', async () => {
    let saved = false;
    const fetchMock = vi.fn(async (_url: URL, init: RequestInit) => {
      if (init.method === 'POST') {
        saved = true;
        return Response.json(record);
      }
      return Response.json({ items: saved ? [record] : [], total: saved ? 1 : 0 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const response = await POST(
      request({
        ...input,
        status: 'approved',
        approvedBy: 'forged',
        ownerUserId: 'forged',
        tenantId: 'other-tenant',
      }),
    );
    expect(response.status).toBe(200);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const command = JSON.parse(String(init.body));
    expect(command).toEqual({
      reason: input.reason,
      expectedVersion: 0,
      data: {
        title: input.title,
        documentCode: input.documentCode,
        versionNo: 1,
        documentType: input.documentType,
        policy: input.policy,
        contentUri: input.contentUri,
        sha256,
        reviewDue: input.reviewDue,
        status: 'draft',
      },
    });
    expect((init.headers as Headers).get('authorization')).toBe('Bearer governance-session');
    expect((init.headers as Headers).get('idempotency-key')).toBe('qms-test-command');
    const read = await GET(request());
    await expect(read.json()).resolves.toMatchObject({
      items: [{ id: record.id, sha256 }],
      total: 1,
    });
  });

  it.each([
    { sha256: '' },
    { sha256: 'not-a-checksum' },
    { versionNo: 0 },
    { versionNo: 1.5 },
    { contentUri: 'javascript:alert(1)' },
    { contentUri: 'https://user:password@example.test/file' },
    { reviewDue: '2026-02-31' },
    { reason: '' },
  ])('rejects invalid content/version input before transport: %j', async (change) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect((await POST(request({ ...input, ...change }))).status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves access denial and version conflicts from the platform', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ detail: 'Tenant access denied' }, { status: 403 }))
      .mockResolvedValueOnce(
        Response.json({ detail: 'Document version already exists' }, { status: 409 }),
      );
    vi.stubGlobal('fetch', fetchMock);
    expect((await GET(request())).status).toBe(403);
    expect((await POST(request(input))).status).toBe(409);
  });

  it('requires authentication and rejects malformed JSON', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect((await GET(new Request('http://web.test/api/governance/qms'))).status).toBe(401);
    expect(
      (await POST(new Request('http://web.test/api/governance/qms', { method: 'POST', body: '{' })))
        .status,
    ).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
