import { contractGapResponse } from '../../../lib/contract-gap.server';
import {
  demoContractReadResponse,
  functionalDemoEnabled,
} from '../../../lib/demo-contracts.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  if (functionalDemoEnabled()) {
    const response = demoContractReadResponse(request);
    if (response !== null) return response;
  }
  return contractGapResponse(request, {
    title: 'Operations telemetry contract is missing',
    detail:
      'The approved public API has no aggregate health, alert or activity operation for OPS-01.',
    requirementIds: ['OPS-01', 'FR-OPS-01'],
  });
}
