import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const collection = governanceStore.getAiSystems();
  return NextResponse.json(collection);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { name, purpose, classification } = body;

  if (typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json(
      { error: 'Invalid name; minimum 2 characters required.' },
      { status: 422 },
    );
  }
  if (typeof purpose !== 'string' || purpose.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid purpose; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof classification !== 'string' || classification.trim().length < 2) {
    return NextResponse.json(
      { error: 'Invalid classification; minimum 2 characters required.' },
      { status: 422 },
    );
  }

  const system = governanceStore.registerAiSystem(
    name.trim(),
    purpose.trim(),
    classification.trim(),
  );
  return NextResponse.json(system, { status: 201 });
}
