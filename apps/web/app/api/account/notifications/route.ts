import { NextResponse } from 'next/server';
import { accountStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const preferences = await accountStore.getNotificationPreferences();
  return NextResponse.json(preferences);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { updates } = body;

  if (!Array.isArray(updates)) {
    return NextResponse.json({ error: 'updates must be an array' }, { status: 422 });
  }

  await accountStore.updateNotificationPreferences(updates);
  return NextResponse.json({ success: true });
}
