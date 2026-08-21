import { contractGapResponse } from '../../../lib/contract-gap.server';
import {
  addDemoIncident,
  demoContractReadResponse,
  demoValidationResponse,
  functionalDemoEnabled,
  readDemoObject,
} from '../../../lib/demo-contracts.server';

export const dynamic = 'force-dynamic';

function gap(request: Request): Response {
  return contractGapResponse(request, {
    title: 'Serious-incident workflow payload is incomplete',
    detail:
      'The screen omits the AI system, affected people, assessment and authority reporting fields required by the canonical incident report.',
    requirementIds: ['GOV-16', 'FR-GOV-23'],
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
    const severity = body?.['severity'];
    const contained = body?.['contained'];
    const notified = body?.['notified'];
    if (
      typeof title !== 'string' ||
      !['minor', 'moderate', 'serious', 'critical'].includes(String(severity)) ||
      typeof contained !== 'boolean' ||
      typeof notified !== 'boolean'
    ) {
      return demoValidationResponse('title, severity, contained and notified are required.');
    }
    return Response.json(addDemoIncident(title, String(severity), contained, notified), {
      status: 201,
    });
  }
  return gap(request);
}
