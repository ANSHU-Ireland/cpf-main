import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const collection = governanceStore.getChangeRequests();
  return NextResponse.json(collection);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { title, significance, affectedControls } = body;

  const SIGNIFICANCES = ['minor', 'major', 'substantial'];
  if (typeof title !== 'string' || title.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid title; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof significance !== 'string' || !SIGNIFICANCES.includes(significance)) {
    return NextResponse.json({ error: 'Invalid significance.' }, { status: 422 });
  }
  if (typeof affectedControls !== 'string' || affectedControls.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid affected controls; minimum 4 characters required.' },
      { status: 422 },
    );
  }

  const change = governanceStore.submitChangeRequest(
    title.trim(),
    significance as 'minor' | 'major' | 'substantial',
    affectedControls.trim(),
  );
  return NextResponse.json(change, { status: 201 });
}
