# Panduan mengunggah proyek ke GitHub dan menerbitkan aplikasi

## A. Unggah source code ke GitHub

1. Masuk ke https://github.com dan pilih **New repository**.
2. Beri nama, misalnya `loket-kegiatan`, pilih Private jika source memuat konfigurasi internal, lalu buat repository.
3. Ekstrak ZIP proyek di komputer.
4. Buka repository GitHub, pilih **Add file → Upload files**.
5. Seret isi folder proyek (bukan folder ZIP) ke halaman unggah.
6. Pastikan `.env` tidak ikut diunggah. Yang boleh diunggah adalah `.env.example`.
7. Klik **Commit changes**.

## B. Penting: GitHub Pages bukan server backend

GitHub Pages tidak menjalankan Node.js, Express, sesi login, unggah file ke server, atau PostgreSQL. Karena itu, gunakan GitHub untuk menyimpan kode, lalu hubungkan repository ke hosting Node.js dan sediakan PostgreSQL terkelola.

## C. Deploy ke host Node.js

1. Buat database PostgreSQL pada layanan yang Anda pilih.
2. Hubungkan repository GitHub ke layanan hosting Node.js.
3. Set build command: `npm install && npm run build`.
4. Set start command: `npm start`.
5. Tambahkan environment variables di dashboard hosting:
   - `DATABASE_URL`: URL PostgreSQL.
   - `SESSION_SECRET`: string acak yang panjang dan sulit ditebak.
   - `ADMIN_USERNAME`: username administrator.
   - `ADMIN_PASSWORD`: password administrator awal yang kuat.
   - `NODE_ENV`: `production`.
   - `PORT`: isi hanya jika diwajibkan oleh host.
6. Jalankan `npm run seed` satu kali setelah environment database tersedia. Gunakan console/shell atau release command host. Periksa bahwa database yang dituju benar.
7. Aktifkan HTTPS dan buka URL aplikasi.
8. Uji semua fungsi penting sebelum acara.

## D. Jika hanya ingin demonstrasi frontend statis

Anda bisa membangun frontend dengan `npm run build`, tetapi halaman login dan fitur data memerlukan API. Mengunggah folder `dist` saja ke GitHub Pages tidak membuat backend aktif. Jangan masukkan rahasia database ke kode frontend.

## E. Sebelum acara

- Ganti password awal.
- Ganti nama, tanggal, lokasi dan logo kegiatan.
- Impor data peserta yang benar dan hapus/isolasi data demo.
- Siapkan data offline di setiap perangkat.
- Uji scan QR, barcode yang didukung, input manual, duplikasi, ekspor laporan, koneksi terputus, dan sinkronisasi.
- Pastikan koneksi HTTPS, kamera, baterai, pencahayaan, serta cadangan daftar peserta tersedia.
