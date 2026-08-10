import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface ScreenRoute {
  readonly id: string;
  readonly route: string;
  readonly routeFile: string;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      fields.push(field);
      field = '';
    } else {
      field += character;
    }
  }

  fields.push(field);
  return fields;
}

function routeToPageFile(route: string): string {
  const segments = route
    .replace(/^\//, '')
    .split('/')
    .map((segment) => (segment.startsWith(':') ? `[${segment.slice(1)}]` : segment));
  return `${segments.join('/')}/page.tsx`;
}

const projectRoot = process.cwd();
const inventoryPath = resolve(projectRoot, 'cpf-penpot-handoff/coverage/screen_inventory.csv');
const [headerLine = '', ...inventoryLines] = readFileSync(inventoryPath, 'utf8')
  .replace(/^\uFEFF/, '')
  .trim()
  .split(/\r?\n/);
const headers = parseCsvLine(headerLine);
const idIndex = headers.indexOf('screen_id');
const routeIndex = headers.indexOf('route');
const SCREEN_ROUTES: readonly ScreenRoute[] = inventoryLines.map((line) => {
  const fields = parseCsvLine(line);
  const id = fields[idIndex] ?? '';
  const route = fields[routeIndex] ?? '';
  return { id, route, routeFile: routeToPageFile(route) };
});

describe('canonical handoff routes', () => {
  it('loads all 125 verified handoff entries', () => {
    expect(idIndex).toBeGreaterThanOrEqual(0);
    expect(routeIndex).toBeGreaterThanOrEqual(0);
    expect(SCREEN_ROUTES).toHaveLength(125);
  });

  it.each(SCREEN_ROUTES)('$id provides canonical route $route', ({ routeFile }) => {
    const appDirectory = resolve(projectRoot, 'apps/web/app');
    expect(existsSync(resolve(appDirectory, routeFile))).toBe(true);
  });
});
