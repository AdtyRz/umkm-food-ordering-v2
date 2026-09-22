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
  experimental: {
    serverActions: {
      // Upload bukti transfer & foto produk lewat Server Action (FormData).
      // Default 1MB terlalu kecil — file validasi kita sampai 2MB, ditambah
      // overhead multipart/form-data (boundary + part headers ~10-20KB).
      bodySizeLimit: "3mb",
    },
  },
  images: {
    localPatterns: [
      {
        // Wajib di Next 16: semua gambar internal diambil lewat route
        // /api/images?path=... (query dinamis). Properti `search`
        // sengaja dihilangkan agar semua nilai query diizinkan — aman
        // karena route /api/images memvalidasi path di server.
        pathname: "/api/images",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
