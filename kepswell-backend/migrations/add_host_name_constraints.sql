-- ============================================================
-- Migration: Validasi nama host di level database
-- Tujuan:
--   1. CHECK CONSTRAINT: panjang nama 3–100 karakter
--   2. UNIQUE INDEX berbasis normalisasi (lowercase + no double space)
--      → mencegah duplikat yang lolos dari service layer
-- ============================================================

-- Lapis 3a: CHECK CONSTRAINT panjang nama
ALTER TABLE hosts
    ADD CONSTRAINT chk_hosts_full_name_length
        CHECK (
            LENGTH(TRIM(full_name)) >= 3
            AND LENGTH(TRIM(full_name)) <= 100
        );

-- Lapis 3b: UNIQUE INDEX berbasis normalisasi
--   LOWER + TRIM + ganti spasi ganda jadi 1 spasi
--   Fungsi REGEXP_REPLACE tersedia di PostgreSQL >= 9.4
CREATE UNIQUE INDEX uix_hosts_full_name_normalized
    ON hosts (
        LOWER(TRIM(REGEXP_REPLACE(full_name, '\s+', ' ', 'g')))
    );

-- ============================================================
-- Cara rollback jika diperlukan:
--
-- DROP INDEX IF EXISTS uix_hosts_full_name_normalized;
-- ALTER TABLE hosts DROP CONSTRAINT IF EXISTS chk_hosts_full_name_length;
-- ============================================================
