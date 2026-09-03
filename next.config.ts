import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Avertissement : cela permet aux builds de production de réussir avec succès
    // même s'il y a des erreurs ESLint.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
