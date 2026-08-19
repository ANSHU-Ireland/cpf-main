import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Integration delivery operations contract is missing',
    detail:
      'The canonical schema stores delivery attempts, but the approved public API has no operations delivery directory.',
    requirementIds: ['OPS-03', 'FR-INT-06'],
  });
}
