# Checklist pengujian sebelum digunakan

Tandai tiap skenario setelah diuji pada lingkungan deployment yang sebenarnya.

- [ ] Login benar dan salah.
- [ ] Petugas non-admin tidak dapat mengakses endpoint admin.
- [ ] Setelah login halaman pertama adalah scanner.
- [ ] Izin kamera dapat diberikan melalui HTTPS.
- [ ] QR berisi ID langsung terbaca.
- [ ] QR berisi URL dan parameter ID terbaca.
- [ ] Input manual dan scanner USB/Bluetooth berfungsi.
- [ ] ID terdaftar dan aktif menghasilkan check-in.
- [ ] ID tidak terdaftar ditolak.
- [ ] ID kosong ditolak.
- [ ] Scan kedua menunjukkan waktu hadir pertama, tanpa menambah total.
- [ ] Dua perangkat memproses peserta yang sama; constraint unik mencegah kehadiran ganda.
- [ ] Impor 50 baris CSV berhasil.
- [ ] ID duplikat saat impor dilewati.
- [ ] Foto kosong memakai gambar pengganti.
- [ ] Unggah logo dan simpan pengaturan.
- [ ] Ekspor peserta dan laporan CSV.
- [ ] Siapkan data offline di perangkat yang akan digunakan.
- [ ] Putuskan internet, verifikasi peserta yang sudah ada di snapshot, dan periksa antrean.
- [ ] Sambungkan kembali dan sinkronkan antrean; pastikan tidak ada data terhapus sebelum konfirmasi server.
- [ ] Muat ulang browser dan periksa ketersediaan antrean IndexedDB.
- [ ] Uji layout laptop dan HP.
- [ ] Uji backup dan pemulihan database.
- [ ] Pastikan teks antarmuka berbahasa Indonesia.

Catatan: checklist ini belum otomatis dijalankan. Tandai lulus hanya setelah pengujian dilakukan.
