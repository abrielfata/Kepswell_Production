-- ============================================================
-- RESET HOSTS & REPORTS
-- Hapus semua data host dan laporan, lalu reset sequence ID.
-- Urutan DELETE disesuaikan dengan foreign key:
--   reports        -> host_id FK ke hosts
--   host_registration_codes -> host_id FK ke hosts
-- ============================================================

BEGIN;

-- 1. Hapus semua laporan
TRUNCATE TABLE reports RESTART IDENTITY CASCADE;

-- 2. Hapus kode registrasi Telegram
TRUNCATE TABLE host_registration_codes RESTART IDENTITY CASCADE;

-- 3. Hapus semua host
TRUNCATE TABLE hosts RESTART IDENTITY CASCADE;

COMMIT;

-- Verifikasi
SELECT 'hosts'                  AS tabel, COUNT(*) AS sisa_data FROM hosts
UNION ALL
SELECT 'host_registration_codes', COUNT(*) FROM host_registration_codes
UNION ALL
SELECT 'reports'                , COUNT(*) FROM reports;
