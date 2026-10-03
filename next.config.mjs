/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['gurukulkurukshetra.com'],
  },
  experimental: {
    serverComponentsExternalPackages: ['expresscheckout-nodejs'],
  },
};

export default nextConfig;
