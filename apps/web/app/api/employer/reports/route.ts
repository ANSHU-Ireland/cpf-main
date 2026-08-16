import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Employer report directory contract not approved',
    detail:
      'The baseline supports reports scoped to a known submission, but not an employer-wide report catalogue or generic report command.',
    requirementIds: ['FR-EA-18'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
