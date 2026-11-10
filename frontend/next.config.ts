import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    inlineCss: true,
  },
  turbopack: {
    resolveAlias: {
      "../build/polyfills/polyfill-module": "./lib/noop-polyfill.ts",
      "next/dist/build/polyfills/polyfill-module": "./lib/noop-polyfill.ts",
      "next/dist/esm/build/polyfills/polyfill-module": "./lib/noop-polyfill.ts",
    },
  },
};

export default nextConfig;
