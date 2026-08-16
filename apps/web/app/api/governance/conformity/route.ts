import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Conformity assessment payload is incomplete',
    detail:
      'The current screen does not capture the canonical procedure, release version and structured requirement results needed for a conformity record.',
    requirementIds: ['GOV-12', 'FR-GOV-18'],
  });
}
