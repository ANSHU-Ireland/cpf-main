/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship raw TypeScript (main: src/index.ts); Next must transpile them.
  transpilePackages: ['@cpf/tokens', '@cpf/ui'],
  eslint: {
    // Linting is enforced by the repo-level flat config (`pnpm run lint`), not next lint.
    ignoreDuringBuilds: true,
  },
  webpack(config) {
    // Workspace packages use NodeNext-style `.js` import specifiers that point at `.ts`/`.tsx`
    // source. Teach webpack to resolve those extensions so barrels like `@cpf/ui` load.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
