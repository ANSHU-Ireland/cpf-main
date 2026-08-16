import { contractGapResponse } from '../../../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Decision approval context read model not approved',
    detail:
      'Approval commands are decision-scoped, while this screen is application-scoped and the baseline does not expose the required decision lookup/context operation.',
    requirementIds: ['FR-EA-17'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
