import { contractGapResponse } from '../../../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Operational alert acknowledgement contract is missing',
    detail: 'No approved public API operation can acknowledge an operational alert.',
    requirementIds: ['OPS-01', 'FR-OPS-01'],
  });
}
