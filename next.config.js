/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      '@phosphor-icons/react',
      'recharts',
      'date-fns',
      '@tanstack/react-query',
    ],
  },
  modularizeImports: {
    '@phosphor-icons/react': {
      transform: '@phosphor-icons/react/dist/ssr/{{member}}',
      preventFullImport: true,
    },
  },
}

module.exports = nextConfig

