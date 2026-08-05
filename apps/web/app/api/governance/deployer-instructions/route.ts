import { NextRequest, NextResponse } from 'next/server';
import { governanceStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const collection = governanceStore.getDeployerInstructions();
  return NextResponse.json(collection);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const { systemId, version, limitations, oversight } = body;

  if (typeof systemId !== 'string' || systemId.trim().length < 2) {
    return NextResponse.json({ error: 'Invalid systemId.' }, { status: 422 });
  }
  if (typeof version !== 'string' || version.trim().length < 1) {
    return NextResponse.json(
      { error: 'Invalid version; minimum 1 character required.' },
      { status: 422 },
    );
  }
  if (typeof limitations !== 'string' || limitations.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid limitations; minimum 4 characters required.' },
      { status: 422 },
    );
  }
  if (typeof oversight !== 'string' || oversight.trim().length < 4) {
    return NextResponse.json(
      { error: 'Invalid oversight; minimum 4 characters required.' },
      { status: 422 },
    );
  }

  const instructions = governanceStore.publishDeployerInstructions(
    systemId.trim(),
    version.trim(),
    limitations.trim(),
    oversight.trim(),
  );
  return NextResponse.json(instructions, { status: 201 });
}
