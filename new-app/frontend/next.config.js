/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  transpilePackages: ["@react-pdf/renderer"],

  // Proxy: forward /api/v1/* and /storage/* to Express.js backend
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/v1/:path*`,
      },
      {
        source: "/storage/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/storage/:path*`,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/storage/**",
      },
    ],
  },

  // Bundle size optimization
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

module.exports = nextConfig;
