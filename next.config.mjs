/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['gurukulkurukshetra.com'],
  },
  experimental: {
    serverComponentsExternalPackages: ['expresscheckout-nodejs', 'mysql2', 'bcryptjs'],
  },
};

export default nextConfig;
