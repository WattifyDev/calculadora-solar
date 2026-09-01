import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["react-pdf", "@react-pdf/renderer", "pdf-to-png-converter", "@napi-rs", "@napi-rs/canvas", "@napi-rs/canvas-win32-x64-msvc"],
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false
  },
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;
