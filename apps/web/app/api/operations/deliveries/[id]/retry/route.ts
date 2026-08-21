import { contractGapResponse } from '../../../../../lib/contract-gap.server';
import { functionalDemoEnabled } from '../../../../../lib/demo-contracts.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  if (functionalDemoEnabled()) {
    const deliveryId = new URL(request.url).pathname.split('/').at(-2) ?? 'demo';
    void deliveryId;
    return new Response(null, { status: 204 });
  }
  return contractGapResponse(request, {
    title: 'Integration delivery retry contract is missing',
    detail: 'No approved public API operation can retry a selected integration delivery.',
    requirementIds: ['OPS-03', 'FR-INT-06'],
  });
}
