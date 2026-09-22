import { NextRequest, NextResponse } from 'next/server';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/**
 * Serve gambar dari dua backend (sama dengan src/lib/storage.ts):
 * 1. Supabase Storage bucket public "uploads" (produksi)
 * 2. Filesystem public/uploads (fallback dev)
 *
 * Path divalidasi ketat: hanya [folder]/[filename] — tanpa traversal.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('path') ?? '';
  const normalized = raw.replace(/\\/g, '/').replace(/^\/+/, '');

  // Tolak path traversal & bentuk aneh
  if (
    !normalized ||
    normalized.includes('..') ||
    normalized.startsWith('.') ||
    normalized.includes('//')
  ) {
    return NextResponse.json({ error: 'Path tidak valid' }, { status: 400 });
  }

  const ext = ('.' + (normalized.split('.').pop() ?? '')).toLowerCase();
  if (!MIME[ext]) {
    return NextResponse.json({ error: 'Format tidak didukung' }, { status: 400 });
  }

  // --- Backend 1: Supabase Storage ---
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey) {
    const objectUrl = `${url.replace(/\/$/, '')}/storage/v1/object/uploads/${normalized}`;
    const upstream = await fetch(objectUrl, {
      headers: { Authorization: `Bearer ${anonKey}` },
      cache: 'no-store',
    });
    if (upstream.ok && upstream.body) {
      return new NextResponse(upstream.body, {
        headers: {
          'Content-Type': upstream.headers.get('content-type') ?? MIME[ext],
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
    // 400/404 dari storage → jatuh ke fallback lokal (file lama dev)
    if (upstream.status !== 400 && upstream.status !== 404) {
      return NextResponse.json({ error: 'Gambar tidak ditemukan' }, { status: 404 });
    }
  }

  // --- Backend 2: filesystem lokal (dev / migrasi) ---
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const filePath = join(process.cwd(), 'public', 'uploads', normalized);

  try {
    const data = await readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': MIME[ext],
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Gambar tidak ditemukan' }, { status: 404 });
  }
}
