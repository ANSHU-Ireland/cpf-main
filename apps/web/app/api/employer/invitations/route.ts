import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Invitation directory contract not approved',
    detail:
      'The baseline can create an invitation for a known application, but this screen requires a tenant invitation list and email-to-application workflow that the contract does not expose.',
    requirementIds: ['FR-EA-13'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
