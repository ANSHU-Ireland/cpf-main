import { contractGapResponse } from '../../../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Decision context read model not approved',
    detail:
      'The baseline exposes the human decision command, but this screen also requires a decision-context read model and stable decision identifier before it can submit safely.',
    requirementIds: ['FR-EA-16', 'FR-EA-17'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
