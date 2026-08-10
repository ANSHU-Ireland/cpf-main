import { NextResponse } from 'next/server';
import { supportStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const queue = await supportStore.getSupportQueue();
  return NextResponse.json(queue);
}
