import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Campaign scheduling contract not approved',
    detail:
      'Application booking operations exist, but the employer campaign scheduling read model and window-management commands remain an approved baseline gap.',
    requirementIds: ['EMP-15'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
