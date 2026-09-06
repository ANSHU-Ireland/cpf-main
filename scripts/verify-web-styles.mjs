import assert from 'node:assert/strict';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import postcssConfig from '../apps/web/postcss.config.mjs';

// Run from the monorepo root, as deployment/CI do: relative Tailwind configuration once yielded
// an apparently successful build with no grid, spacing, or input-border utility styles.
const requireWeb = createRequire(new URL('../apps/web/package.json', import.meta.url));
const postcss = requireWeb('postcss');
const tailwind = requireWeb('tailwindcss');
const result = await postcss([tailwind(postcssConfig.plugins.tailwindcss)]).process(
  '@tailwind utilities;',
  { from: fileURLToPath(new URL('../apps/web/app/globals.css', import.meta.url)) },
);
const selectors = new Set();
result.root.walkRules((rule) => selectors.add(rule.selector));
for (const selector of ['.grid', '.border-line', '.w-full', '.rounded-md', '.md\\:grid-cols-2']) {
  assert.ok(selectors.has(selector), `Missing required web style: ${selector}`);
}
process.stdout.write('Web layout, input borders and responsive utility styles are present.\n');
