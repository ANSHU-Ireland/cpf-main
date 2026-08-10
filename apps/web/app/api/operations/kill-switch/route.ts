import { NextResponse } from 'next/server';
import { operationsStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json();
  const { reason } = body;

  if (!reason?.trim() || reason.trim().length < 20) {
    return NextResponse.json({ error: 'reason must be at least 20 characters' }, { status: 422 });
  }

  await operationsStore.activateKillSwitch(reason.trim());
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  await operationsStore.deactivateKillSwitch();
  return NextResponse.json({ success: true });
}
