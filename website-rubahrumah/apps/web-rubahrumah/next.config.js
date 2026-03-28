/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@rubahrumah/types", "@rubahrumah/utils"],
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "localhost", port: "4000" },
      { protocol: "https", hostname: "api.rubahrumah.id" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
};

module.exports = nextConfig;
