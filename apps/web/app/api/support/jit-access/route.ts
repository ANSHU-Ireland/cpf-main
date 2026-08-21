import { contractGapResponse } from '../../../lib/contract-gap.server';
import {
  demoContractReadResponse,
  demoValidationResponse,
  functionalDemoEnabled,
  readDemoObject,
} from '../../../lib/demo-contracts.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'JIT access lifecycle contract is incomplete',
    detail:
      'The approved API can create and revoke a grant but cannot list sessions, and the current screen omits tenant, user, case, purpose and expiry fields.',
    requirementIds: ['SUP-03', 'FR-SA-21'],
  });
}

export function GET(request: Request): Response {
  if (functionalDemoEnabled()) {
    const response = demoContractReadResponse(request);
    if (response !== null) return response;
  }
  return gap(request);
}

export async function POST(request: Request): Promise<Response> {
  if (functionalDemoEnabled()) {
    const body = await readDemoObject(request);
    const scope = body?.['scope'];
    const justification = body?.['justification'];
    if (typeof scope !== 'string' || typeof justification !== 'string') {
      return demoValidationResponse('scope and justification are required.');
    }
    void { scope, justification };
    return new Response(null, { status: 204 });
  }
  return gap(request);
}
