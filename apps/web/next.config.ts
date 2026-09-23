import type { NextConfig } from 'next';

const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
const parsedApiUrl = new URL(apiUrl);
if (
  !['http:', 'https:'].includes(parsedApiUrl.protocol) ||
  parsedApiUrl.username ||
  parsedApiUrl.password
) {
  throw new Error('API_INTERNAL_URL must be an HTTP(S) origin without credentials');
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ['@tixflow/shared'],
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${parsedApiUrl.origin}/api/v1/:path*` }];
  },
};

export default nextConfig;
