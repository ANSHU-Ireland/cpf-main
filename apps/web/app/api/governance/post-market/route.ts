import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { systemId, metrics, thresholds, reviewCadence, outcome, rationale } = body;

  if (typeof systemId !== 'string' || systemId.trim().length < 2) {
    return NextResponse.json({ error: 'Invalid systemId.' }, { status: 422 });
  }
  if (typeof metrics !== 'string' || metrics.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid metrics; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof thresholds !== 'string' || thresholds.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid thresholds; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof reviewCadence !== 'string' || reviewCadence.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid review cadence; minimum 4 characters required.' },
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

  const result = governanceStore.approvePostMarketPlan(
    systemId.trim(),
    metrics.trim(),
    thresholds.trim(),
    reviewCadence.trim(),
    outcome.trim(),
    rationale.trim(),
  );
  return NextResponse.json(result, { status: 201 });
}
