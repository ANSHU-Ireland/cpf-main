import { contractGapResponse } from '../../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Impact-assessment read contract is incomplete',
    detail:
      'The approved API exposes a collection but not the system-and-assessment-type read model required by this checkpoint screen.',
    requirementIds: ['GOV-08', 'FR-GOV-12'],
  });
}
