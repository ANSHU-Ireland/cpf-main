import { contractGapResponse } from '../../../lib/contract-gap.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Operations telemetry contract is missing',
    detail:
      'The approved public API has no aggregate health, alert or activity operation for OPS-01.',
    requirementIds: ['OPS-01', 'FR-OPS-01'],
  });
}
