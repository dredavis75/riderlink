import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Deezer artist images
      { protocol: 'https', hostname: 'cdn-images.dzcdn.net' },
      // Wikipedia / Wikimedia Commons
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
  },
};

export default nextConfig;
