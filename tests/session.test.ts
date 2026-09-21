import { describe, expect, it } from 'vitest';
import { isValidCustomerTokenFormat } from '@/utils';
import {
  formatCustomerToken,
  generateCustomerToken,
  hashToken,
} from '@/lib/token';

describe('customer token', () => {
  it('generate token sesuai format UMKM-XXXXX-XXXXX', () => {
    const token = generateCustomerToken();
    expect(isValidCustomerTokenFormat(token)).toBe(true);
  });

  it('karakter token berasal dari alphabet aman', () => {
    const token = generateCustomerToken();
    const body = token.replace('UMKM-', '').replace(/-/g, '');
    expect(body).toMatch(/^[2-9A-HJ-NP-Z]+$/);
  });

  it('hash konsisten & case-insensitive', () => {
    const t1 = hashToken('umkm-7xk9p-q2m4n');
    const t2 = hashToken('UMKM-7XK9P-Q2M4N');
    expect(t1).toBe(t2);
    expect(t1).toHaveLength(64); // sha256 hex
  });

  it('hash token berbeda → hash berbeda', () => {
    expect(hashToken('UMKM-AAAAA-BBBBB')).not.toBe(hashToken('UMKM-CCCCC-DDDDD'));
  });

  it('formatCustomerToken menyusun dengan benar', () => {
    expect(formatCustomerToken('7XK9P', 'Q2M4N')).toBe('UMKM-7XK9P-Q2M4N');
  });
});
