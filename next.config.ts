import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root: a stray lockfile in a parent folder otherwise makes Next infer the wrong
  // workspace root (warning on every start, and file tracing from the wrong directory).
  turbopack: { root: __dirname },
  images: {
    // The stills are already-compressed 1400px JPEGs; re-encoding them at the default 75 visibly
    // softened them. AVIF first: sharper than WebP at the same size.
    formats: ["image/avif", "image/webp"],
    qualities: [90],
  },
  async headers() {
    return [
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
