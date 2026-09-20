/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Next 14 reads this from experimental; the top-level key arrived in 15 and is ignored
  // here, which left pg and argon2 to be bundled (and to fail) on a serverless deploy.
  experimental: {
    // argon2 is a native module with no build for newer Node versions; the app verifies
    // through WebAssembly instead (lib/argon2.ts). It stays here only for scripts.
    serverComponentsExternalPackages: ["argon2", "pg", "@react-pdf/renderer"],
    // These are read from disk at request time, so the tracer has to be told about them:
    // the PDF fonts and the email templates are not imported by any module.
    outputFileTracingIncludes: {
      "/api/bookings": ["./public/fonts/**", "./public/brand/emails/**"],
      "/api/atelier/**": ["./public/fonts/**", "./public/brand/emails/**"],
      "/api/cron/**": ["./public/fonts/**", "./public/brand/emails/**"],
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(self)" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // MediaPipe loads its WASM runtime as a script from the CDN, so the hand
              // tracker cannot start without this (SPEC §9: self + Spaces + MediaPipe).
              // 'wasm-unsafe-eval' is for browsers that no longer accept 'unsafe-eval' for WASM.
              "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' blob: data: https://*.digitaloceanspaces.com",
              "media-src 'self' blob:",
              "connect-src 'self' https://*.digitaloceanspaces.com https://cdn.jsdelivr.net https://storage.googleapis.com",
              "worker-src 'self' blob:",
              "child-src blob:",
              "frame-src 'none'",
            ].join("; "),
          },
        ],
      },
      {
        source: "/api/dev-asset/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
