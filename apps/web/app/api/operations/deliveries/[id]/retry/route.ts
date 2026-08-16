import { contractGapResponse } from '../../../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Integration delivery retry contract is missing',
    detail: 'No approved public API operation can retry a selected integration delivery.',
    requirementIds: ['OPS-03', 'FR-INT-06'],
  });
}
