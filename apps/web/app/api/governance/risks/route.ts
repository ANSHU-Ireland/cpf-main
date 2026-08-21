import { contractGapResponse } from '../../../lib/contract-gap.server';
import {
  addDemoRisk,
  demoContractReadResponse,
  demoValidationResponse,
  functionalDemoEnabled,
  readDemoObject,
} from '../../../lib/demo-contracts.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Risk-control payload is incomplete',
    detail:
      'The screen omits affected people, cause, test reference and numeric likelihood/severity fields required by the canonical risk register.',
    requirementIds: ['GOV-03', 'FR-GOV-04'],
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
    const title = body?.['title'];
    const riskLevel = body?.['riskLevel'];
    const controls = body?.['controls'];
    const residual = body?.['residual'];
    if (
      typeof title !== 'string' ||
      !['low', 'medium', 'high', 'critical'].includes(String(riskLevel)) ||
      typeof controls !== 'string' ||
      typeof residual !== 'string'
    ) {
      return demoValidationResponse('title, riskLevel, controls and residual are required.');
    }
    return Response.json(addDemoRisk(title, String(riskLevel), controls, residual), {
      status: 201,
    });
  }
  return gap(request);
}
