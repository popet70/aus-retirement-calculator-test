/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',  // Commented out
  images: {
    unoptimized: true
  },
  eslint: {
    dirs: ['app', 'lib', '__tests__'],
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig