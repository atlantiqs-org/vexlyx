import type { NextConfig } from "next";

/**
 * Next.js configuration for the Vexlyx dashboard.
 * Transpiles the shared workspace package for monorepo compatibility.
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@vexlyx/shared"],
  // Produces .next/standalone — a minimal, self-contained server bundle used
  // by the production Docker image (F5.1) so the runtime image doesn't need
  // the full node_modules tree.
  output: "standalone",
};

export default nextConfig;
