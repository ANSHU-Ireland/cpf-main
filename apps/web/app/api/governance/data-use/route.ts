import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Data-use register payload is incomplete',
    detail:
      'The screen omits controller roles, storage, transfer, rights, security and model-use fields required by the canonical register.',
    requirementIds: ['GOV-07', 'FR-PRIV-04'],
  });
}

export function GET(request: Request): Response {
  return gap(request);
}

export function POST(request: Request): Response {
  return gap(request);
}
