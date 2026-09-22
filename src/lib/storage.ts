/**
 * Penyimpanan gambar development (lokal di public/uploads).
 * Saat migrasi ke Supabase Storage, ganti implementasi folder & serving
 * tanpa mengubah pemanggil (uploadImageAction / <img src=/api/images?path=...>).
 */
import 'server-only';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

const UPLOAD_ROOT = join(process.cwd(), 'public', 'uploads');

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Simpan file → return path relatif, mis. "products/ab12-....jpg". */
export async function saveUploadedImage(
  file: File,
  folder: 'products' | 'store' | 'qris' | 'proofs'
): Promise<string> {
  const ext = EXT_BY_MIME[file.type] ?? 'bin';
  const filename = `${randomUUID()}.${ext}`;
  const dir = join(UPLOAD_ROOT, folder);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(dir, filename), buffer);
  return `${folder}/${filename}`;
}
