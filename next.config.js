/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  eslint: {
    dirs: ['app', 'lib', 'components'],
  },
}

module.exports = nextConfig