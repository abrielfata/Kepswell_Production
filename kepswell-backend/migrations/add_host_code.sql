-- ============================================================
-- Migration: Tambah host_code (KSW-XXXX) sebagai identifier unik
-- ============================================================

-- Langkah 1: Hapus unique constraint lama pada full_name
-- (nama bukan lagi satu-satunya pembeda, host_code yang menjadi pembeda)
DROP INDEX IF EXISTS uix_hosts_full_name_normalized;

-- Langkah 2: Tambah kolom host_code (nullable dulu agar bisa di-backfill)
ALTER TABLE hosts
    ADD COLUMN IF NOT EXISTS host_code VARCHAR(10);

-- Langkah 3: Backfill host_code untuk data yang sudah ada
UPDATE hosts
    SET host_code = 'KSW-' || LPAD(id::text, 4, '0')
    WHERE host_code IS NULL;

-- Langkah 4: Set NOT NULL dan UNIQUE setelah backfill selesai
ALTER TABLE hosts
    ALTER COLUMN host_code SET NOT NULL;

ALTER TABLE hosts
    ADD CONSTRAINT uq_hosts_host_code UNIQUE (host_code);

-- ============================================================
-- Cara rollback jika diperlukan:
--
-- ALTER TABLE hosts DROP CONSTRAINT IF EXISTS uq_hosts_host_code;
-- ALTER TABLE hosts DROP COLUMN IF EXISTS host_code;
-- ============================================================
