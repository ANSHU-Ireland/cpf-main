import { OPERATIONS, type OperationRef } from '@cpf/contracts';

export interface CompiledRoute {
  readonly op: OperationRef;
  readonly regex: RegExp;
  readonly paramNames: readonly string[];
  /** Path segments as declared, e.g. ['campaigns', '{campaignId}', 'reviewers']. */
  readonly segments: readonly string[];
}

export interface RouteMatch {
  readonly route: CompiledRoute;
  readonly params: Readonly<Record<string, string>>;
}

function compile(op: OperationRef): CompiledRoute {
  const segments = op.path.split('/').filter((s) => s.length > 0);
  const paramNames: string[] = [];
  const pattern = segments
    .map((seg) => {
      if (seg.startsWith('{') && seg.endsWith('}')) {
        const name = seg.slice(1, -1);
        paramNames.push(name);
        return '([^/]+)';
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return {
    op,
    regex: new RegExp(`^/${pattern}/?$`),
    paramNames,
    segments,
  };
}

export class Router {
  private readonly routes: CompiledRoute[] = OPERATIONS.map(compile);

  match(method: string, pathname: string): RouteMatch | null {
    const upper = method.toUpperCase();
    for (const route of this.routes) {
      if (route.op.method !== upper) continue;
      const m = route.regex.exec(pathname);
      if (m === null) continue;
      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(m[i + 1] ?? '');
      });
      return { route, params };
    }
    return null;
  }

  /** True if the path exists for any method (used to distinguish 404 from 405). */
  pathExists(pathname: string): boolean {
    return this.routes.some((r) => r.regex.test(pathname));
  }

  get all(): readonly CompiledRoute[] {
    return this.routes;
  }
}

export type RouteKind = 'list' | 'item' | 'create' | 'action' | 'update' | 'delete';

/** Classifies a matched route and derives its in-memory collection key + target id. */
export function classify(
  route: CompiledRoute,
  params: Readonly<Record<string, string>>,
): { kind: RouteKind; collectionKey: string; targetId: string | null } {
  const { segments, op } = route;
  const method = op.method;
  const last = segments[segments.length - 1] ?? '';
  const lastIsParam = last.startsWith('{') && last.endsWith('}');

  const keyOf = (segs: readonly string[]): string =>
    segs
      .map((s) => (s.startsWith('{') && s.endsWith('}') ? `:${params[s.slice(1, -1)] ?? ''}` : s))
      .join('/');

  if (lastIsParam) {
    const collection = segments.slice(0, -1);
    const targetId = params[last.slice(1, -1)] ?? null;
    const key = keyOf(collection);
    if (method === 'GET') return { kind: 'item', collectionKey: key, targetId };
    if (method === 'PUT' || method === 'PATCH')
      return { kind: 'update', collectionKey: key, targetId };
    if (method === 'DELETE') return { kind: 'delete', collectionKey: key, targetId };
    return { kind: 'update', collectionKey: key, targetId };
  }

  // Path ends in a literal segment. If the segment just before it is a param, this is an
  // action on an item (e.g. /campaigns/{id}/activate); otherwise it's a collection route.
  const prev = segments[segments.length - 2] ?? '';
  const prevIsParam = prev.startsWith('{') && prev.endsWith('}');
  const key = keyOf(segments);

  if (prevIsParam && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    const targetId = params[prev.slice(1, -1)] ?? null;
    return { kind: 'action', collectionKey: key, targetId };
  }

  if (method === 'GET') return { kind: 'list', collectionKey: key, targetId: null };
  if (method === 'POST') return { kind: 'create', collectionKey: key, targetId: null };
  return { kind: 'action', collectionKey: key, targetId: null };
}
