import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface ScreenRoute {
  readonly id: string;
  readonly route: string;
  readonly routeFile: string;
}

function routeToPageFile(route: string): string {
  const segments = route
    .replace(/^\//, '')
    .split('/')
    .map((segment) => (segment.startsWith(':') ? `[${segment.slice(1)}]` : segment));
  return `${segments.join('/')}/page.tsx`;
}

const projectRoot = process.cwd();
const interfaceDirectory = resolve(projectRoot, 'cpf-penpot-handoff/interfaces');
const SCREEN_ROUTES: readonly ScreenRoute[] = readdirSync(interfaceDirectory)
  .filter((file) => file.endsWith('.svg'))
  .sort()
  .map((file) => {
    const source = readFileSync(resolve(interfaceDirectory, file), 'utf8');
    const route = source.match(/>(\/[A-Za-z0-9_:/.-]+)</)?.[1] ?? '';
    const id = basename(file, '.svg').toUpperCase();
    return { id, route, routeFile: routeToPageFile(route) };
  });

describe('canonical handoff routes', () => {
  it('loads all 125 verified handoff entries', () => {
    expect(SCREEN_ROUTES).toHaveLength(125);
    expect(SCREEN_ROUTES.every(({ id, route }) => id.length > 0 && route.startsWith('/'))).toBe(
      true,
    );
  });

  it.each(SCREEN_ROUTES)('$id provides canonical route $route', ({ routeFile }) => {
    const appDirectory = resolve(projectRoot, 'apps/web/app');
    expect(existsSync(resolve(appDirectory, routeFile))).toBe(true);
  });
});
