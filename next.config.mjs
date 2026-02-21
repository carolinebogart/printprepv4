/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sharp is used for image processing - ensure it's available server-side
  serverExternalPackages: ['sharp'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Disable image optimization (we handle our own via Sharp)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
