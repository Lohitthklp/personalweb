/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static file serving from the root for existing assets
  async rewrites() {
    return []
  }
}

module.exports = nextConfig
