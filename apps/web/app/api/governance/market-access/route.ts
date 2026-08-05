import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const collection = governanceStore.getMarketAccess();
  return NextResponse.json(collection);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { systemId, accessType, evidence } = body;

  const TYPES = ['declaration', 'registration', 'ce_marking'];
  if (typeof systemId !== 'string' || systemId.trim().length < 2) {
    return NextResponse.json({ error: 'Invalid systemId.' }, { status: 422 });
  }
  if (typeof accessType !== 'string' || !TYPES.includes(accessType)) {
    return NextResponse.json({ error: 'Invalid access type.' }, { status: 422 });
  }
  if (typeof evidence !== 'string' || evidence.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid evidence; minimum 4 characters required.' },
      { status: 422 },
    );
  }

  const result = governanceStore.recordMarketAccess(
    systemId.trim(),
    accessType as 'declaration' | 'registration' | 'ce_marking',
    evidence.trim(),
  );
  return NextResponse.json(result, { status: 201 });
}
