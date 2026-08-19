import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Classification checkpoint contract is incomplete',
    detail:
      'The current screen does not collect the legal snapshot, Article reviews and structured role evidence required by the canonical classification record.',
    requirementIds: ['GOV-02', 'FR-GOV-03'],
  });
}
