import { describe, expect, it } from 'vitest';
import { demoContractReadResponse } from './demo-contracts.server';

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
});
