import { contractGapResponse } from '../../../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Tenant staff administration contract not approved',
    detail:
      'The baseline exposes CPF platform-staff administration and tenant self-service membership operations, but not cross-tenant member management from platform context.',
    requirementIds: ['FR-PA-02'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
