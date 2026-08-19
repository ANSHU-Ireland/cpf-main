import {
  callPlatform,
  platformErrorResponse,
  projectPlatform,
} from '../../../lib/platform-api.server';
import { structure } from '../../../lib/employer-api.server';

export const dynamic = 'force-dynamic';

interface StructureBody {
  readonly kind?: unknown;
  readonly name?: unknown;
  readonly departmentId?: unknown;
}

interface Department {
  readonly id: string;
  readonly name: string;
}

interface Team {
  readonly id: string;
  readonly name: string;
  readonly departmentId: string;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const [departments, teams] = await Promise.all([
      callPlatform<{ items: readonly Department[] }>({
        request,
        path: '/organization/departments?limit=100',
        method: 'GET',
      }),
      callPlatform<{ items: readonly Team[] }>({
        request,
        path: '/organization/teams?limit=100',
        method: 'GET',
      }),
    ]);
    return Response.json(structure(departments.data, teams.data), {
      headers: { 'x-correlation-id': departments.correlationId },
    });
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
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
    return projectPlatform<Department, Department>(
      {
        request,
        path: '/organization/departments',
        method: 'POST',
        body: { name },
      },
      (item) => item,
      201,
    );
  }
  if (payload.kind === 'team') {
    const departmentId =
      typeof payload.departmentId === 'string' ? payload.departmentId.trim() : '';
    if (departmentId === '') {
      return Response.json({ error: 'A parent department is required.' }, { status: 422 });
    }
    return projectPlatform<Team, Team>(
      {
        request,
        path: '/organization/teams',
        method: 'POST',
        body: { name, departmentId },
      },
      (item) => item,
      201,
    );
  }
  return Response.json({ error: 'A valid structure kind is required.' }, { status: 422 });
}
