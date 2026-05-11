import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  pageExtensions: ["ts", "tsx"],
  serverExternalPackages: ["tree-sitter", "tree-sitter-typescript"],
};

export default config;
