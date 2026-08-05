import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = (await request.json()) as Record<string, unknown>;
  const { outcome, rationale } = body;

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

  const result = governanceStore.recordChangeDecision(params.id, outcome.trim(), rationale.trim());
  if (!result) {
    return NextResponse.json({ error: 'Change request not found.' }, { status: 404 });
  }
  return NextResponse.json(result);
}
