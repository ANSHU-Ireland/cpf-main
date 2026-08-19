import { contractGapResponse } from '../../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Administrative support-case detail contract is missing',
    detail:
      'The approved admin API exposes the queue, assignment and status but no case detail or message history read model.',
    requirementIds: ['SUP-02', 'FR-SUP-02'],
  });
}
