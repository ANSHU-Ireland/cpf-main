import { NextResponse } from 'next/server';
import { candidateStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = await candidateStore.getSystemChecks();
  return NextResponse.json(checks);
}

export async function POST() {
  const checks = await candidateStore.runSystemChecks();
  return NextResponse.json(checks);
}
