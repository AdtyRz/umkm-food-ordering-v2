-- 004: Pengaturan bot WhatsApp (nomor perangkat + status aktif).
-- Bot aktif  → notifikasi status otomatis via provider (Fonnte dkk).
-- Bot mati   → admin kirim pemberitahuan manual ke nomor customer (format +62).
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS wa_bot_number text,
  ADD COLUMN IF NOT EXISTS wa_bot_enabled boolean NOT NULL DEFAULT false;
