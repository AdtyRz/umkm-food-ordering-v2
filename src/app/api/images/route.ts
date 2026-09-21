import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/**
 * Serve gambar dari public/uploads.
 * Path divalidasi ketat: hanya [folder]/[filename] di dalam uploads.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('path') ?? '';
  const normalized = normalize(raw).replace(/^(\.\.(\/|\\|$))+/, '');

  // Tolak path traversal
  if (
    !normalized ||
    normalized.startsWith('.') ||
    normalized.includes('..') ||
    normalized.startsWith('/')
  ) {
    return NextResponse.json({ error: 'Path tidak valid' }, { status: 400 });
  }

  const ext = extname(normalized).toLowerCase();
  if (!MIME[ext]) {
    return NextResponse.json({ error: 'Format tidak didukung' }, { status: 400 });
  }

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
