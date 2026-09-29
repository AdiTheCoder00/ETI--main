import type { NextConfig } from "next";
import { buildCsp } from "./lib/csp";

const nextConfig: NextConfig = {
  // Pin the project root: a stray lockfile in a parent folder otherwise makes Next infer the wrong
  // workspace root (warning on every start, and file tracing from the wrong directory).
  turbopack: { root: __dirname },
  images: {
    // The stills are already-compressed 1400px JPEGs; re-encoding them at the default 75 visibly
    // softened them. AVIF first: sharper than WebP at the same size.
    formats: ["image/avif", "image/webp"],
    qualities: [90],
    // Stills uploaded from /admin/work live in Vercel Blob. Public stores only, and only the work/
    // folder the upload route writes to; lib/content/flight-schema.ts refuses any other host on save.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/work/**" }],
  },
  // Don't advertise the framework in every response.
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Baseline hardening for every response.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      {
        // Content-Security-Policy for the public, prerendered pages. /admin gets a stricter, per-request
        // nonce policy from proxy.ts instead (see lib/csp.ts for why the two differ).
        source: "/:path((?!admin).*)",
        headers: [{ key: "Content-Security-Policy", value: buildCsp() }],
      },
      {
        // Hero clip and poster. Not content-hashed, so cache for a day and revalidate in the
        // background rather than forever; a replaced file shows up by the next visit.
        source: "/media/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
