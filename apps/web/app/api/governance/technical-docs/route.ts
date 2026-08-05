import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const collection = governanceStore.getTechnicalDocs();
  return NextResponse.json(collection);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { systemId, version } = body;

  if (typeof systemId !== 'string' || systemId.trim().length < 2) {
    return NextResponse.json({ error: 'Invalid systemId.' }, { status: 422 });
  }
  if (typeof version !== 'string' || version.trim().length < 1) {
    return NextResponse.json(
      { error: 'Invalid version; minimum 1 character required.' },
      { status: 422 },
    );
  }

  const doc = governanceStore.createTechnicalDocVersion(systemId.trim(), version.trim());
  return NextResponse.json(doc, { status: 201 });
}
