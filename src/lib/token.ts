/**
 * Token customer — modul murni (dapat diuji tanpa server).
 * Format: UMKM-XXXXX-XXXXX, alphabet tanpa karakter membingungkan.
 */
import { createHash, randomInt } from 'node:crypto';
import { APP_CONFIG, TOKEN_ALPHABET } from '@/constants';

export function randomTokenSegment(len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    // randomInt memakai crypto RNG — aman untuk token.
    out += TOKEN_ALPHABET[randomInt(TOKEN_ALPHABET.length)];
  }
  return out;
}

export function formatCustomerToken(segA: string, segB: string): string {
  return `UMKM-${segA}-${segB}`;
}

export function generateCustomerToken(): string {
  const [a, b] = APP_CONFIG.customerTokenSegments;
  return formatCustomerToken(randomTokenSegment(a), randomTokenSegment(b));
}

/** SHA-256 hex dari token (dinormalisasi ke huruf besar tanpa spasi). */
export function hashToken(token: string): string {
  return createHash('sha256')
    .update(token.trim().toUpperCase())
    .digest('hex');
}
