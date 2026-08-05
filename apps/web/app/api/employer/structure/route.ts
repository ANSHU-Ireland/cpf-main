import { employerStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface StructureBody {
  readonly kind?: unknown;
  readonly name?: unknown;
  readonly departmentId?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(employerStore.getStructure());
}

export async function POST(request: Request): Promise<Response> {
  let payload: StructureBody;
  try {
    payload = (await request.json()) as StructureBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (name.length < 2) {
    return Response.json({ error: 'A name is required.' }, { status: 422 });
  }
  if (payload.kind === 'department') {
    return Response.json(employerStore.addDepartment(name), { status: 201 });
  }
  if (payload.kind === 'team') {
    const departmentId = typeof payload.departmentId === 'string' ? payload.departmentId : '';
    const team = employerStore.addTeam(name, departmentId);
    if (team === null) {
      return Response.json({ error: 'Parent department not found.' }, { status: 422 });
    }
    return Response.json(team, { status: 201 });
  }
  return Response.json(
    { error: 'A valid kind (department or team) is required.' },
    { status: 422 },
  );
}
