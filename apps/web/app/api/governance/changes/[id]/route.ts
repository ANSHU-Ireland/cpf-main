import { contractGapResponse } from '../../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function POST(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Change decision workflow is not safely projectable',
    detail:
      'A decision operation exists, but this screen cannot reload the authoritative change request because the approved API has no corresponding read operation.',
    requirementIds: ['GOV-18', 'FR-GOV-24'],
  });
}
