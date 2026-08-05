import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const collection = governanceStore.getDataUse();
  return NextResponse.json(collection);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { purpose, lawfulBasis, categories, recipients, retention } = body;

  if (typeof purpose !== 'string' || purpose.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid purpose; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof lawfulBasis !== 'string' || lawfulBasis.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid lawful basis; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof categories !== 'string' || categories.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid categories; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof recipients !== 'string' || recipients.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid recipients; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof retention !== 'string' || retention.trim().length < 2) {
    return NextResponse.json(
      { error: 'Invalid retention; minimum 2 characters required.' },
      { status: 422 },
    );
  }

  const dataUse = governanceStore.addDataUsePurpose(
    purpose.trim(),
    lawfulBasis.trim(),
    categories.trim(),
    recipients.trim(),
    retention.trim(),
  );
  return NextResponse.json(dataUse, { status: 201 });
}
