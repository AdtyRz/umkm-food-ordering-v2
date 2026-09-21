-- ---------- SESSION REVOCATION ----------
-- Session customer hangus saat pesanan selesai: revoked_at diisi,
-- token tidak bisa dipakai lagi (customer membuat token baru).
-- Idempotent: aman dijalankan berulang (MySQL & MariaDB).

SET @col_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'customer_sessions'
    AND COLUMN_NAME = 'revoked_at'
);
SET @ddl = IF(
  @col_exists = 0,
  'ALTER TABLE customer_sessions ADD COLUMN revoked_at TIMESTAMP NULL AFTER expires_at',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
