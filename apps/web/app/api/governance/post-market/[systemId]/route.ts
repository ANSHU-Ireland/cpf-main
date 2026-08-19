import { contractGapResponse } from '../../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Post-market plan read contract is incomplete',
    detail:
      'The approved API exposes a collection but not the system-specific current-plan read model required by this screen.',
    requirementIds: ['GOV-14', 'FR-GOV-20'],
  });
}
