import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const collection = governanceStore.getIncidents();
  return NextResponse.json(collection);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { title, severity, contained, notified } = body;

  const SEVERITIES = ['minor', 'moderate', 'serious', 'critical'];
  if (typeof title !== 'string' || title.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid title; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof severity !== 'string' || !SEVERITIES.includes(severity)) {
    return NextResponse.json({ error: 'Invalid severity.' }, { status: 422 });
  }
  if (typeof contained !== 'boolean') {
    return NextResponse.json({ error: 'Invalid contained flag.' }, { status: 422 });
  }
  if (typeof notified !== 'boolean') {
    return NextResponse.json({ error: 'Invalid notified flag.' }, { status: 422 });
  }

  const incident = governanceStore.escalateIncident(
    title.trim(),
    severity as 'minor' | 'moderate' | 'serious' | 'critical',
    contained,
    notified,
  );
  return NextResponse.json(incident, { status: 201 });
}
