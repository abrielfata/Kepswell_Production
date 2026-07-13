# Product Requirements Document (PRD) - Kepswell Projection

## 1. Overview
- **Nama Produk**: Kepswell Projection (Telegram Bot & Web Dashboard)
- **Ringkasan Singkat**: Kepswell adalah sistem manajemen laporan performa _livestreaming_ komprehensif yang terdiri dari Telegram Bot untuk membaca screenshot hasil _live_ secara otomatis (menggunakan teknologi OCR) dan Web Dashboard bagi admin untuk memvalidasi laporan dan memantau peringkat (_leaderboard_) host/streamer.
- **Latar Belakang / Problem**: Host atau streamer sering kali kerepotan merekap hasil _live_ (GMV, durasi, pesanan SKU) secara manual ke admin. Di sisi lain, admin/manajer kesulitan merekap puluhan hingga ratusan laporan screenshot ke dalam Excel secara manual setiap harinya, yang sangat memakan waktu dan rawan akan _human error_. Dibutuhkan sistem otomasi ekstraksi data dari gambar dan dasbor pemantauan terpusat untuk efisiensi.

## 2. Tujuan (Goals)
- **Tujuan Utama (Business Goal)**: Mempercepat dan mengotomatisasi proses rekapitulasi data penjualan (GMV) host serta menciptakan lingkungan yang transparan dan kompetitif melalui fitur _leaderboard_ otomatis bagi para streamer.
- **Tujuan Produk**: 
  - Menyediakan bot Telegram yang akurat mengekstrak angka GMV, Durasi, dan Pesanan SKU dari tangkapan layar (screenshot).
  - Menyediakan Web UI (Dasbor) yang bersih, cepat, interaktif, dan mudah digunakan bagi admin untuk mengelola (Approve/Reject) laporan.
- **Non-goals**: Sistem ini **sengaja tidak** mengerjakan otomasi pembayaran/komisi (payroll) secara otomatis, dan **tidak** berintegrasi langsung ke API marketplace (TikTok/Shopee/dll) melainkan murni mengandalkan data dari ekstraksi gambar (screenshot) sebagai _proof of work_.

## 3. Target User / Persona
1. **Host / Streamer**
   - **Kebutuhan**: Ingin setor laporan hasil _live_ secepat mungkin tanpa harus mengetik teks nominal yang panjang dan rumit.
   - **Pain Point**: Malas mengetik nominal GMV secara teliti, rawan salah format, dan butuh cara semudah mengirim foto ke grup/bot.
2. **Admin / Manajer**
   - **Kebutuhan**: Ingin melihat siapa host terbaik bulan ini, memvalidasi daftar laporan yang masuk, dan mengekspor data ke Excel/CSV untuk rekap gaji.
   - **Pain Point**: Kelelahan visual (mata lelah) karena harus membaca screenshot buram dan mengetik ulang data ke Excel satu per satu.

## 4. User Stories / Use Case
- **Sebagai Host**, saya ingin mengirim screenshot statistik _live_ ke Telegram Bot, supaya data saya otomatis terekam tanpa perlu mengetik manual.
- **Sebagai Admin**, saya ingin login ke Web Dashboard, supaya saya bisa mengelola data sistem dengan aman.
- **Sebagai Admin**, saya ingin melihat daftar laporan masuk di halaman Reports, supaya saya bisa mencocokkan hasil ekstraksi OCR dengan gambar asli lalu memutuskan untuk klik _Approve_ atau _Reject_.
- **Sebagai Admin**, saya ingin melihat grafik performa dan ranking GMV di halaman Dashboard, supaya saya tahu pencapaian host secara keseluruhan pada bulan tertentu.
- **Sebagai Admin**, saya ingin men-download CSV peringkat host, supaya data tersebut bisa diproses lebih lanjut oleh tim keuangan/komisi.

## 5. Functional Requirements & Spesifikasi UI
### 5.1. Modul Bot (Host Facing) - (Prioritas: Must Have)
- **Terima Laporan**: Bot dapat menerima unggahan gambar/foto.
- **Ekstraksi OCR**: Membaca gambar dan mendeteksi teks (menggunakan API eksternal) untuk mencari nilai GMV, Menit/Jam (Durasi), dan Pesanan SKU menggunakan algoritma Regex.
- **Simpan Data**: Menyimpan hasil pembacaan ke database PostgreSQL dengan status `Pending` (Menunggu Persetujuan Admin).

### 5.2. Halaman Login (`/login`) - (Prioritas: Must Have)
- **Tujuan**: Memastikan hanya pengguna terotorisasi yang dapat mengakses Dasbor.
- **Spesifikasi UI**: Form Login elegan dengan input Username/Email dan Password. Menyediakan *feedback visual* (Notifikasi error/snackbar) jika kredensial salah. 
- **Alur**: Autentikasi berhasil -> Token JWT disimpan ke dalam _AuthContext_ -> Redirect otomatis ke Dashboard (`/`).

### 5.3. Halaman Dashboard (`/`) - (Prioritas: Must Have)
- **Tujuan**: Menyajikan ringkasan kinerja semua host dan metrik penting perusahaan.
- **Spesifikasi Fitur & UI**:
  - **Header & Filter**: Filter dropdown untuk memilih berdasarkan Bulan tertentu atau "Semua Periode". Tombol **Export CSV** untuk mengunduh laporan peringkat host.
  - **Kartu Statistik (Stat Cards)**: 5 metrik utama (Total Laporan, Menunggu, Disetujui, Ditolak, Total GMV).
  - **Visualisasi Grafik (Bar Chart)**: Menampilkan kontribusi GMV per Host menggunakan Recharts. Sumbu-X (Nama Host), Sumbu-Y (Nilai GMV).
  - **Tabel Peringkat Ringkas & Lengkap**: Menampilkan Top 8 Host untuk tampilan ringkas, dan tabel _scrollable_ lengkap memuat Rank, Nama Host, Total GMV, Jumlah Sesi, Total Durasi, dan Pesanan SKU.

### 5.4. Halaman Laporan (`/reports`) - (Prioritas: Must Have)
- **Tujuan**: Lokasi admin memvalidasi laporan dari Bot.
- **Spesifikasi Fitur & UI**:
  - **Tabel Data Laporan**: Menampilkan list laporan (Nama Host, Tanggal, Durasi, Pesanan SKU, GMV, dan Status).
  - **Status Badge/Chip**: Menggunakan *MUI Chip* dengan warna semantik (Kuning = Menunggu, Hijau = Disetujui, Merah = Ditolak).
  - **Aksi Validasi**: Tombol untuk Approve atau Reject yang terhubung dengan modal konfirmasi / update ke API Backend.

### 5.5. Halaman Host (`/hosts`) - (Prioritas: Should Have)
- **Tujuan**: Manajemen master data Host/Streamer (CRUD).
- **Spesifikasi Fitur & UI**:
  - Tabel berisi Nama Host, ID, Tanggal Bergabung, dan Status Aktif.
  - Tombol Tambah Host (memunculkan *MUI Dialog*), Edit Data, dan *Deactivate*.

## 6. Non-Functional Requirements
- **Performance**: 
  - Backend/Bot harus menyelesaikan proses OCR maksimal dalam **45 detik** (batas *timeout* layanan OCR.Space).
  - Dasbor UI harus merender data di bawah **3 detik** dengan dukungan optimalisasi `stale-time` dari React Query sebesar 30 detik (sehingga tidak _over-fetching_).
- **Security**: Endpoint API Dashboard dan *routing* halaman web wajib diproteksi menggunakan JSON Web Token (JWT).
- **Scalability**: Menggunakan arsitektur terpisah antara antarmuka (React SPA) dan logika server (Node.js API) sehingga penambahan fitur di satu sisi tidak merusak ekosistem keseluruhan.
- **Compatibility**: Mendukung rendering responsif dan dapat diakses dengan lancar pada peramban moderen PC/Mac (Chrome, Safari, Firefox, Edge).

## 7. Tech Stack & Standar Desain
### Tech Stack Utama
- **Frontend**: React 19, Vite, TypeScript, Material-UI (MUI) v9, Recharts, Axios, React Query v5.
- **Backend**: Node.js, Express, TypeScript, `node-telegram-bot-api`, `form-data`, `jsonwebtoken`, `bcryptjs`.
- **Database**: PostgreSQL (akses SQL langsung melalui library `pg`).
- **Layanan Pihak Ketiga**: **OCR.Space API** (ekstraksi mesin pembaca karakter gambar).

### Tema & Standar Desain UI
- **Typography**: Font "Inter", _sans-serif_.
- **Warna Utama (_Color Palette_)**: 
  - Primary Blue: `#2563EB`
  - Success Green: `#16a34a`
  - Error Red: `#dc2626`
  - Warning Orange: `#d97706`
  - Background Utama: Abu-abu terang (`#f8f9fb`), Surface Card: Putih (`#ffffff`).
- **Bentuk (Shapes)**: Mengusung gaya modern, datar (flat), dan _clean_. Card _elevation_ disetel 0 dengan border radius standar `8px - 10px` dan garis batas tipis (`1px solid #e5e7eb`).

## 8. Alur Sistem / Flowchart
1. Sesi _live streaming_ selesai -> Host membuat _screenshot_ layar statistik akhir.
2. Host mengunggah _screenshot_ ke Telegram Bot Kepswell.
3. Backend menerima gambar -> Menyambungkan ke layanan OCR.Space.
4. Mesin OCR mengembalikan teks mentah -> Backend mengeksekusi logika *Regex* untuk menyaring nilai GMV, Menit, dan Pesanan.
5. Laporan secara otomatis tersimpan di tabel database berstatus `Pending`.
6. Admin _login_ ke Web Dashboard -> Masuk ke halaman `/reports`.
7. Admin mencocokkan angka hasil OCR dengan gambar laporan.
8. Admin mengklik `Approve`. Status berubah menjadi `Approved`.
9. GMV dari laporan tersebut langsung diakumulasikan ke performa Host, dan secara *real-time* (atau *cache invalidate*) memengaruhi metrik *ranking* di halaman Dasbor Utama.

## 9. Metrik Keberhasilan (Success Metrics)
1. **Akurasi OCR**: Sistem berhasil mendeteksi dan membaca metrik kunci di atas **85%** dari total *screenshot* yang sah secara format.
2. **Efisiensi Waktu**: Waktu *admin processing* per laporan turun drastis menjadi rata-rata **< 30 detik** (dibandingkan manual entry > 2 menit).
3. **Adopsi Pengguna**: Tingkat retensi dan kepatuhan host menggunakan Bot untuk setoran laporan mencapai 100%.

## 10. Timeline / Milestone
- **Fase 1: Setup Infrastructure & OCR Core** -> Implementasi Regex *parser*, integrasi API OCR.Space, dan Database Schema PostgreSQL.
- **Fase 2: Telegram Bot Development** -> Alur *chat* dengan host, penerimaan file gambar, dan balasan status OCR.
- **Fase 3: Web Dashboard UI/UX** -> Integrasi *Slicing* React, Layouting MUI, Pembuatan *Chart*, dan koneksi ke API Backend.
- **Fase 4: Testing & UAT (User Acceptance Testing)** -> Uji coba sistem dengan *screenshot* riil dari beragam spesifikasi layar *smartphone*, dan perbaikan *bug*.
- **Fase 5: Go-Live & Monitoring**.

## 11. Risiko & Batasan (Constraints)
- **Risiko Pihak Ketiga**: Modul bot sangat bergantung pada _uptime_ dari layanan `OCR.Space API`. Jika API lambat atau *down*, maka host akan mengalami _error/timeout_ pengiriman.
- **Keterbatasan Format Screenshot**: Ekstraksi OCR berpotensi gagal apabila *screenshot* buram, resolusi terlalu rendah, diberi *watermark* besar, teks terpotong, atau menggunakan format bahasa platform (*interface*) yang tidak diantisipasi oleh algoritma *Regex* sistem. Sebagai cadangan (_fallback_), admin tetap memiliki kemampuan untuk merevisi angka (edit manual) melalui Dasbor Web.

## 12. Pedoman Pengembangan Lanjutan (Do's & Don'ts UI)
> [!IMPORTANT]
> Aturan ketat jika ke depannya ada penambahan fitur/halaman pada antarmuka.

- **DO**: Selalu gunakan komponen MUI bawaan yang terpusat konfigurasinya pada `theme` di `main.tsx`. Hindari *inline styles* atau CSS kustom yang merusak kekonsistenan tema.
- **DO**: Memanfaatkan *custom hook* (seperti `useAuth`, `useDashboard`) untuk menjaga logika pengambilan data tetap terpusat dan bersih di dalam UI komponen.
- **DO**: Tangani status pemuatan (*loading state*) dengan elegan menggunakan `<Skeleton />` komponen agar transisi terasa mulus (tidak patah-patah).
- **DON'T**: Jangan pernah mem-bypass komponen `<Layout>` untuk *protected routes*. Setiap halaman dalam sistem administrasi harus memiliki navigasi Sidebar dan Topbar yang konsisten.
- **DON'T**: Hindari penambahan warna solid yang menyala/mencolok keluar dari palet warna utama yang telah ditetapkan, demi menjaga *vibes* profesionalisme aplikasi.
