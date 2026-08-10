import { NextResponse } from 'next/server';
import { operationsStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await operationsStore.getSecurityStatus();
  return NextResponse.json(status);
}
