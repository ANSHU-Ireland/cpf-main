import { NextResponse } from 'next/server';
import { supportStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sessions = await supportStore.getJitAccessSessions();
  return NextResponse.json(sessions);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { scope, justification } = body;

  if (!scope?.trim()) {
    return NextResponse.json({ error: 'scope is required' }, { status: 422 });
  }
  if (!justification?.trim() || justification.trim().length < 20) {
    return NextResponse.json(
      { error: 'justification must be at least 20 characters' },
      { status: 422 },
    );
  }

  await supportStore.requestJitAccess(scope.trim(), justification.trim());
  return NextResponse.json({ success: true }, { status: 201 });
}
