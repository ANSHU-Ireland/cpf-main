import { fileURLToPath, URL } from 'node:url';

/** @type {import('tailwindcss').Config} */
export default {
  // Resolve globs relative to this file, including builds invoked from the monorepo root.
  content: [
    fileURLToPath(new URL('./app/**/*.{js,ts,jsx,tsx,mdx}', import.meta.url)).replaceAll('\\', '/'),
    fileURLToPath(
      new URL('../../packages/ui/src/**/*.{js,ts,jsx,tsx}', import.meta.url),
    ).replaceAll('\\', '/'),
  ],
  theme: {
    extend: {
      colors: {
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        line: 'var(--color-line)',
        soft: 'var(--color-soft)',
        paper: 'var(--color-paper)',
        nav: 'var(--color-nav)',
        blue: 'var(--color-blue)',
        'blue-soft': 'var(--color-blue-soft)',
        sage: 'var(--color-sage)',
        'sage-soft': 'var(--color-sage-soft)',
        amber: 'var(--color-amber)',
        'amber-soft': 'var(--color-amber-soft)',
        red: 'var(--color-red)',
        'red-soft': 'var(--color-red-soft)',
        purple: 'var(--color-purple)',
        'purple-soft': 'var(--color-purple-soft)',
      },
      fontFamily: {
        sans: ['var(--font-family)'],
      },
      borderRadius: {
        control: 'var(--radius-control)',
        surface: 'var(--radius-surface)',
      },
      minHeight: {
        target: 'var(--target-min)',
      },
      minWidth: {
        target: 'var(--target-min)',
      },
    },
  },
  plugins: [],
};
