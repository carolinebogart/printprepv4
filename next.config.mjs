/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow LAN access during local dev (e.g. testing from another device on the same network)
  allowedDevOrigins: ['192.168.2.*'],
  // Sharp is used for image processing - ensure it's available server-side
  serverExternalPackages: ['sharp', 'canvas', 'pdfjs-dist'],
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
