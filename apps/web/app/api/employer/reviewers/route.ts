import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Tenant reviewer directory contract not approved',
    detail:
      'Campaign-scoped reviewer operations exist, but the tenant-wide reviewer directory and invite command required by this screen are not exposed.',
    requirementIds: ['FR-EA-14'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
