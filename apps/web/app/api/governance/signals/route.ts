import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dashboard = governanceStore.getSignalsDashboard();
  return NextResponse.json(dashboard);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { type, priority, description } = body;

  const TYPES = ['safety', 'performance', 'bias', 'drift'];
  const PRIORITIES = ['low', 'medium', 'high', 'critical'];
  if (typeof type !== 'string' || !TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid signal type.' }, { status: 422 });
  }
  if (typeof priority !== 'string' || !PRIORITIES.includes(priority)) {
    return NextResponse.json({ error: 'Invalid priority.' }, { status: 422 });
  }
  if (typeof description !== 'string' || description.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid description; minimum 4 characters required.' },
      { status: 422 },
    );
  }

  const signal = governanceStore.createSignal(
    type as 'safety' | 'performance' | 'bias' | 'drift',
    priority as 'low' | 'medium' | 'high' | 'critical',
    description.trim(),
  );
  return NextResponse.json(signal, { status: 201 });
}
