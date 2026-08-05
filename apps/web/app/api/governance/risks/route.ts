import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const collection = governanceStore.getRisks();
  return NextResponse.json(collection);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { title, riskLevel, controls, residual } = body;

  const LEVELS = ['low', 'medium', 'high', 'critical'];
  if (typeof title !== 'string' || title.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid title; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof riskLevel !== 'string' || !LEVELS.includes(riskLevel)) {
    return NextResponse.json({ error: 'Invalid risk level.' }, { status: 422 });
  }
  if (typeof controls !== 'string' || controls.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid controls; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof residual !== 'string' || residual.trim().length < 2) {
    return NextResponse.json(
      { error: 'Invalid residual risk; minimum 2 characters required.' },
      { status: 422 },
    );
  }

  const risk = governanceStore.updateRisk(
    title.trim(),
    riskLevel as 'low' | 'medium' | 'high' | 'critical',
    controls.trim(),
    residual.trim(),
  );
  return NextResponse.json(risk, { status: 201 });
}
