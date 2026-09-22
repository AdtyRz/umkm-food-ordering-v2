/**
 * Penyimpanan gambar — DUA backend, satu antarmuka:
 *
 * 1. Supabase Storage (produksi): hosting read-only/ephemeral, jadi file
 *    TIDAK bisa ditulis ke public/uploads. Kita pakai bucket public
 *    "uploads" dengan struktur folder sama seperti lokal.
 * 2. Filesystem lokal (development fallback): dipakai bila Supabase
 *    Storage belum terkonfigurasi.
 *
 * Serving TIDAK berubah: semua gambar tetap lewat /api/images?path=...
 * (route menyesuaikan backend, lihat src/app/api/images/route.ts).
 */
import 'server-only';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

const UPLOAD_ROOT = join(process.cwd(), 'public', 'uploads');
const STORAGE_BUCKET = 'uploads';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export type UploadFolder = 'products' | 'store' | 'qris' | 'proofs';

function getSupabaseStorageConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Service role dulu (bypass RLS); fallback anon untuk project dengan
  // policy insert longgar. Tanpa keduanya → fallback filesystem lokal.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), key };
}

/** Pastikan bucket public "uploads" ada (dibuat sekali, idempoten). */
async function ensureBucket(cfg: { url: string; key: string }): Promise<void> {
  const check = await fetch(`${cfg.url}/storage/v1/bucket/${STORAGE_BUCKET}`, {
    headers: { Authorization: `Bearer ${cfg.key}` },
  });
  if (check.ok) return;

  const create = await fetch(`${cfg.url}/storage/v1/bucket`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: STORAGE_BUCKET, name: STORAGE_BUCKET, public: true }),
  });
  // 409 = sudah ada (race) → aman
  if (!create.ok && create.status !== 409) {
    throw new Error(`Gagal membuat bucket ${STORAGE_BUCKET}: HTTP ${create.status}`);
  }
}

/**
 * Simpan file → return path relatif, mis. "products/ab12-....jpg".
 * Path ini disimpan di DB dan di-serve via /api/images?path=...
 */
export async function saveUploadedImage(
  file: File,
  folder: UploadFolder
): Promise<string> {
  const ext = EXT_BY_MIME[file.type] ?? 'bin';
  const filename = `${randomUUID()}.${ext}`;
  const objectPath = `${folder}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const cfg = getSupabaseStorageConfig();
  if (cfg) {
    await ensureBucket(cfg);
    const res = await fetch(
      `${cfg.url}/storage/v1/object/${STORAGE_BUCKET}/${objectPath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.key}`,
          'Content-Type': file.type,
          // upsert menghindari error 409 bila UUID duplikat (sangat jarang)
          'x-upsert': 'true',
        },
        body: new Uint8Array(buffer),
      }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Gagal upload ke Supabase Storage: HTTP ${res.status} ${detail.slice(0, 200)}`);
    }
    return objectPath;
  }

  // Fallback dev: filesystem lokal
  const dir = join(UPLOAD_ROOT, folder);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), buffer);
  return objectPath;
}
