import { NextResponse } from 'next/server';
import { operationsStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  await operationsStore.escalateSecurityIncident(id);
  return NextResponse.json({ success: true });
}
