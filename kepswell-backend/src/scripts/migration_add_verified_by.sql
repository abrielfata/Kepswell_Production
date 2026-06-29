-- Migration: Tambah kolom verified_by ke tabel reports
-- Jalankan script ini di SQL Console Render (atau database PostgreSQL kamu)
-- Tanggal: 2026-06-29

-- 1. Tambah kolom verified_by sebagai foreign key ke tabel users
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- 2. Tambah index untuk mempercepat query yang melibatkan verified_by
CREATE INDEX IF NOT EXISTS idx_reports_verified_by ON reports(verified_by);

-- Verifikasi: cek struktur tabel reports setelah migration
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'reports'
-- ORDER BY ordinal_position;
