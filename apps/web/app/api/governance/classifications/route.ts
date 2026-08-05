import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { systemId, role, intendedPurpose, classification, reasoning } = body;

  if (typeof systemId !== 'string' || systemId.trim().length < 2) {
    return NextResponse.json({ error: 'Invalid systemId.' }, { status: 422 });
  }
  if (typeof role !== 'string' || role.trim().length < 2) {
    return NextResponse.json(
      { error: 'Invalid role; minimum 2 characters required.' },
      { status: 422 },
    );
  }
  if (typeof intendedPurpose !== 'string' || intendedPurpose.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid intended purpose; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof classification !== 'string' || classification.trim().length < 2) {
    return NextResponse.json(
      { error: 'Invalid classification; minimum 2 characters required.' },
      { status: 422 },
    );
  }
  if (typeof reasoning !== 'string' || reasoning.trim().length < 12) {
    return NextResponse.json(
      {
        error: 'Invalid reasoning; minimum 12 characters required for human authority checkpoint.',
      },
      { status: 422 },
    );
  }

  const result = governanceStore.recordClassification(
    systemId.trim(),
    role.trim(),
    intendedPurpose.trim(),
    classification.trim(),
    reasoning.trim(),
  );
  return NextResponse.json(result, { status: 201 });
}
