import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'e-cdns-images.dzcdn.net' },
      { protocol: 'https', hostname: 'api.deezer.com' },
      { protocol: 'https', hostname: 'www.theaudiodb.com' },
    ],
  },
};

export default nextConfig;
