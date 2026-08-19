import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Employer assignment-board contract not approved',
    detail:
      'Reviewer self-service and campaign assignment commands exist, but the employer-wide assignment board required by this screen has no approved read model.',
    requirementIds: ['FR-EA-14'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
