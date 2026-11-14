# VGA Class — Implementation Plan

**Versi:** 1.0  
**Tanggal:** 14 November 2026  
**Dokumen sumber kebenaran:** `PRD.md`  
**Tujuan:** membagi pekerjaan vibe coding menjadi tugas kecil yang mudah diuji, tanpa menambah fitur di luar scope.

## 0. Aturan kerja untuk AI coding

1. Baca `PRD.md` **sepenuhnya** sebelum mengubah kode. Jika ada konflik antara draft lama dan PRD v1, ikuti PRD v1.
2. Kerjakan **satu fase** dalam satu iterasi. Sebelum lanjut fase, jelaskan perubahan dan tampilkan hasil build/test.
3. Jangan membuat fitur pembayaran, checkout, booking, login siswa, blog, atau CMS tanpa permintaan baru.
4. Jangan mengarang foto mentor, logo, testimoni, nomor WhatsApp, atau data kalender nyata. Gunakan placeholder/demo berlabel.
5. Semua harga harus berasal dari satu pricing engine + konfigurasi, **bukan angka hardcoded berulang di berbagai komponen**.
6. Semua warna utama dari design tokens; jangan menyebarkan warna heksadesimal di tiap komponen.
7. Jangan menyalin logo/font/gambar/aset berhak cipta MPL ID. Terapkan pola visualnya memakai aset milik VGA Class atau aset dengan hak penggunaan sesuai.
8. Simpan Google OAuth secret/token **hanya di server**; API publik harus menyaring informasi pribadi.
9. Jangan menandai fase selesai sebelum acceptance criteria dan tesnya lulus.
10. Setiap fase harus menjaga situs responsif dan aksesibel, bukan menambal semuanya di akhir.

## 1. Teknologi dan arsitektur yang direkomendasikan

- **Frontend:** Vue 3, TypeScript, Vite, Vue Router, Tailwind CSS.
- **State:** Vue composables yang ringan; tambah state management hanya bila kompleksitas membutuhkannya.
- **Testing:** unit test untuk pricing dan utility kalender, component test untuk interaksi penting, smoke test pada semua route.
- **Backend:** serverless functions atau server ringan read-only untuk Google Calendar API; provider dipilih sesuai hosting final.
- **Konten statis:** file konfigurasi TS/JSON. **Tanpa database/CMS** pada versi awal.
- **SEO:** metadata per route, sitemap, OG, robots, optimasi web.

### Struktur folder awal

```text
vga-class/
  public/
    banners/          # desktop + mobile
    mentors/          # placeholder/asset resmi
    gallery/
  src/
    assets/
    components/
      layout/          # SiteHeader, Footer, SectionHeading
      home/            # HeroCarousel, ProgramPreview, SchedulePreview
      pricing/         # CourseSwitcher, PackageTabs, PriceTable, PackageNotes
      mentors/         # MentorCard
      schedule/        # CalendarToolbar, MentorFilter, WeekGrid, EventCard
      gallery/         # GalleryGrid, ImageLightbox
      shared/          # WhatsAppCTA, FAQAccordion, EmptyState
    views/
      HomePage.vue
      ProgramsPage.vue
      MentorsPage.vue
      SchedulePage.vue
      GalleryPage.vue
    content/
      brand.ts
      programs.ts
      pricing.ts
      mentors.ts
      banners.ts
      gallery.ts
      faq.ts
    services/
      publicSchedule.ts
    utils/
      pricing.ts
      dateTime.ts
      intervals.ts
    styles/
      tokens.css
      global.css
    router/index.ts
  api/                 # server read-only kalender, pada deployment yang sesuai
  tests/
  .env.example        # hanya contoh nama variabel, TIDAK ada nilai rahasia
  README.md
  PRD.md
  IMPLEMENTATION_PLAN.md
```

## Fase 0 — Persiapan repositori dan data

**Tujuan:** fondasi yang bisa dijalankan tanpa layanan eksternal.

- [ ] Buat proyek Vue 3 + TypeScript + Vite + Tailwind + Vue Router.
- [ ] Buat route `/`, `/programs`, `/mentors`, `/schedule`, `/gallery` dan fallback 404.
- [ ] Buat `src/styles/tokens.css` dengan warna marun sementara `#640000`, latar terang, teks netral, serta token hover/border/surface.
- [ ] Siapkan font heading condensed dan font body dengan lisensi penggunaan sesuai (boleh fallback system-font sementara).
- [ ] Siapkan placeholder teks logo, aset banner desktop/mobile contoh, profil mentor, foto galeri, dan jadwal **jelas berlabel Demo**.
- [ ] Buat struktur konten terpisah dari komponen dan `README.md` untuk menjalankan proyek.
- [ ] Simpan nomor WhatsApp resmi sebagai konfigurasi kosong; CTA yang memerlukan nomor harus nonaktif secara jelas hingga diisi.

**Selesai bila:** `dev` berjalan; build TS dan router berhasil; lima route dan 404 dapat dibuka; tidak ada data palsu yang dianggap riil.

## Fase 1 — Global layout dan Design System

- [ ] Header sticky, logo placeholder, navigasi 5 route, active state, hamburger mobile.
- [ ] Footer dengan CTA WA dan informasi yang benar-benar tersedia.
- [ ] Komponen `SectionHeading` uppercase condensed dengan ornamen matematika original.
- [ ] Background terang bertekstur halus, tetap terbaca dan tidak menyalin pola MPL.
- [ ] Komponen dasar tombol, kartu, badge informasional, divider, loading/error/empty state.
- [ ] Aksesibilitas: semantic HTML, focus ring, contrast, keyboard navigation, reduced motion.

**Selesai bila:** header/footer sama di semua route; menu mobile operasional; token warna dapat diganti satu titik; uji ukuran 360, 768, 1440 px.

## Fase 2 — Data harga dan pricing engine

> Fase ini sebaiknya dikerjakan **sebelum tabel UI** supaya nominal tidak terduplikasi atau tidak konsisten.

- [ ] Isi `content/pricing.ts` dengan harga dasar/jam K1 Rp50.000, K2 Rp60.000, diskon online 15%, diskon kelompok 0/20/25/35/45/50/60%, diskon paket 10%, dan batas peserta.
- [ ] Implementasi `roundTo5000HalfUp` berbasis integer/desimal, bukan pembulatan float mentah.
- [ ] Implementasi `getSingleSessionPrice(course, mode, duration, headcount)`.
- [ ] Implementasi `getRoutinePrice(course, mode, duration, headcount)`.
- [ ] Implementasi `getPracticePrice(course, headcount)`.
- [ ] Implementasi `getNonITSPrice(itsPrice)` dan aturan `unavailable` untuk kombinasi yang tidak ditawarkan.
- [ ] Buat tes untuk seluruh harga di tabel pada PRD.md (golden table tests), bukan hanya empat contoh.
- [ ] Pastikan label harga **per mahasiswa** dan per satuan paket/sesi disimpan bersama jenis paketnya.

**Contoh acceptance tests minimum:**

| Kasus | Output yang harus sama |
|---|---|
| Kalkulus 1 privat offline 120 menit satuan | Rp100.000/orang/sesi |
| Kalkulus 2 privat offline 120 menit satuan | Rp120.000/orang/sesi |
| Kalkulus 1 6 peserta offline 120 menit satuan | Rp50.000/orang/sesi |
| Kalkulus 2 6 peserta offline 120 menit satuan | Rp60.000/orang/sesi |
| Kalkulus 1 privat offline 120 menit rutin | Rp720.000/orang/8 sesi |
| Kalkulus 2 privat offline 120 menit rutin | Rp865.000/orang/8 sesi |
| Non-ITS untuk harga ITS Rp75.000 | Rp85.000 (half-up ke Rp5.000) |
| Rutin offline untuk 6 peserta | `unavailable` |
| Satuan offline untuk 7 peserta | `unavailable` |

**Selesai bila:** tabel referensi PRD sama persis dengan hasil generator; kombinasi tidak valid tidak memiliki harga.

## Fase 3 — Homepage

- [ ] Buat full-width hero carousel mengikuti ritme komposisi referensi MPL (tanpa aset MPL).
- [ ] Satu slide mendukung **gambar desktop landscape** dan **mobile portrait**, alt text, title, description, CTA.
- [ ] Autoplay ±5000 ms, transisi ±600 ms, prev/next, swipe, pause saat fokus/interaksi, reduced-motion.
- [ ] Keunggulan, preview program, preview harga **berlabel detail paket**, preview Schedule, mentor, galeri.
- [ ] About dan FAQ sebagai section homepage; testimoni hanya jika data asli tersedia.
- [ ] CTA WhatsApp; footer.

**Selesai bila:** desktop/mobile selaras dengan mockup yang disepakati, semua CTA mengarah benar atau jelas nonaktif saat kontak belum ada.

## Fase 4 — Programs & Pricing

- [ ] Pisahkan bagian **Kalkulus 1** dan **Kalkulus 2** dalam satu halaman.
- [ ] Buat switcher/anchor program dan tabs Paket Satuan / Rutin / Latihan Soal.
- [ ] Tabel untuk 1–7 peserta dengan 4 kolom online/offline × 90/120 menit; latihan soal satu kolom harga sesuai jumlah.
- [ ] Semua nominal diambil dari pricing engine; terapkan batas paket yang tidak tersedia.
- [ ] Catatan per mahasiswa, per sesi/per paket, durasi, fasilitas bersyarat, non-ITS +10%.
- [ ] Pricing table horizontal scroll pada HP; angka tetap dapat dibandingkan; CTA WA tidak dianggap tombol checkout.

**Selesai bila:** setiap angka sama dengan tabel PRD; tidak ada paket latihan soal 90 menit; tabel mobile terbaca.

## Fase 5 — Mentors dan Gallery

- [ ] Buat kartu mentor geometris terinspirasi pola Teams MPL; tanpa logo/esports asset.
- [ ] Foto dan bio dari `content/mentors.ts`; placeholder diberi label.
- [ ] Buat grid foto galeri, optional caption, alt text, dan lightbox dengan keyboard close.
- [ ] Buat empty state rapi jika belum ada foto asli.

**Selesai bila:** jumlah mentor bisa berubah tanpa layout rusak; foto tidak terpotong aneh; izin konten nyata sudah ditandai pada data publikasi.

## Fase 6 — Schedule UI dengan data simulasi

**Tujuan:** validasi pengalaman jadwal tanpa akses Google yang sebenarnya.

- [ ] Buat weekly grid **Senin–Minggu**, jam **07.00–21.00 WIB**, dengan posisi event proporsional.
- [ ] Buat toolbar: minggu sebelumnya, minggu selanjutnya, `Minggu ini`, dan filter `Semua mentor`/per mentor.
- [ ] Buat event demo 90 menit, 120 menit, event mentor yang overlap, blokir/berhalangan, dan lintas batas jam.
- [ ] Slot kosong **di dalam operasional dan setelah data sukses** diberi status `Tersedia untuk diajukan`.
- [ ] Di luar operasional berstatus tidak tersedia (meskipun tidak ditampilkan semua jam di UI).
- [ ] Sesi akhir maksimal pukul 21.00; waktu mulai sesi baru tidak boleh menimbulkan ekspektasi bahwa sesi dapat melampaui batas.
- [ ] Pada mobile: scroll horizontal 7 kolom, label waktu tetap terbaca.
- [ ] Buat status loading/success/empty/stale/error; jika stale/error jangan menandai bebas.
- [ ] CTA ke WhatsApp untuk diskusi; tidak ada event edit atau slot-book button.

**Selesai bila:** filter dan overlap dapat diuji, preview Home dan Schedule tidak bertentangan, minggu lintas bulan/tahun benar.

## Fase 7 — Integrasi Google Calendar read-only

**Dependensi manusia/secrets sebelum dimulai:** akun admin benar-benar memiliki akses kalender mengajar tiap mentor; nama/ID kalender dipilih; project Google Cloud/OAuth disiapkan; hosting/server dapat menyimpan secret.

- [ ] Buat backend/serverless route `GET /api/public-schedule` dengan `weekStart` dan `mentorId` tervalidasi.
- [ ] OAuth Google via akun admin dengan izin **read-only**; simpan client secret, refresh token, dan ID kalender di secret server, tidak di Vite environment yang terekspos ke browser.
- [ ] List event per kalender mentor pada interval minggu lokal `Asia/Jakarta`; dukung recurring instances/pagination.
- [ ] Klasifikasikan sesi vs blokir; keluarkan metadata publik yang disetujui saja.
- [ ] Sanitasi ketat: tidak ada nama murid, attendees, nomor telepon, email, lokasi privat, deskripsi event mentah, dan data OAuth.
- [ ] Gabungkan event lima mentor tanpa menghilangkan overlap; handle canceled events, duplicate event, boundary overlaps, dan sinkronisasi yang tertunda.
- [ ] Cache ±5 menit sebagai titik awal; tampilkan `updatedAt`, `syncStatus` per mentor, serta pesan bila salah satu kalender gagal.
- [ ] Jangan membuat data palsu menjadi live ketika OAuth gagal; status **tidak diketahui** sampai sumber valid.
- [ ] Terapkan rate limit, minimal permissions, dan pencatatan error yang tidak berisi data sensitif.
- [ ] Sambungkan frontend Schedule/preview Home ke public API; mock data tetap tersedia hanya dalam mode demo/development.

**Selesai bila:** data Google Calendar nyata muncul dari lima sumber yang diizinkan; privasi terbukti melalui inspection response; kegagalan koneksi tidak ditafsir sebagai jam kosong; publik tidak dapat memodifikasi event.

## Fase 8 — SEO, QA, security dan deployment

- [ ] SEO teknis tiap route: title/meta, canonical, OG preview, sitemap XML, robots.txt, alt text, structured data akurat jika diperlukan.
- [ ] Tidak ada blog atau hidden keyword stuffing.
- [ ] Audit responsive 360/390/768/1024/1440 px, navigasi keyboard, kontras, reduced motion, lightbox/FAQ, loading states.
- [ ] Audit harga membandingkan seluruh data PRD dengan generator.
- [ ] Audit kalender: awal 07.00, akhir 21.00, 90/120 menit, overlap mentor, filter, recurring, cancelled, stale/error, lintas minggu, timezone WIB.
- [ ] Audit keamanan: token/secret tidak ada di bundle; raw Google events tidak diekspos; data mentor/murid aman.
- [ ] Siapkan domain, hosting, HTTPS, serta halaman 404 dan fallback SPA untuk client-side routing.
- [ ] Pastikan semua konten, foto, logo, testimoni, kontak, serta catatan fasilitas sudah benar dan diizinkan.
- [ ] Build produksi dan smoke test di URL deployment; dokumentasikan cara deploy dan memutar ulang credentials bila perlu.

**Selesai bila:** seluruh checklist PRD lulus; tidak ada data placeholder tersamar sebagai data produksi; website aman ditayangkan publik.

## 2. Work packages dan urutan handoff ke AI

| Paket | Fase | Output utama | Bergantung pada |
|---|---|---|---|
| A | 0–1 | Project setup + shell desain | PRD dan design system |
| B | 2 | Pricing engine dan tests | Konfigurasi harga |
| C | 3–4 | Home + tabel Programs & Pricing | A dan B |
| D | 5 | Mentors + Gallery | A dan data placeholder |
| E | 6 | Weekly Calendar mock | A dan fixture event |
| F | 7 | Integrasi Google read-only | E, izin kalender, secrets |
| G | 8 | QA + deploy | Semua di atas dan konten final |

**Disiplin kerja:** jangan kerjakan F saat A/E belum stabil, dan jangan mengklaim fase G selesai sebelum konten serta izin Google valid.

## 3. Template prompt vibe coding (gunakan satu fase per prompt)

```text
Kamu adalah senior Vue 3 + TypeScript frontend engineer untuk proyek VGA Class.
Baca PRD.md dan IMPLEMENTATION_PLAN.md dahulu dan jadikan keduanya sumber kebenaran.
Kerjakan hanya FASE [NOMOR FASE] yang saya sebutkan.

Batasan:
- Website promosi multi-page, bukan checkout/booking.
- Ikuti pendekatan visual MPL ID hanya sebagai referensi komposisi, bukan menyalin aset/font/logo.
- Gunakan design tokens dan konten konfigurasi.
- Jangan invent nama mentor, nomor WA, testimoni, foto, atau jadwal asli.
- Google secrets harus server-side; fase UI mock belum perlu OAuth.

Output yang saya minta:
1. Ringkasan file yang dibuat/diubah.
2. Penjelasan keputusan teknis penting.
3. Bukti build/test yang relevan.
4. Daftar kekurangan/placeholder tersisa.
5. Konfirmasi acceptance criteria fase terkait.

Jangan melanjutkan ke fase lain sebelum saya menyetujui.
```

## 4. Daftar yang perlu disiapkan pemilik proyek (boleh paralel)

**Sebelum prototipe:** cukup proyek Git, placeholder aset, dan persetujuan warna sementara. Nomor WA/foto asli tidak wajib.

**Sebelum integrasi kalender:** lima kalender khusus mengajar, izin baca untuk admin, OAuth server, aturan event `sesi`/`blokir`.

**Sebelum publikasi:** WhatsApp resmi, banner desktop/mobile, foto & profil mentor, izin foto/testimoni, fasilitas/lokasi yang benar, domain/hosting/SSL, final review harga.

## 5. Keputusan terbaru yang harus mengalahkan dokumen lama

- **07.00–21.00 WIB setiap hari** adalah jam operasional semua mentor. Jam bebas dalam rentang tersebut berarti `tersedia untuk diajukan` **jika dan hanya jika sinkronisasi mentor valid**.
- Kalender tampil **per minggu** dengan 7 kolom hari dan blok jam, bukan kalender bulanan.
- **5 halaman utama**; About dan FAQ di homepage; kontak WhatsApp sebagai CTA, bukan halaman Contact terpisah.
- **Kalkulus 1/2 dengan pricing terpisah**, harga per mahasiswa, model perhitungan terbaru sudah disetujui.
- Branding sementara marun/terang khas pola MPL, warna dan logo dapat diganti tanpa merombak layout.
- Tidak ada booking, pembayaran, CMS, blog, atau login murid pada v1.
