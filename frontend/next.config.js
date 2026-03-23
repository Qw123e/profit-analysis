/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  basePath: "/bi_poc",
  assetPrefix: "/bi_poc",
  experimental: {
    missingSuspenseWithCSRBailout: false
  }
};

module.exports = nextConfig;

