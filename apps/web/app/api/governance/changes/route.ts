import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Change-control directory contract is incomplete',
    detail:
      'The approved API can submit a change decision but has no list operation or complete canonical change-impact payload for this screen.',
    requirementIds: ['GOV-18', 'FR-GOV-24'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
