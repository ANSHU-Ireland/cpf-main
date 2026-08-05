import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const collection = governanceStore.getQmsProcedures();
  return NextResponse.json(collection);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { title, policy } = body;

  if (typeof title !== 'string' || title.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid title; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof policy !== 'string' || policy.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid policy; minimum 4 characters required.' },
      { status: 422 },
    );
  }

  const procedure = governanceStore.addQmsProcedure(title.trim(), policy.trim());
  return NextResponse.json(procedure, { status: 201 });
}
