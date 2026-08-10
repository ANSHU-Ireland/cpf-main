import { NextResponse } from 'next/server';
import { candidateStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const modules = await candidateStore.getPracticeModules();
  return NextResponse.json(modules);
}
