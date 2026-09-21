import type { NextConfig } from "next";

/**
 * Security headers (PRD §83-85):
 *   - HSTS            : wajib HTTPS saat produksi
 *   - frame-ancestors : anti clickjacking (ganti X-Frame-Options modern)
 *   - nosniff         : browser tidak menebak MIME
 *   - referrer        : token/order tidak bocor via Referer
 *   - permissions     : browser API tidak perlu → dimatikan
 */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
