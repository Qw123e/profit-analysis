/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: "",
  assetPrefix: "",
  experimental: {
    missingSuspenseWithCSRBailout: false
  }
};

module.exports = nextConfig;

