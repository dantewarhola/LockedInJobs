import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // xlsx uploads + the preview-confirm round trip
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
