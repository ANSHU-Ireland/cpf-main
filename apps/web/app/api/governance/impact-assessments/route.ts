import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { systemId, assessmentType, outcome, rationale } = body;

  const TYPES = ['DPIA', 'FundamentalRights'];
  if (typeof systemId !== 'string' || systemId.trim().length < 2) {
    return NextResponse.json({ error: 'Invalid systemId.' }, { status: 422 });
  }
  if (typeof assessmentType !== 'string' || !TYPES.includes(assessmentType)) {
    return NextResponse.json({ error: 'Invalid assessment type.' }, { status: 422 });
  }
  if (typeof outcome !== 'string' || outcome.trim().length < 2) {
    return NextResponse.json(
      { error: 'Invalid outcome; minimum 2 characters required.' },
      { status: 422 },
    );
  }
  if (typeof rationale !== 'string' || rationale.trim().length < 12) {
    return NextResponse.json(
      {
        error: 'Invalid rationale; minimum 12 characters required for human authority checkpoint.',
      },
      { status: 422 },
    );
  }

  const result = governanceStore.recordImpactAssessment(
    systemId.trim(),
    assessmentType as 'DPIA' | 'FundamentalRights',
    outcome.trim(),
    rationale.trim(),
  );
  return NextResponse.json(result, { status: 201 });
}
