import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'AI literacy workflow contract is incomplete',
    detail:
      'The screen requires assignee identity, material version, competence outcome and evidence fields that are not represented by its current UI contract.',
    requirementIds: ['GOV-11', 'FR-GOV-17'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
