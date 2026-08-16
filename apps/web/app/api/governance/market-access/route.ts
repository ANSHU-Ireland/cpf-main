import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Market-access workflow is externally gated',
    detail:
      'Declarations, registrations and CE marking require signed or authority-issued evidence and lifecycle-specific identifiers that cannot be generated locally.',
    requirementIds: ['GOV-13', 'FR-GOV-19'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
