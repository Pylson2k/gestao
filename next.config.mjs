/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  // Next.js 16: serverComponentsExternalPackages moved to root level
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
}

export default nextConfig
