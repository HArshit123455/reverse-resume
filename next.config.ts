import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  // Allow MDX files via webpack loader; configured in Phase 5
  pageExtensions: ["ts", "tsx"],
};

export default config;
