import type { NextConfig } from "next";
import { API_CONTENT_SECURITY_POLICY, securityHeaders } from "./lib/security/headers";

const isDev = process.env.NODE_ENV === "development";
const isHttps = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

// Cache Components (partial prerendering) is intentionally off: the strict,
// nonce-based CSP in proxy.ts needs every page rendered per request, and the
// Next.js docs note PPR cannot carry per-request nonces.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders({ isDev, isHttps }) },
      {
        source: "/api/:path*",
        headers: [{ key: "Content-Security-Policy", value: API_CONTENT_SECURITY_POLICY }],
      },
    ];
  },
};

export default nextConfig;
