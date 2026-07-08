/** @type {import('next').NextConfig} */
const webpack = require("webpack");

const nextConfig = {
  output: "standalone",
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Strip "node:" prefix so pptxgenjs browser bundle can be stubbed
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        })
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        buffer: false,
        crypto: false,
        os: false,
        util: false,
        events: false,
        url: false,
        http: false,
        https: false,
        zlib: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
