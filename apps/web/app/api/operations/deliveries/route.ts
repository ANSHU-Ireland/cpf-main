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
    title: 'Integration delivery operations contract is missing',
    detail:
      'The canonical schema stores delivery attempts, but the approved public API has no operations delivery directory.',
    requirementIds: ['OPS-03', 'FR-INT-06'],
  });
}
