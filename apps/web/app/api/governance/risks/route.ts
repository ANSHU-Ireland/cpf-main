import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Risk-control payload is incomplete',
    detail:
      'The screen omits affected people, cause, test reference and numeric likelihood/severity fields required by the canonical risk register.',
    requirementIds: ['GOV-03', 'FR-GOV-04'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
