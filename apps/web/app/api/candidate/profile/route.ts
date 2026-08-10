import { NextResponse } from 'next/server';
import { candidateStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const profile = await candidateStore.getCandidateProfile();
  return NextResponse.json(profile);
}
