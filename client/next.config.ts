import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: isDev,
  },
  images: {
    unoptimized: isDev,
  },
  experimental: {
    optimizeCss: !isDev,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/:path*` : 'http://backend:8000/api/:path*'
      },
      {
        source: '/media/:path*',
        destination: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/media/:path*` : 'http://backend:8000/media/:path*'
      },
      {
        source: '/health',
        destination: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/health` : 'http://backend:8000/health'
      }
    ]
  },
  webpack: (config) => {
    if (isDev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  }
}

export default nextConfig
