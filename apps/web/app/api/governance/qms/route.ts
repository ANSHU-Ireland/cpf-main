import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'QMS document storage is externally gated',
    detail:
      'A canonical QMS version requires an immutable protected content URI and SHA-256 evidence; local placeholder content is not permitted.',
    requirementIds: ['GOV-06', 'FR-GOV-08'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
