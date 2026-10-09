# Loket Kegiatan — Registrasi, Verifikasi ID Card, dan Absensi

Aplikasi web berbahasa Indonesia untuk loket konferensi, seminar, festival, lokakarya, dan forum. Frontend React + TypeScript + Vite, backend Node.js + Express, PostgreSQL, Drizzle schema, IndexedDB untuk antrean offline, dan PWA.

## Fitur yang tersedia

- Login petugas dengan kata sandi yang di-hash menggunakan bcrypt.
- Halaman awal setelah login langsung berupa scanner QR Code kamera.
- Verifikasi ID peserta, profil, pencegahan check-in ganda, input manual, dan dukungan scanner USB/Bluetooth sebagai keyboard.
- Data peserta: pencarian, tambah, edit, hapus dengan konfirmasi, impor CSV dan ekspor CSV.
- Dashboard, laporan kehadiran, ekspor CSV.
- Pengaturan logo, judul, warna, pesan, dan parameter ID pada URL QR.
- Unggah logo/foto ke folder `uploads` di server.
- IndexedDB untuk snapshot peserta dan antrean check-in saat offline.
- PWA shell cache untuk aset dasar.
- 50 peserta fiktif dalam `contoh-peserta-50.csv` dan disiapkan melalui perintah seed.

## Kebutuhan

- Node.js 20 atau lebih baru
- PostgreSQL 14 atau lebih baru (lokal atau layanan terkelola)
- HTTPS untuk akses kamera pada domain deployment (localhost diperbolehkan untuk pengembangan)

## Menjalankan secara lokal

1. Pasang Node.js dan siapkan database PostgreSQL bernama `loket_konferensi`.
2. Salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL` dan `SESSION_SECRET` yang kuat.
3. Sesuaikan `ADMIN_USERNAME` dan `ADMIN_PASSWORD` pada `.env` sebelum menjalankan seed.
4. Pasang dependensi:

   ```bash
   npm install
   ```

5. Buat tabel dan akun administrator beserta data demonstrasi:

   ```bash
   npm run seed
   ```

   `seed` membuat tabel yang diperlukan jika belum ada, kegiatan contoh, satu akun admin, dan 50 peserta demo. Data demo bukan data nyata. Akun awal berasal dari `.env`.

6. Jalankan frontend dan backend dalam dua proses:

   ```bash
   npm run dev
   ```

   Buka `http://localhost:5173`. API berjalan di port 3000. Untuk mode produksi, jalankan `npm run build`, lalu `npm start`; Express akan menyajikan folder `dist` jika folder tersebut tersedia.

## Login awal

Nilai default di `.env.example` adalah `admin` / `GantiPassword123!`. Ubah kredensial di `.env` sebelum menjalankan seed. Jika akun admin sudah dibuat, mengganti nilai `.env` saja tidak mengganti hash password yang tersimpan. Ganti password dengan prosedur admin yang aman sebelum pemakaian nyata; fitur pengelolaan akun/password mandiri belum dibuat di antarmuka ini.

## Impor CSV

Gunakan file `contoh-peserta-50.csv`. Header harus:
- `participant_code`
- `full_name`
- `institution`
- `photo_url`
- `registration_status`

ID peserta wajib unik. Baris duplikat dilewati, bukan menimpa data lama. File contoh hanya data demonstrasi.

## Deployment GitHub

**GitHub Pages hanya menyajikan file statis dan tidak dapat menjalankan Express atau PostgreSQL.** Untuk aplikasi penuh, simpan kode di GitHub lalu deploy backend ke layanan Node.js (misalnya Render, Railway, atau VPS), dan database ke PostgreSQL terkelola. Bisa juga gunakan satu host Node.js untuk backend dan frontend hasil build. Instruksi umum:

1. Buat repository GitHub baru.
2. Ekstrak ZIP ini ke folder proyek, kemudian unggah semua file kecuali `.env`, `node_modules`, `dist`, dan isi `uploads`.
3. Pada layanan hosting Node.js, hubungkan repository.
4. Atur build command `npm install && npm run build` dan start command `npm start`.
5. Tambahkan environment variables `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `NODE_ENV=production`, `PORT` melalui panel hosting (bukan ke GitHub).
6. Pastikan `npm run seed` dijalankan satu kali terhadap database produksi yang benar sebelum aplikasi dipakai. Jika host mendukung release/pre-deploy command, gunakan itu; jangan jalankan seed otomatis setiap start karena seed memasukkan data demo.
7. Konfigurasikan domain HTTPS. Browser memerlukan HTTPS untuk kamera di luar localhost.
8. Uji login, scan, impor/ekspor, unggah gambar, dan laporan pada domain deployment.

## Database dan migrasi

- Definisi Drizzle ada di `server/schema.ts`.
- SQL referensi ada di `server/schema.sql`.
- Konfigurasi Drizzle ada di `drizzle.config.ts`.
- Untuk proyek yang sudah punya database dan `DATABASE_URL` valid, `npm run db:push` menyelaraskan skema Drizzle dengan database. Cadangkan database sebelum menjalankan perubahan skema.

## Penyimpanan gambar

File gambar disimpan di `UPLOAD_DIR` (default `uploads/`) dan disajikan lewat `/uploads/...`. Ini sesuai untuk pengembangan atau server dengan disk persisten. Banyak platform serverless memiliki disk sementara; untuk produksi gunakan object storage (S3-compatible, Cloudinary, Supabase Storage, atau penyedia setara), ubah handler `/api/upload`, dan tetapkan kebijakan akses privat jika foto peserta bersifat sensitif. Jangan unggah foto nyata ke repository publik.

## Mode offline — batasan yang perlu diketahui

- Buka aplikasi saat online terlebih dahulu, lalu pilih **Siapkan data offline** pada dashboard atau pengaturan di setiap perangkat loket.
- Data peserta dan antrean disimpan di IndexedDB browser lokal perangkat itu.
- Kamera bisa tetap berfungsi jika browser dan perangkat mendukungnya, tetapi scanner kamera memerlukan aset aplikasi yang sudah dimuat dan izin kamera.
- Antrean lokal tidak otomatis tersedia di perangkat lain. Setelah online, tekan **Sinkronkan Data Offline**.
- Jangan menganggap peserta tidak terdaftar jika data lokal tidak tersedia. Aplikasi menampilkan “Peserta Belum Dapat Diverifikasi”.
- Foto offline belum diunduh dan di-cache secara menyeluruh; pastikan foto penting dapat diakses atau perluas mekanisme cache sesuai kebijakan privasi.
- Sebelum acara, uji mode offline pada perangkat yang benar-benar akan digunakan.

## Keamanan dan kesiapan produksi

Kerangka ini menerapkan hash password, sesi HTTP-only, pemeriksaan peran pada endpoint administrasi, validasi dasar, batas ukuran unggahan, dan constraint unik kehadiran. Sebelum penggunaan produksi, tambahkan:
- pengelolaan akun dan perubahan kata sandi admin di antarmuka;
- session store PostgreSQL (default `express-session` MemoryStore tidak cocok untuk produksi);
- CSRF protection dan pembatasan laju login;
- pemeriksaan file gambar yang lebih ketat dan object storage;
- backup database, retensi log, audit, serta kebijakan privasi;
- validasi dan uji beban pada deployment target;
- konfigurasi `secure` cookie, CORS, dan reverse proxy sesuai domain nyata.

## Catatan implementasi

Scanner menggunakan `html5-qrcode`. QR code URL bisa mengekstrak ID dari parameter `id` secara default; parameter dapat diubah pada Pengaturan. `transaction_id` disertakan pada antrean lokal; unique constraint database memastikan satu check-in per peserta per kegiatan. Kode ini merupakan basis aplikasi yang dapat dikembangkan lebih lanjut, bukan sertifikasi bahwa seluruh skenario produksi telah lulus pengujian.
