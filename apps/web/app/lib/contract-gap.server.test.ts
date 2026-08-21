import { afterEach, describe, expect, it } from 'vitest';
import { contractGapResponse } from './contract-gap.server';
import { demoContractReadResponse } from './demo-contracts.server';

afterEach(() => {
  delete process.env.CPF_DEMO_MODE;
});

describe('functional demo contract projections', () => {
  it('projects a populated operations dashboard', async () => {
    const response = demoContractReadResponse(
      new Request('http://localhost/api/operations/dashboard'),
    );

    expect(response?.status).toBe(200);
    await expect(response?.json()).resolves.toMatchObject({
      metrics: expect.any(Array),
      alerts: expect.any(Array),
      recentActivity: expect.any(Array),
    });
  });

  it('projects seeded employer and governance collections', async () => {
    const candidates = demoContractReadResponse(
      new Request('http://localhost/api/employer/candidates'),
    );
    const risks = demoContractReadResponse(new Request('http://localhost/api/governance/risks'));

    await expect(candidates?.json()).resolves.toMatchObject({ items: expect.any(Array) });
    await expect(risks?.json()).resolves.toMatchObject({ items: expect.any(Array) });
  });

  it('projects a populated support case detail for the local UAT journey', async () => {
    const response = demoContractReadResponse(
      new Request('http://localhost/api/support/cases/demo-uat-case'),
    );

    expect(response?.status).toBe(200);
    await expect(response?.json()).resolves.toMatchObject({
      id: 'demo-uat-case',
      messages: expect.any(Array),
    });
  });

  it('does not project unknown routes or mutations', () => {
    expect(
      demoContractReadResponse(
        new Request('http://localhost/api/operations/dashboard', { method: 'POST' }),
      ),
    ).toBeNull();
    expect(
      demoContractReadResponse(new Request('http://localhost/api/unknown-workspace')),
    ).toBeNull();
  });

  it('serves a known read projection through the gap boundary only in demo mode', async () => {
    process.env.CPF_DEMO_MODE = 'true';
    const response = contractGapResponse(new Request('http://localhost/api/governance/risks'), {
      title: 'Risk contract is incomplete',
      detail: 'The approved API does not expose the read model.',
      requirementIds: ['GOV-03'],
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ items: expect.any(Array) });
  });

  it('keeps production fail-closed when the same approved contract is missing', async () => {
    const response = contractGapResponse(new Request('http://localhost/api/governance/risks'), {
      title: 'Risk contract is incomplete',
      detail: 'The approved API does not expose the read model.',
      requirementIds: ['GOV-03'],
    });

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toMatchObject({
      status: 501,
      requirementIds: ['GOV-03'],
    });
  });
});
