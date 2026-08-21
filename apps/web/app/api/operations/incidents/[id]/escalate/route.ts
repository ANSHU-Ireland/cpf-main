import { contractGapResponse } from '../../../../../lib/contract-gap.server';
import { functionalDemoEnabled } from '../../../../../lib/demo-contracts.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  if (functionalDemoEnabled()) {
    const incidentId = new URL(request.url).pathname.split('/').at(-2) ?? 'demo';
    void incidentId;
    return new Response(null, { status: 204 });
  }
  return contractGapResponse(request, {
    title: 'Security incident escalation contract is missing',
    detail:
      'OPS-02 has no approved public API operation for escalating a selected security incident.',
    requirementIds: ['OPS-02', 'FR-SEC-14'],
  });
}
