import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Post-market plan payload is incomplete',
    detail:
      'The current screen does not capture the versioned methodology and structured signal catalogue required by the canonical plan.',
    requirementIds: ['GOV-14', 'FR-GOV-20'],
  });
}
