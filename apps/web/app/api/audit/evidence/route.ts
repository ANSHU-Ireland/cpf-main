import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const collection = governanceStore.getEvidenceCollections();
  return NextResponse.json(collection);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { title, purpose } = body;

  if (typeof title !== 'string' || title.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid title; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof purpose !== 'string' || purpose.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid purpose; minimum 4 characters required.' },
      { status: 422 },
    );
  }

  const collection = governanceStore.createEvidenceCollection(title.trim(), purpose.trim());
  return NextResponse.json(collection, { status: 201 });
}
