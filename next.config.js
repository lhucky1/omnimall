require('dotenv').config()
/** @type {import('next').NextConfig} */
const nextConfig = {
  // REQUIRED for Capacitor
  output: 'export',

  // Keep your existing ignores
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Next Image must be unoptimized for static export
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'vprrsqlwwmurpzskkppz.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'jxttyh7j39we.space.minimax.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'z8ny10ti8dl9.space.minimax.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'j5uhsgqzs908.space.minimax.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'underground-peach-5pyqi8uvp3-a79eqti624.edgeone.dev',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
