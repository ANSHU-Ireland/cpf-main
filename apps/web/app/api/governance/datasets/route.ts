import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const collection = governanceStore.getDatasets();
  return NextResponse.json(collection);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { name, provenance, lawfulBasis, representativeness } = body;

  if (typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json(
      { error: 'Invalid name; minimum 2 characters required.' },
      { status: 422 },
    );
  }
  if (typeof provenance !== 'string' || provenance.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid provenance; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof lawfulBasis !== 'string' || lawfulBasis.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid lawful basis; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof representativeness !== 'string' || representativeness.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid representativeness; minimum 4 characters required.' },
      { status: 422 },
    );
  }

  const dataset = governanceStore.registerDataset(
    name.trim(),
    provenance.trim(),
    lawfulBasis.trim(),
    representativeness.trim(),
  );
  return NextResponse.json(dataset, { status: 201 });
}
