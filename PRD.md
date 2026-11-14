# VGA Class — Product Requirements Document (PRD)

**Versi:** 1.0 — spesifikasi produk untuk vibe coding  
**Tanggal revisi:** 14 November 2026  
**Status:** Baseline fungsional disepakati; implementasi dapat dimulai dengan data placeholder. Informasi dan izin untuk publikasi final masih diperlukan.  
**Dokumen pendamping:** `IMPLEMENTATION_PLAN.md` dan dokumen referensi desain sebelumnya.

> **Instruksi utama untuk AI coding:** Bangun website promosi VGA Class sesuai spesifikasi ini. Jangan menambahkan checkout, pembayaran, sistem booking online, login murid, CMS, atau blog. Jika data publikasi belum tersedia, gunakan placeholder yang jelas dan tidak menampilkan identitas maupun klaim palsu.

## 1. Ringkasan eksekutif

VGA Class adalah website promosi dan informasi layanan les **Kalkulus 1 dan Kalkulus 2**, terutama bagi **mahasiswa ITS**. Layanan dapat berupa les privat atau kelompok, online atau offline, dengan sesi 90/120 menit. Permintaan dari mahasiswa kampus lain tetap diterima dengan harga acuan ITS +10% dan dibicarakan melalui WhatsApp.

Website memiliki **5 halaman utama**: Home, Programs & Pricing, Mentors, Schedule, dan Gallery. **About**, **FAQ**, testimoni jika tersedia, dan kontak WhatsApp menjadi bagian dari homepage atau CTA lintas halaman — **bukan halaman baru**.

Salah satu fitur inti adalah tampilan **jadwal mingguan seperti Google Calendar** yang menggabungkan jadwal mengajar **5 mentor** dari kalender Google masing-masing (dipantau melalui akun admin). Pengunjung boleh memfilter mentor dan melihat jam sesi/ketersediaan; tidak bisa membuat, mengunci, atau menyetujui booking. Jadwal final dan penempatan mentor diatur melalui WhatsApp dan proses internal admin/mentor.

## 2. Tujuan dan batasan

### 2.1 Tujuan

1. Membangun kepercayaan calon mahasiswa/orang tua melalui identitas, profil mentor, galeri, FAQ, dan testimoni nyata (jika ada).
2. Menampilkan deskripsi dan **harga Kalkulus 1 serta Kalkulus 2 secara terpisah dan transparan**.
3. Memberikan gambaran jadwal sesi mentor selama minggu terpilih.
4. Mendorong calon mahasiswa menghubungi admin melalui WhatsApp.
5. Menyiapkan sistem konten yang bisa dikembangkan untuk mata kuliah lain tanpa merombak halaman.

### 2.2 Di luar ruang lingkup (non-goals)

- Checkout, pembayaran, transfer, invoice, dan transaksi keuangan.
- Booking, persetujuan jadwal, atau pemilihan mentor secara otomatis oleh pengunjung.
- Login/akun siswa, LMS, kelas virtual, atau penyimpanan materi pembelajaran.
- Dashboard/CMS untuk mengedit konten pada v1; perubahan awal lewat file konfigurasi/kode.
- Blog atau halaman artikel. **SEO tetap dilakukan secara teknis dan melalui konten halaman yang relevan**, bukan teks tersembunyi untuk mesin pencari.
- Halaman About atau Contact mandiri (keduanya cukup section/CTA yang relevan).

## 3. Target pengguna dan alur utama

**Utama:** mahasiswa ITS yang mencari les Kalkulus 1/2.  
**Sekunder:** orang tua/wali yang ingin bertanya dan calon mahasiswa dari universitas lain.

**Alur pengguna inti:**

1. Masuk ke Home dan melihat banner/program.
2. Membuka Programs & Pricing, memilih Kalkulus 1/2, jenis paket, dan membandingkan tarif per mahasiswa.
3. Opsional: membuka Mentors, Gallery, atau Schedule.
4. Melihat jadwal minggu terpilih dan filter mentor (tanpa mengunci slot).
5. Menghubungi admin melalui WhatsApp untuk diskusi jadwal, lokasi, durasi, kelompok, dan penempatan mentor.
6. **Konfirmasi final berlangsung di luar website**; admin/mentor memperbarui Google Calendar agar jadwal yang sudah disetujui muncul di website.

## 4. Sitemap dan navigasi

```text
/                Home
  ├─ Hero carousel (banner desktop/mobile)
  ├─ Keunggulan VGA Class
  ├─ Preview Kalkulus 1 dan Kalkulus 2
  ├─ Preview harga
  ├─ Preview Schedule
  ├─ Highlight Mentors
  ├─ Preview Gallery
  ├─ Testimoni [hanya jika sudah ada izin]
  ├─ About
  ├─ FAQ
  └─ CTA WhatsApp / Contact section
/programs        Programs & Pricing
/mentors         Mentors
/schedule        Schedule
/gallery         Gallery
```

Navbar sticky dengan logo placeholder `VGA CLASS`, menu lima halaman, dan CTA WhatsApp. Tidak ada `/about`, `/contact`, `/booking`, atau `/checkout` pada v1. Navbar mobile berupa hamburger yang menutup setelah navigasi; tautan aktif jelas.

## 5. Spesifikasi setiap halaman

### 5.1 Home (`/`)

- Navbar → full-width hero carousel → keunggulan → dua program unggulan → cuplikan harga → cuplikan jadwal → mentor → galeri → testimoni opsional → About → FAQ → CTA WA → footer.
- Hero awal dapat memiliki lebih dari satu slide; setiap slide berisi `imageDesktop`, `imageMobile`, `alt`, judul, deskripsi, label CTA, tujuan CTA, urutan, dan status aktif.
- **Dua gambar untuk setiap banner**: PNG landscape desktop dan PNG portrait mobile. Dapat dioptimasi ke format web modern saat deployment tanpa kehilangan sumber asli.
- CTA dapat menuju `/programs`, `/schedule`, atau WA; hindari CTA palsu jika nomor WA belum terisi.
- Harga preview hanya menampilkan contoh berlabel jelas: Kalkulus 1 Rp100.000 dan Kalkulus 2 Rp120.000 untuk **privat, offline, 120 menit, paket satuan, per mahasiswa ITS**.
- Preview Schedule ringkas dan diarahkan ke halaman Schedule lengkap; bila data belum tersambung, tandai sebagai demo/placeholder.
- About berupa informasi brand; FAQ berupa accordion; testimoni hanya dipublikasikan jika nyata dan telah mendapat izin.

### 5.2 Programs & Pricing (`/programs`)

- Satu halaman dengan dua bagian jelas: **Kalkulus 1** dan **Kalkulus 2**. Gunakan tab atau anchor agar pengunjung mudah berpindah.
- Setiap program memiliki **Paket Satuan**, **Paket Rutin**, dan **Paket Latihan Soal Mandiri** dengan catatan fasilitas masing-masing.
- Matriks harga membandingkan jumlah mahasiswa, online/offline, dan 90/120 menit. Latihan soal adalah paket offline khusus 4 × 120 menit, sehingga tidak mengikuti pilihan 90 menit.
- Harga adalah **per mahasiswa**. Paket satuan = per orang per sesi, paket rutin = per orang untuk 8 sesi, latihan soal = per orang untuk satu paket 4 sesi.
- Tanda `—` menandakan kombinasi tidak ditawarkan; jangan membuat angka secara otomatis pada kombinasi tidak tersedia.
- Ketentuan mahasiswa non-ITS: **harga ITS +10%**; cukup tampilkan catatan, bukan pendeteksian kampus otomatis.
- Tabel responsif: horizontal scroll di mobile; angka tabular; label kolom jelas; jangan mengandalkan warna untuk menyampaikan harga.
- CTA WhatsApp di bawah setiap bagian program. Tidak ada tombol beli/bayar.

### 5.3 Mentors (`/mentors`)

- Tampilkan sekitar lima mentor dari data konfigurasi; jumlah bisa bertambah di kemudian hari.
- Kartu geometris responsif terinspirasi pola Teams pada repo MPL ID, tetapi bukan menyalin aset tim.
- Field: `id`, `nama`, `foto`, `bio`, `kompetensi` (Kalkulus 1/2), `pengalaman` jika sudah disetujui, `warnaPenanda`, `aktif`.
- Foto, nama, dan klaim akademik yang belum diberikan harus placeholder jelas. Jangan mengarang prestasi atau riwayat pendidikan.

### 5.4 Schedule (`/schedule`)

**Pengantar di atas kalender (copy awal):**

> Cek jadwal mengajar mentor VGA Class pada minggu pilihanmu. Gunakan filter untuk melihat mentor tertentu. Jam kosong selama operasional merupakan waktu yang dapat diajukan, tetapi jadwal dan penempatan mentor baru resmi setelah konfirmasi admin melalui WhatsApp.

**Tampilan:**

- **Weekly view**, Senin–Minggu sebagai 7 kolom; sumbu jam vertikal; tampilkan **07.00 sampai 21.00 WIB** setiap hari, bukan tampilan bulanan.
- Blok sesi berada tepat pada posisi waktu mulai–selesai; durasi 90/120 menit harus tampak proporsional.
- Dua atau lebih mentor dapat mengajar secara bersamaan; tampilkan blok paralel/overlap tanpa menumpuk hingga tidak terbaca.
- Navigasi minggu sebelumnya/berikutnya; tombol `Minggu ini`; filter `Semua mentor` dan nama mentor.
- Warna penanda konsisten per mentor, ditambah label teks; tanggal dan jam memakai zona `Asia/Jakarta` (WIB).
- Blok event publik boleh berisi `Mentor`, `07.00–09.00`, status, `Kalkulus 1/2` dan mode online/offline **hanya bila datanya aman dan sudah disetujui**.
- **Jangan tampilkan nama murid, nomor telepon, email, alamat pribadi, atau deskripsi Google Calendar mentah.**
- Tampilkan `Terakhir diperbarui` dan keadaan loading/error. CTA WhatsApp adalah satu-satunya alur pengajuan les.
- Pada mobile, grid mingguan dapat digeser horizontal; jangan memperkecil jam dan kartu sampai tak terbaca.

**Aturan operasional dan ketersediaan (menggantikan draft lama):**

1. Semua mentor memiliki jam operasional **setiap hari 07.00–21.00 WIB**.
2. Di luar rentang tersebut: **Tidak tersedia**.
3. Di dalam rentang tersebut dan tidak ada event mengajar maupun blokir pada kalender mentor: **Tersedia untuk diajukan**.
4. Bila terdapat event sesi mengajar atau blokir/berhalangan pada kalender mentor: **Terisi/Tidak tersedia** selama interval event terkait.
5. Untuk sesi baru, **waktu selesai maksimal 21.00**. Les 90 menit paling lambat mulai 19.30; les 120 menit paling lambat mulai 19.00.
6. Semua status tersedia hanya merupakan **indikasi berdasarkan jadwal tersinkron**; admin tetap memegang persetujuan akhir.
7. Bila sinkronisasi gagal atau data kedaluwarsa, **jangan tampilkan jam kosong seolah sudah terkonfirmasi tersedia**. Tampilkan `Data belum dapat diperbarui`/`Status belum diketahui` sampai data valid.
8. Event pada pukul 06.30–08.00 memblokir rentang yang beririsan dengan jam operasional (07.00–08.00); event lintas batas dipotong secara visual ke 07.00–21.00 tanpa mengubah waktu asli.
9. Interval akhir menggunakan batas eksklusif: event 09.00–11.00 tidak memblokir slot yang dimulai tepat pukul 11.00.
10. Jika salah satu mentor belum terhubung atau datanya tidak valid, status mentor tersebut `Tidak diketahui`, bukan otomatis tersedia; mentor lain yang berhasil tersinkron tetap dapat ditampilkan.

### 5.5 Gallery (`/gallery`)

- Grid foto dokumentasi nyata dengan opsi lightbox; bisa memiliki kategori (misalnya kegiatan kelas / fasilitas) bila konten cukup.
- Grid adaptif desktop/mobile, lazy-load gambar, alt text, caption opsional.
- Semua foto yang mengidentifikasi orang harus memiliki izin publikasi. Placeholder visual diberi label demo dan bukan dokumentasi resmi.

## 6. Aturan harga resmi baseline v1

> **Sumber aturan:** model perhitungan baru yang disetujui pengguna, bukan penyalinan angka mentah dari workbook referensi. Model berikut menggantikan penggunaan langsung tabel lama untuk Kalkulus 1 dan Kalkulus 2.

### 6.1 Parameter dan urutan pembulatan

| Parameter | Nilai |
|---|---|
| Privat offline Kalkulus 1 | Rp50.000/jam |
| Privat offline Kalkulus 2 | Rp60.000/jam |
| Durasi reguler | 90 atau 120 menit |
| Pengurangan tarif online | 15% dari tarif privat offline |
| Diskon kelompok (2/3/4/5/6/7 orang) | 20% / 25% / 35% / 45% / 50% / 60% |
| Paket rutin | 8 sesi, diskon tambahan 10% atas total delapan sesi |
| Paket latihan soal | 4 × 2 jam offline; harga dasar = tarif/jam × 8 jam, lalu diskon kelompok |
| Non-ITS | Tambahan 10% dari harga ITS yang berlaku, lalu dibulatkan |
| Pembulatan | Kelipatan Rp5.000 terdekat, **half-up** pada titik tengah |

**Urutan hitung yang wajib digunakan oleh semua halaman:**

1. `privat_offline = round5(tarif_per_jam × durasi_menit / 60)`.
2. `privat_online = round5(tarif_per_jam × durasi_menit / 60 × 0,85)`.
3. `harga_satuan_per_orang = round5(privat_per_mode × (1 − diskon_kelompok))`.
4. `harga_rutin_per_orang = round5(harga_satuan_per_orang × 8 × 0,90)`.
5. `harga_latihan_per_orang = round5(tarif_per_jam × 8 × (1 − diskon_kelompok))` (offline, maks. 5 peserta).
6. `harga_non_ITS = round5(harga_ITS × 1,10)`.

**Contoh pembulatan:** Rp75.000 × 1,10 = Rp82.500 → **Rp85.000**, bukan Rp80.000. Gunakan aritmetika integer/desimal untuk mencegah ketidakstabilan floating point.

**Kapasitas produk:** Paket Rutin offline 1–5, Paket Satuan offline 1–6, semua paket reguler online 1–7, Latihan Soal Mandiri 1–5 (offline saja). Kombinasi lain **tidak tersedia**.

### 6.2 Matriks harga yang harus dihasilkan sistem

#### Kalkulus 1 — Paket Satuan (per mahasiswa **per pertemuan**)

| Jumlah mahasiswa | Offline 90 menit | Offline 120 menit | Online 90 menit | Online 120 menit |
|---:|---:|---:|---:|---:|
| 1 | Rp75.000 | Rp100.000 | Rp65.000 | Rp85.000 |
| 2 | Rp60.000 | Rp80.000 | Rp50.000 | Rp70.000 |
| 3 | Rp55.000 | Rp75.000 | Rp50.000 | Rp65.000 |
| 4 | Rp50.000 | Rp65.000 | Rp40.000 | Rp55.000 |
| 5 | Rp40.000 | Rp55.000 | Rp35.000 | Rp45.000 |
| 6 | Rp40.000 | Rp50.000 | Rp35.000 | Rp45.000 |
| 7 | — | — | Rp25.000 | Rp35.000 |

#### Kalkulus 1 — Paket Rutin (per mahasiswa untuk **8 pertemuan**)

| Jumlah mahasiswa | Offline 90 menit | Offline 120 menit | Online 90 menit | Online 120 menit |
|---:|---:|---:|---:|---:|
| 1 | Rp540.000 | Rp720.000 | Rp470.000 | Rp610.000 |
| 2 | Rp430.000 | Rp575.000 | Rp360.000 | Rp505.000 |
| 3 | Rp395.000 | Rp540.000 | Rp360.000 | Rp470.000 |
| 4 | Rp360.000 | Rp470.000 | Rp290.000 | Rp395.000 |
| 5 | Rp290.000 | Rp395.000 | Rp250.000 | Rp325.000 |
| 6 | — | — | Rp250.000 | Rp325.000 |
| 7 | — | — | Rp180.000 | Rp250.000 |

#### Kalkulus 2 — Paket Satuan (per mahasiswa **per pertemuan**)

| Jumlah mahasiswa | Offline 90 menit | Offline 120 menit | Online 90 menit | Online 120 menit |
|---:|---:|---:|---:|---:|
| 1 | Rp90.000 | Rp120.000 | Rp75.000 | Rp100.000 |
| 2 | Rp70.000 | Rp95.000 | Rp60.000 | Rp80.000 |
| 3 | Rp70.000 | Rp90.000 | Rp55.000 | Rp75.000 |
| 4 | Rp60.000 | Rp80.000 | Rp50.000 | Rp65.000 |
| 5 | Rp50.000 | Rp65.000 | Rp40.000 | Rp55.000 |
| 6 | Rp45.000 | Rp60.000 | Rp40.000 | Rp50.000 |
| 7 | — | — | Rp30.000 | Rp40.000 |

#### Kalkulus 2 — Paket Rutin (per mahasiswa untuk **8 pertemuan**)

| Jumlah mahasiswa | Offline 90 menit | Offline 120 menit | Online 90 menit | Online 120 menit |
|---:|---:|---:|---:|---:|
| 1 | Rp650.000 | Rp865.000 | Rp540.000 | Rp720.000 |
| 2 | Rp505.000 | Rp685.000 | Rp430.000 | Rp575.000 |
| 3 | Rp505.000 | Rp650.000 | Rp395.000 | Rp540.000 |
| 4 | Rp430.000 | Rp575.000 | Rp360.000 | Rp470.000 |
| 5 | Rp360.000 | Rp470.000 | Rp290.000 | Rp395.000 |
| 6 | — | — | Rp290.000 | Rp360.000 |
| 7 | — | — | Rp215.000 | Rp290.000 |

#### Paket Latihan Soal Mandiri (offline, 4 × 120 menit)

| Jumlah mahasiswa | Kalkulus 1 / orang / paket | Kalkulus 2 / orang / paket |
|---:|---:|---:|
| 1 | Rp400.000 | Rp480.000 |
| 2 | Rp320.000 | Rp385.000 |
| 3 | Rp300.000 | Rp360.000 |
| 4 | Rp260.000 | Rp310.000 |
| 5 | Rp220.000 | Rp265.000 |

**Catatan koreksi dari tabel usulan sebelumnya:** beberapa angka Paket Rutin pada chat sebelumnya berbeda karena pembulatan pernah dilakukan pada tahap yang berbeda. Sebagai contoh, untuk **2 peserta Kalkulus 1 online 90 menit** angka usulan terdahulu Rp375.000/peserta/paket, sementara **tabel v1 menjadi Rp360.000** setelah harga satuan Rp50.000 dibulatkan lebih dulu, lalu dihitung `× 8 × 90%`. Untuk **2 peserta Kalkulus 2 offline 90 menit**, usulan sebelumnya Rp520.000, tabel v1 Rp505.000. Angka v1 adalah hasil pembulatan konsisten sesuai rumus yang disepakati. Jika pemilik usaha ingin mempertahankan angka lama sebagai harga khusus, itu harus menjadi override eksplisit dan tidak boleh dicampur dengan hasil rumus otomatis. Validasi nominal final dilakukan sebelum publikasi.

**Penjelasan harga kelompok:** bila 6 mahasiswa mengikuti **Kalkulus 2 paket satuan offline 120 menit**, harga Rp60.000 per mahasiswa, sehingga total kelompok Rp360.000 untuk satu pertemuan. Harga per orang ditampilkan sebagai angka utama.

### 6.3 Catatan paket dan fasilitas

**Paket Rutin (8 pertemuan):** penjelasan materi, latihan soal, konsultasi/tanya jawab di luar jam pertemuan, file latihan dan pembahasan, try out persiapan ujian (permintaan minimal H−3), serta waktu fleksibel.

**Paket Satuan:** penjelasan materi atau latihan sesuai kebutuhan, jumlah pertemuan fleksibel, konsultasi/tanya jawab sampai 24 jam sesudah pertemuan, serta akses file latihan/pembahasan.

**Latihan Soal Mandiri:** pendampingan dan pengarahan pengerjaan soal, koreksi kesalahan konsep, **4 sesi offline × 120 menit**, waktu fleksibel.

**Ketentuan yang harus divalidasi sebelum dipromosikan sebagai jaminan:** file referensi menyebut rekaman pertemuan online/offline serta fasilitas tempat sewa (AC, Wi-Fi, es teh, refill air untuk minimal 3 mahasiswa). Karena lokasi offline ditentukan bersama tutor dan peserta, website harus menggunakan copy bersyarat seperti `fasilitas bergantung pada lokasi yang disepakati`; perekaman dilakukan hanya jika disetujui peserta. Jangan menjanjikan semua fasilitas berlaku di semua lokasi.

## 7. Integrasi Google Calendar

### 7.1 Sumber dan pemilik data

- Akun Google admin adalah pusat akses/agregasi; kalender mentor tetap milik masing-masing.
- Setiap mentor idealnya memiliki kalender khusus **Jadwal Mengajar**, dibagikan kepada akun admin dengan izin baca yang sesuai.
- Mentor yang mengisi manual atau memakai sistem booking lain tetap dapat mengelola cara mereka sendiri; **jadwal yang mau dipublikasikan wajib berakhir sebagai event/blokir di kalender mentor yang terpantau**. Sinkronisasi eksternal tidak otomatis ada tanpa integrasi khusus.
- Website membaca kalender melalui **backend/serverless read-only** dengan OAuth akun admin dan izin yang sah.
- Tidak ada endpoint publik untuk membuat, mengubah, menyetujui, atau menghapus event.

### 7.2 Privasi, keamanan, dan model data publik

**Di server:** rahasiakan OAuth client secret, refresh token, dan mapping ID kalender mentor. Jangan disimpan di client bundle atau Git.

**Di API publik:** kirim hanya field yang sudah disanitasi seperti `mentorId`, `mentorDisplayName`, `start`, `end`, `publicLabel`, `course`/`mode` yang sudah di-whitelist, `availabilityStatus`, `updatedAt`, dan `syncStatus`.

- Hilangkan nama murid, kontak, deskripsi raw, lokasi pribadi, attendees, link Google Meet privat, ID event/kalender asli yang tidak diperlukan.
- Event yang tidak punya metadata aman cukup ditulis `Sesi` atau `Sedang tidak tersedia`.
- Event dibatalkan tidak boleh muncul sebagai busy; event berulang harus diproses per kejadian; hindari duplikasi sumber.
- Data per mentor yang gagal sinkron tidak boleh diwariskan sebagai `free`; tampilkan status error/stale.
- Default cache backend dapat dimulai dari **±5 menit**, lalu disesuaikan; tampilkan timestamp sinkronisasi terakhir.

**Kontrak API awal yang direkomendasikan:**

```text
GET /api/public-schedule?weekStart=YYYY-MM-DD&mentorId=all
GET /api/public-schedule?weekStart=YYYY-MM-DD&mentorId=mentor-1
```

`weekStart` dinormalisasi ke Senin dalam `Asia/Jakarta`; parameter dan cakupan minggu divalidasi. Backend memanggil Google Calendar per kalender mentor, melakukan sanitasi, dan mengembalikan daftar event serta status sync. Frontend menghitung visual blok dan rentang `tersedia untuk diajukan` berdasarkan batas 07.00–21.00 dikurangi interval busy yang valid, tetapi **hanya jika sumber data mentor sukses/sah**.

### 7.3 Kontrak UX kalender

- Placeholder data harus menyatakan `Data contoh`, tidak disamarkan sebagai jadwal nyata.
- Status loading: skeleton; empty tetapi sinkron sehat: seluruh jam operasional dapat diajukan; error/stale: status tidak diketahui dan CTA WhatsApp.
- Preview kalender homepage dapat memakai endpoint/data mock yang sama dengan halaman Schedule agar konsisten.
- Tanpa persetujuan admin, memilih jam tidak membuat reservasi.

## 8. Design System — adaptasi MPL ID

**Referensi:** `https://github.com/Riswan-Nopiyar/mpl-id-mobile-legends`. Adopsi **pola komposisi**, tidak menyalin aset/logo/materi/font berlisensi tanpa izin.

- Header sticky, **marun sementara** `#640000` dengan teks putih dan navigasi uppercase.
- Halaman cenderung **terang bertekstur ringan**, bukan dark-dashboard.
- Full-width hero carousel (sekitar 5 detik per slide, transisi ±600 ms, dukungan reduced motion).
- Heading section condensed besar/uppercase dengan ornamen ringan buatan sendiri bertema matematika.
- Kartu mentor geometris responsif (terinspirasi pola Teams).
- Pricing dengan tabel kontras tinggi seperti pendekatan Standings; Gallery dapat memakai pola carousel grid/portrait.
- About dan FAQ berada pada homepage, bukan route baru.
- Logo placeholder dan seluruh warna dari satu file design tokens, misalnya `src/styles/tokens.css`.
- Font pengganti harus tersedia dengan lisensi yang sesuai; **jangan salin file font proprietary dari repo referensi**.
- Breakpoint kerja: mobile <640px, tablet 640–1023px, desktop ≥1024px. Banner portrait mobile, landscape desktop; pricing dan weekly calendar scroll horizontal pada mobile.

## 9. Struktur konten, konfigurasi, dan teknis

**Stack yang direkomendasikan untuk v1:** Vue 3 + Vite + TypeScript + Tailwind CSS + Vue Router (selaras pendekatan repo referensi). Gunakan backend/serverless terbatas untuk API kalender publik; tidak perlu database transaksional untuk versi awal.

**Data konfigurasi di luar komponen UI:**

```text
src/content/brand.ts      # brand name, logo placeholder, token refs, contacts
src/content/programs.ts   # Kalkulus 1/2; siap ditambah program baru
src/content/pricing.ts    # parameter tarif, diskon, kapasitas
src/content/mentors.ts    # profil dan warna penanda publik
src/content/banners.ts    # desktop/mobile images, CTA, order, enabled
src/content/gallery.ts    # foto/caption/alt/izin
src/content/faq.ts        # daftar tanya-jawab
src/services/schedule.ts  # fetch API publik + mock fallback berlabel demo
src/styles/tokens.css     # warna global
api/                      # serverless/backend Google Calendar read-only
```

**Kontak:** nomor WhatsApp resmi VGA Class belum ditentukan. Jangan pakai nomor dari workbook pembanding tanpa konfirmasi. Semua CTA harus mengambil URL dari konfigurasi yang sama; bila nomor tidak diisi, gunakan placeholder non-aktif dan label `Kontak segera tersedia` pada prototipe.

**SEO teknis:** title/meta per halaman, canonical, sitemap XML, Open Graph, robots.txt, alt text, performa gambar, semantik heading, dan structured data bila akurat; tidak ada artikel/blog atau teks keyword tersembunyi.

## 10. Persyaratan nonfungsional dan pengujian

- Responsif pada lebar minimal 360px, 390px, 768px, 1024px, 1440px; tidak boleh terjadi overflow horizontal tak sengaja selain area tabel/kalender yang memang scrollable.
- Fokus keyboard terlihat, input dan tombol memiliki label, menu/FAQ bisa dikendalikan keyboard, contrast cukup, reduced-motion dihormati.
- Pricing: uji semua sel dari rumus tunggal dan pembulatan half-up, contoh harga non-ITS, batas kapasitas, subtotal kelompok bila ditampilkan.
- Jadwal: overlap mentor, filter, sesi 90/120 menit, awal 07.00/akhir 21.00, minggu lintas bulan/tahun, event berulang, event batal, timeout, token dicabut, kalender kosong sukses, kalender gagal, sanitasi data raw.
- Lakukan optimasi hero image untuk menghindari loading berat; jangan preload semua banner.
- Tidak ada pembayaran, booking, login murid, CMS, atau data pribadi yang bocor.
- Deploy hanya setelah konfigurasi rahasia Google dan data publikasi disetujui.

## 11. Kriteria penerimaan (definition of done)

- [ ] Semua **5 route** berjalan dan navbar/footer konsisten.
- [ ] Home mengikuti komposisi MPL ID yang sudah disepakati, memakai aset legal dan placeholder berlabel bila data belum ada.
- [ ] Harga Kalkulus 1 dan Kalkulus 2 dipisah, memuat seluruh tabel sesuai aturan dan menunjukkan harga **per mahasiswa**.
- [ ] Rutin 8 sesi, satuan per sesi, latihan soal 4×120 menit, dan +10% non-ITS jelas.
- [ ] Kalender mingguan 07.00–21.00 WIB, 7 hari, filter mentor, blok overlap, status dan timestamp sync.
- [ ] Kalender gagal/stale tidak menunjukkan status tersedia tanpa dasar.
- [ ] Tidak ada reservasi maupun transaksi via web; semua pengajuan diarahkan ke WhatsApp.
- [ ] Informasi sensitif Google Calendar tidak keluar dari backend.
- [ ] FAQ/About ada di homepage; tidak ada route About/Contact mandiri.
- [ ] UI mobile dapat digunakan dengan baik, termasuk tabel harga dan kalender.
- [ ] Metadata SEO teknis, aksesibilitas dasar, dan pengujian lulus.

## 12. Data yang masih perlu dipersiapkan sebelum rilis publik

- [ ] Nomor WhatsApp resmi VGA Class dan jam respons (jika ingin ditampilkan).
- [ ] Logo final (atau persetujuan eksplisit menggunakan placeholder).
- [ ] Palet warna final (boleh tetap token marun sementara untuk prototipe).
- [ ] Nama, foto, biodata, serta persetujuan publikasi lima mentor.
- [ ] Aset banner desktop PNG landscape dan mobile PNG portrait untuk setiap slide.
- [ ] Foto galeri, testimoni dan izin tampil.
- [ ] Detail lokasi/fasilitas yang valid untuk ditampilkan.
- [ ] Google Calendar khusus mengajar per mentor, akses akun admin, OAuth server, kategori event sesi/blokir yang konsisten.
- [ ] Domain, hosting, dan cara menyimpan secret server.
- [ ] Pemeriksaan nominal harga satu putaran sebelum dipublikasikan (rumus baseline sudah disetujui).

## 13. Catatan keputusan dan prioritas sumber

1. **Keputusan terbaru pengguna lebih tinggi prioritasnya** daripada draft lama. Contoh: jam kosong antara 07.00–21.00 kini boleh dianggap tersedia untuk diajukan bila sinkron valid; sebelumnya draft melarang inferensi tersebut.
2. Website final adalah **multi-page dengan 5 route**; About/FAQ/Contact berupa section dan CTA, bukan route tersendiri.
3. Harga baru berdasarkan tarif per jam dan diskon yang disetujui **menggantikan tabel mentah dari Excel** untuk Kalkulus 1/2; fasilitas dan deskripsi produk dari file lama tetap perlu validasi.
4. Desain mengadaptasi pola MPL ID, tetapi tidak menyalin logo dan aset tanpa izin.
5. Belum tersedia kalender atau nomor WA riil dalam spesifikasi; jangan mengklaim data dummy sebagai data produksi.

## 14. Referensi dan dokumen terkait

- Referensi visual/source: https://github.com/Riswan-Nopiyar/mpl-id-mobile-legends
- Calendar API Event List: https://developers.google.com/workspace/calendar/api/v3/reference/events/list
- Calendar API FreeBusy: https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
- Calendar OAuth: https://developers.google.com/workspace/calendar/api/auth
- Pendamping implementasi: `IMPLEMENTATION_PLAN.md`
