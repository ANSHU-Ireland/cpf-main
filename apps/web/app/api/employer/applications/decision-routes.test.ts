import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DecisionContext, DecisionRecord } from '@cpf/org';
import { GET as getDraft, POST as saveDraft } from './[id]/decision/route.js';
import { GET as getApproval, POST as actOnApproval } from './[id]/approval/route.js';

const applicationId = '11111111-1111-4111-8111-111111111111';
const decisionId = '22222222-2222-4222-8222-222222222222';
const drafterId = '33333333-3333-4333-8333-333333333333';
const approverId = '44444444-4444-4444-8444-444444444444';
const routeContext = { params: { id: applicationId } };
const decision: DecisionRecord = {
  id: decisionId,
  applicationId,
  reportId: null,
  decision: 'progress',
  rationale: 'Submitted reviewer evidence supports progression.',
  evidenceLinks: ['scorecard:review-01'],
  decidedBy: drafterId,
  decidedByName: 'Hiring Manager',
  decidedAt: '2026-09-06T09:00:00.000Z',
  issuedAt: null,
  secondApprovalRequired: true,
  secondApprovedBy: null,
  secondApprovedByName: null,
  secondApprovedAt: null,
  status: 'draft',
};
const emptyContext: DecisionContext = {
  applicationId,
  candidateRef: 'CANDIDATE-07',
  campaignName: 'Operations Leadership',
  reviewComplete: true,
  decision: null,
  approval: null,
};
const pendingContext: DecisionContext = {
  ...emptyContext,
  decision,
  approval: {
    id: '55555555-5555-4555-8555-555555555555',
    decisionId,
    requiredRole: 'employer_admin_approver',
    status: 'pending',
    requestedBy: drafterId,
    decidedBy: null,
    decidedByName: null,
    rationale: null,
    requestedAt: '2026-09-06T09:00:00.000Z',
    decidedAt: null,
  },
};
const approvedContext: DecisionContext = {
  ...pendingContext,
  decision: {
    ...decision,
    status: 'pending_approval',
    secondApprovedBy: approverId,
    secondApprovedByName: 'Separate Approver',
    secondApprovedAt: '2026-09-06T10:00:00.000Z',
  },
  approval: { ...pendingContext.approval!, status: 'approved', decidedBy: approverId },
};

function request(action: 'decision' | 'approval', body?: unknown): Request {
  return new Request(`http://web.test/api/employer/applications/${applicationId}/${action}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      cookie: 'cpf_session=current-user-session',
      'idempotency-key': 'user-action-idempotency-key',
      'x-correlation-id': 'decision-journey',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function response(data: unknown): Response {
  return Response.json(data, { headers: { 'x-correlation-id': 'decision-journey' } });
}

beforeEach(() => {
  vi.stubEnv('CPF_API_BASE_URL', 'https://platform.example.test');
  vi.stubEnv('CPF_DEMO_MODE', 'true');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('employer decision web routes', () => {
  it('requires a session even when demo mode is enabled', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await getDraft(new Request('http://web.test/decision'), routeContext);
    expect(result.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads real application context and leaves the first outcome empty', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(emptyContext));
    vi.stubGlobal('fetch', fetchMock);
    const result = await getDraft(request('decision'), routeContext);
    await expect(result.json()).resolves.toMatchObject({
      applicationId,
      decisionId: null,
      outcome: null,
      rationale: '',
      candidateRef: 'CANDIDATE-07',
      status: 'draft',
    });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe(`/applications/${applicationId}/decision-context`);
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer current-user-session');
  });

  it('saves canonical human input using the caller and reloads the persisted draft', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(decision))
      .mockResolvedValueOnce(response(pendingContext));
    vi.stubGlobal('fetch', fetchMock);
    const result = await saveDraft(
      request('decision', {
        outcome: 'progress',
        rationale: '  Submitted reviewer evidence supports progression.  ',
        evidenceLinks: ['scorecard:review-01'],
        secondApprovalRequired: false,
      }),
      routeContext,
    );
    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toMatchObject({ decisionId, status: 'awaiting_approval' });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe(`/applications/${applicationId}/decisions`);
    expect(JSON.parse(String(init.body))).toEqual({
      decision: 'progress',
      rationale: decision.rationale,
      evidenceLinks: decision.evidenceLinks,
      secondApprovalRequired: true,
    });
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer current-user-session');
    expect(new Headers(init.headers).get('idempotency-key')).toBe('user-action-idempotency-key');
    expect((fetchMock.mock.calls[1]?.[0] as URL).pathname).toBe(
      `/applications/${applicationId}/decision-context`,
    );
  });

  it.each([null, [], { outcome: 'progress', rationale: 'short' }])(
    'rejects invalid human decision input before calling the platform: %j',
    async (body) => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      expect((await saveDraft(request('decision', body), routeContext)).status).toBe(422);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('preserves tenant-denial and not-found responses instead of using a fixture', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(Response.json({ detail: 'Application not found.' }, { status: 404 })),
    );
    const result = await getDraft(request('decision'), routeContext);
    expect(result.status).toBe(404);
    await expect(result.json()).resolves.toMatchObject({ detail: 'Application not found.' });
  });
});

describe('employer approval web routes', () => {
  it('shows an approval without claiming the candidate notice has been issued', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(approvedContext)));
    const result = await getApproval(request('approval'), routeContext);
    await expect(result.json()).resolves.toMatchObject({
      status: 'approved',
      approver: 'Separate Approver',
      issuedAt: null,
    });
  });

  it('resolves the real decision ID and records approval without impersonating an issuer', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(pendingContext))
      .mockResolvedValueOnce(response(approvedContext.decision))
      .mockResolvedValueOnce(response(approvedContext));
    vi.stubGlobal('fetch', fetchMock);
    const result = await actOnApproval(request('approval', { action: 'approve' }), routeContext);
    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toMatchObject({ status: 'approved', issuedAt: null });
    const [url, init] = fetchMock.mock.calls[1] as [URL, RequestInit];
    expect(url.pathname).toBe(`/decisions/${decisionId}/approvals`);
    expect(JSON.parse(String(init.body))).toEqual({ status: 'approved', rationale: null });
    for (const call of fetchMock.mock.calls) {
      expect(new Headers((call[1] as RequestInit).headers).get('authorization')).toBe(
        'Bearer current-user-session',
      );
      expect((call[0] as URL).pathname).not.toContain('/issue');
    }
  });

  it('preserves the server rejection when a drafter attempts self-approval', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(pendingContext))
      .mockResolvedValueOnce(
        Response.json(
          { detail: 'The decision drafter cannot approve their own decision.' },
          { status: 409 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const result = await actOnApproval(request('approval', { action: 'approve' }), routeContext);
    expect(result.status).toBe(409);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await expect(result.json()).resolves.toMatchObject({
      detail: 'The decision drafter cannot approve their own decision.',
    });
  });

  it('rejects return without a human rationale before transport', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await actOnApproval(
      request('approval', { action: 'return', rationale: 'short' }),
      routeContext,
    );
    expect(result.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the actual rejection rationale and editable draft state', async () => {
    const rationale = 'The cited criterion needs a more specific evidence reference.';
    const returned = {
      ...pendingContext,
      approval: { ...pendingContext.approval!, status: 'rejected', rationale },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(pendingContext))
      .mockResolvedValueOnce(response(decision))
      .mockResolvedValueOnce(response(returned));
    vi.stubGlobal('fetch', fetchMock);
    const result = await actOnApproval(
      request('approval', { action: 'return', rationale }),
      routeContext,
    );
    await expect(result.json()).resolves.toMatchObject({
      status: 'returned',
      returnRationale: rationale,
    });
    const init = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ status: 'rejected', rationale });
  });

  it('requires a real decision before an approval action', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(emptyContext));
    vi.stubGlobal('fetch', fetchMock);
    const result = await actOnApproval(request('approval', { action: 'approve' }), routeContext);
    expect(result.status).toBe(409);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('issues only when explicitly requested and uses the same authenticated caller', async () => {
    const issued = {
      ...approvedContext,
      decision: {
        ...approvedContext.decision!,
        status: 'issued',
        issuedAt: '2026-09-06T11:00:00Z',
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(approvedContext))
      .mockResolvedValueOnce(response(issued.decision))
      .mockResolvedValueOnce(response(issued));
    vi.stubGlobal('fetch', fetchMock);
    const result = await actOnApproval(request('approval', { action: 'issue' }), routeContext);
    await expect(result.json()).resolves.toMatchObject({
      status: 'issued',
      issuedAt: '2026-09-06T11:00:00Z',
    });
    const [url, init] = fetchMock.mock.calls[1] as [URL, RequestInit];
    expect(url.pathname).toBe(`/decisions/${decisionId}/issue`);
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer current-user-session');
  });

  it('does not substitute admin authority when the issuer lacks permission', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(approvedContext))
      .mockResolvedValueOnce(
        Response.json({ detail: 'Employer Admin authority is required.' }, { status: 403 }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const result = await actOnApproval(request('approval', { action: 'issue' }), routeContext);
    expect(result.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
