import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Temporarily ignore ESLint errors during builds on Vercel
    // Remove this once we identify the actual build issue
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
