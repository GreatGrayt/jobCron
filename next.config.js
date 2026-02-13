/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable image optimization for API-only project
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
