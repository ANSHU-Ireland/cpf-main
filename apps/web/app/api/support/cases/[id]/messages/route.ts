import { contractGapResponse } from '../../../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Administrative case-message contract is missing',
    detail:
      'The approved message operation is requester-scoped; it cannot safely be reused for an administrative internal or requester-visible reply.',
    requirementIds: ['SUP-02', 'FR-SUP-03'],
  });
}
