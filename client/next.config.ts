import type { NextConfig } from "next"
import path from "path"

const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: isDev,
  },
  images: {
    unoptimized: isDev,
  },
  experimental: {
    optimizeCss: !isDev,
    workerThreads: false,
  },
  output: 'standalone',
  async rewrites() {
    // Detect Docker environment via WATCHPACK_POLLING (set in local.yml)
    const apiUrl = process.env.WATCHPACK_POLLING ? 'http://backend:8000' : 'http://localhost:8000';
    console.log(`🔧 Proxying API requests to: ${apiUrl}`);

    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: '/vision/:path*',
        destination: `${apiUrl}/vision/:path*`,
      },
      {
        source: '/media/:path*',
        destination: `${apiUrl}/media/:path*`,
      },
    ]
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      }
    }
    return config
  },
}

export default nextConfig
