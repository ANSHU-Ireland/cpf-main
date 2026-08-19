import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Vendor-evidence payload is incomplete',
    detail:
      'The screen omits legal roles, locations, subprocessors, security, model, retention, audit and exit evidence required by the canonical record.',
    requirementIds: ['GOV-17', 'FR-GOV-22'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
