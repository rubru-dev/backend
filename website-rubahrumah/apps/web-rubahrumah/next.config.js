function remotePatternFromEnv(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return {
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      port: url.port || undefined,
    };
  } catch {
    return null;
  }
}

const envRemotePatterns = [
  remotePatternFromEnv(process.env.NEXT_PUBLIC_STORAGE_URL),
  remotePatternFromEnv(process.env.NEXT_PUBLIC_API_URL),
].filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@rubahrumah/types", "@rubahrumah/utils"],
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "localhost", port: "4000" },
      { protocol: "https", hostname: "api.rubahrumah.id" },
      { protocol: "https", hostname: "img.youtube.com" },
      ...envRemotePatterns,
    ],
  },
};

module.exports = nextConfig;
