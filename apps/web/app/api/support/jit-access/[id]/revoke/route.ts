import { contractGapResponse } from '../../../../../lib/contract-gap.server';
import { functionalDemoEnabled } from '../../../../../lib/demo-contracts.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  if (functionalDemoEnabled()) {
    const sessionId = new URL(request.url).pathname.split('/').at(-2) ?? 'demo';
    void sessionId;
    return new Response(null, { status: 204 });
  }
  return contractGapResponse(request, {
    title: 'JIT access lifecycle contract is incomplete',
    detail:
      'Revocation cannot be safely projected because the approved API has no grant read or list operation.',
    requirementIds: ['SUP-03', 'FR-SA-21'],
  });
}
