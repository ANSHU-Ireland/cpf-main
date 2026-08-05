import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { systemId, authority, competency, stoppingRules, outcome, rationale } = body;

  if (typeof systemId !== 'string' || systemId.trim().length < 2) {
    return NextResponse.json({ error: 'Invalid systemId.' }, { status: 422 });
  }
  if (typeof authority !== 'string' || authority.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid authority; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof competency !== 'string' || competency.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid competency; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof stoppingRules !== 'string' || stoppingRules.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid stopping rules; minimum 4 characters required.' },
      { status: 422 },
    );
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

  const result = governanceStore.approveOversightPlan(
    systemId.trim(),
    authority.trim(),
    competency.trim(),
    stoppingRules.trim(),
    outcome.trim(),
    rationale.trim(),
  );
  return NextResponse.json(result, { status: 201 });
}
