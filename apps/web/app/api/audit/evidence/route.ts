import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Evidence collection persistence contract is incomplete',
    detail:
      'The approved API names evidence collections, but the canonical schema has no collection aggregate or chain-of-custody record for this screen.',
    requirementIds: ['AUD-01', 'FR-AUD-01'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
