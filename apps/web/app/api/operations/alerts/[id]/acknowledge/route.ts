import { contractGapResponse } from '../../../../../lib/contract-gap.server';
import { functionalDemoEnabled } from '../../../../../lib/demo-contracts.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  if (functionalDemoEnabled()) {
    const alertId = new URL(request.url).pathname.split('/').at(-2) ?? 'demo';
    void alertId;
    return new Response(null, { status: 204 });
  }
  return contractGapResponse(request, {
    title: 'Operational alert acknowledgement contract is missing',
    detail: 'No approved public API operation can acknowledge an operational alert.',
    requirementIds: ['OPS-01', 'FR-OPS-01'],
  });
}
