import type { NextConfig } from "next";

/**
 * Next.js configuration for the Vexlyx dashboard.
 * Transpiles the shared workspace package for monorepo compatibility.
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@vexlyx/shared"],
};

export default nextConfig;
