import type { RiskTier } from '../../../lib/types';
import { assessmentStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface CreateBody {
  readonly name?: unknown;
  readonly roleFamily?: unknown;
  readonly riskTier?: unknown;
}

const TIERS: readonly RiskTier[] = ['minimal', 'limited', 'high'];

export async function GET(): Promise<Response> {
  return Response.json(assessmentStore.getAssessments());
}

export async function POST(request: Request): Promise<Response> {
  let payload: CreateBody;
  try {
    payload = (await request.json()) as CreateBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const roleFamily = typeof payload.roleFamily === 'string' ? payload.roleFamily.trim() : '';
  const riskTier = payload.riskTier;
  if (name.length < 2) {
    return Response.json({ error: 'An assessment name is required.' }, { status: 422 });
  }
  if (roleFamily.length < 2) {
    return Response.json({ error: 'A role family is required.' }, { status: 422 });
  }
  if (typeof riskTier !== 'string' || !TIERS.includes(riskTier as RiskTier)) {
    return Response.json({ error: 'A valid risk tier is required.' }, { status: 422 });
  }
  return Response.json(assessmentStore.createAssessment(name, roleFamily, riskTier as RiskTier), {
    status: 201,
  });
}
