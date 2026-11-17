# VGA Class

Website promosi les Kalkulus 1 dan Kalkulus 2 sesuai `PRD.md` dan `IMPLEMENTATION_PLAN.md`. Vue 3, TypeScript, Vite, Tailwind CSS, Vue Router, serta backend Node.js read-only. Tidak menggunakan database.

## Menjalankan lokal

Butuh Node.js **22.12+** dan npm. Dari direktori proyek:

```powershell
npm ci
npm run dev
```

Buka alamat Local yang dicetak Vite (biasanya `http://127.0.0.1:5173`). Tanpa `.env`, development menggunakan kalender demo berlabel. Semua halaman bisa langsung dicoba tanpa akun Google. WhatsApp resmi sudah aktif ke **0851 4229 6149** (`6285142296149`).

Untuk menyesuaikan konfigurasi:

```powershell
Copy-Item .env.example .env
```

Setelah mengubah variabel `VITE_*`, restart Vite atau build ulang. Jangan masukkan rahasia dalam variabel berawalan `VITE_`.

## Perintah

| Perintah           | Kegunaan                                                                    |
| ------------------ | --------------------------------------------------------------------------- |
| `npm run dev`      | Frontend + API lokal dengan hot reload                                      |
| `npm run dev:api`  | Compile lalu jalankan backend lokal, port 3001                              |
| `npm run build`    | Pemeriksaan TypeScript, build frontend, metadata per route, compile backend |
| `npm start`        | Serve hasil build dan API dari satu origin                                  |
| `npm run preview`  | Preview frontend hasil build beserta API lokal                              |
| `npm test`         | Golden pricing, interval/WIB, API, sanitasi, dan komponen                   |
| `npm run test:e2e` | Browser smoke, interaksi, responsive, WCAG dasar; jalankan build dahulu     |
| `npm run assets`   | Membuat ulang **aset demo** PNG, WebP dan SVG dari ilustrasi orisinal       |

E2E menggunakan Chrome lokal jika ada di lokasi standar Windows. Pada mesin lain, jalankan `npx playwright install chromium` sekali. Playwright menyalakan dan mematikan server uji di port 4173 dan 3001; kosongkan kedua port sebelum menjalankan tes.

Cukup jalankan `npm run dev` untuk frontend dan API kalender pada satu origin. Vite melayani `/api/public-schedule` langsung dengan konfigurasi server dari `.env`, sehingga tidak membutuhkan proses port 3001 terpisah. `npm run preview` menyertakan API yang sama. `dev:api` tetap tersedia untuk menjalankan backend mandiri. Mode live memakai `VITE_SCHEDULE_DEMO=false`.

## Halaman dan konten

Lima halaman: `/`, `/programs`, `/mentors`, `/schedule`, `/gallery`, dengan fallback 404. About dan FAQ berada di beranda. Konten dipisahkan dari komponen:

| Lokasi                    | Isi                                                          |
| ------------------------- | ------------------------------------------------------------ |
| `src/content/brand.ts`    | Identitas, kontak, mode demo                                 |
| `src/content/programs.ts` | Deskripsi dan topik program                                  |
| `src/content/pricing.ts`  | Parameter harga, kapasitas, fasilitas paket                  |
| `src/utils/pricing.ts`    | Satu sumber rumus; pembulatan rasional integer dengan BigInt |
| `src/content/mentors.ts`  | Profil, warna penanda, izin publikasi                        |
| `src/content/banners.ts`  | Banner desktop/mobile, CTA, urutan, status                   |
| `src/content/gallery.ts`  | Visual, kategori, caption, izin                              |
| `src/content/faq.ts`      | FAQ                                                          |
| `src/styles/tokens.css`   | Semua token warna UI, font dan ukuran dasar                  |
| `api/`                    | OAuth, agregasi kalender, sanitasi, cache dan server         |

Logo resmi berasal dari `public/logo/VGA_CLASS.svg` dan `public/logo/VGA Class.png`. Header/footer menggunakan turunan WebP ringan, dengan fallback PNG; favicon memakai monogram vektor dari SVG tersebut. Jalankan `npm run assets:brand` untuk membuat ulang logo web, favicon SVG, ICO 16/32/48 px, PNG 16/32/48 px, dan apple-touch icon 180 px. Sumber logo yang diberikan pemilik tetap ada di direktori yang sama. `npm run assets` juga mempertahankan generator favicon resmi ini.

Harga yang tidak ditawarkan dikembalikan sebagai `null` dan ditampilkan `—`. Tes membaca tabel referensi langsung dari PRD dan membandingkan **seluruh 122 sel** dengan engine; angka tidak disalin menjadi rumus khusus komponen.

Pilihan paket ditampilkan sebagai tiga kartu tombol berlabel **Lihat rincian**. Paket aktif berwarna marun, memiliki tanda centang dan label **Sedang ditampilkan**; klik kartu lain langsung mengganti harga dan fasilitas di bawahnya. Pada mobile, kartu disusun vertikal agar semua pilihan terlihat dan mudah disentuh. Navigasi keyboard panah/Home/End tetap tersedia.

Profil dan gambar asli hanya ditampilkan jika `publicationApproved: true`; placeholder memiliki `demo: true` serta label yang terlihat. Set `demo: false` setelah konten asli disetujui. Nomor WhatsApp menggunakan format internasional Indonesia, `62` diikuti nomor tanpa `+`, spasi, atau nol awal. Semua CTA memakai konfigurasi yang sama.

## Tipografi dan profil mentor

Referensi [MPL Vue](https://github.com/Riswan-Nopiyar/mpl-id-mobile-legends/blob/main/src/assets/css/style.css) memakai Origin Super Condensed dan Astoria. Karena lisensi webfont komersialnya belum tersedia, pilihan pengguna adalah padanan terbuka **League Gothic Variable + Lato**, di-host lokal dengan SIL OFL. Heading memakai karakter condensed yang lebih dekat referensi. Teks utama 16 px, navigasi desktop 16 px, label 13–15 px, angka harga 16 px, dan teks event kalender 13–14 px. Kolom/waktu kalender ikut diperbesar agar teks tidak diperkecil kembali. Petunjuk opsional jika kelak tersedia webfont resmi ada di `src/assets/fonts/licensed/README.md`.

Kartu mentor pada beranda dan `/mentors` bisa diklik atau dibuka dengan keyboard. Dialog menampilkan nama lengkap, perkenalan, pendidikan, kompetensi, pengalaman, dan CV, lalu tautan ke jadwal mentor tersebut. Escape menutup dialog dan mengembalikan fokus ke kartu.

Isi data publik yang telah disetujui pada `src/content/mentors.ts`: `fullName`, `introduction`, `education`, `competencies`, `experience`, `cvUrl`. Untuk mengaktifkan CV, set profil `demo: false`, `publicationApproved: true`, dan `cvPublicationApproved: true`. Gunakan URL **HTTPS tanpa credentials** atau PDF lokal `/cv/nama-file.pdf` (letakkan di `public/cv/`). Selama belum ada CV resmi, tombol jelas nonaktif; tidak ada tautan CV contoh yang disamarkan sebagai CV asli.

Seluruh konten frontend dapat masuk bundle browser. Flag persetujuan mengatur tampilan, **bukan akses kontrol**. Jangan simpan biodata privat, nomor pribadi, atau dokumen yang belum boleh dipublikasikan dalam konfigurasi frontend/public.

## Google Calendar

Daftar mentor diperoleh dari jendela data 31 hari, sementara blok terisi dan rentang yang dapat diajukan dihitung hanya untuk minggu pilihan. Mentor tanpa sesi tetap tampil dan tersedia 07.00?21.00 WIB pada hari kosong, selama sinkronisasi berhasil.

Website mengikuti JSON Apps Script asli: **success, timezone, count, schedules, warnings**, dengan event **mentor, title, start, end, allDay**. Tidak ada syarat versi, ID/status mentor tambahan atau echo rentang dari script. Nama kalender menjadi label/filter mentor; website membuat ID stabil dan timestamp pembaruan sendiri. Uji langsung pada 17 November 2026 berhasil memasukkan **20 jadwal** ke API website, dengan nama mentor dari API dan status sinkronisasi sukses.

Konfigurasi yang sudah diisi tetap dipakai: GOOGLE_APPS_SCRIPT_URL dan API_SECRET server-only pada .env, dengan VITE_SCHEDULE_DEMO=false. Nilai secret sama dengan Script property Google. **Script Google tidak perlu diubah atau di-deploy ulang demi website.** POST memakai token/start/end; token hanya dikirim pada permintaan awal dan tidak diteruskan ke redirect. Warning/baris rusak tetap menampilkan sesi valid dengan penanda sebagian, sedangkan kegagalan total memakai stale/error. Panduan: [docs/GOOGLE_APPS_SCRIPT_SETUP.md](docs/GOOGLE_APPS_SCRIPT_SETUP.md).

Jika memilih OAuth langsung sebagai alternatif, kosongkan `GOOGLE_APPS_SCRIPT_URL`. Panduan Google Cloud tersedia di [docs/GOOGLE_CALENDAR_SETUP.md](docs/GOOGLE_CALENDAR_SETUP.md):

1. Siapkan kalender khusus mengajar masing-masing mentor dan bagikan akses baca kepada akun admin.
2. Aktifkan Calendar API pada project Google Cloud, konfigurasi OAuth consent/client, lalu peroleh refresh token dengan scope **`https://www.googleapis.com/auth/calendar.events.readonly`** dan akses offline. OAuth awal dijalankan oleh pemilik/admin di luar website publik. Tidak ada login atau endpoint OAuth publik pada aplikasi.
3. Isi secret server `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` dan `GOOGLE_MENTOR_CALENDARS` melalui `.env` lokal yang diabaikan Git, atau secret manager hosting.
4. Mapping berupa objek JSON dari ID publik mentor ke ID kalender privat, misalnya bentuk `{"mentor-1":"<calendar-id>"}`. Jangan mengisinya dalam file konten frontend. Kalender duplikat tidak diam-diam ditetapkan ke dua mentor.
5. Set `VITE_SCHEDULE_DEMO=false`, build ulang, dan jalankan backend.

Endpoint:

```text
GET /api/public-schedule?weekStart=YYYY-MM-DD&mentorId=all
GET /api/public-schedule?weekStart=YYYY-MM-DD&mentorId=mentor-1
```

Tanggal dinormalisasi ke Senin WIB; horizon ±12 minggu; mentor dan parameter divalidasi. Apps Script memakai `CalendarApp.getEvents` untuk instance berulang; OAuth memakai `singleEvents=true` dan pagination. Event transparent tidak memblokir; event all-day tetap memblokir. Waktu asli dipertahankan, lalu UI memotong visual ke 07.00–21.00 WIB. Batas akhir interval eksklusif.

Apps Script hanya mengirim interval sibuk dengan label **Sedang tidak tersedia**. Pada jalur OAuth, event tanpa metadata publik juga memakai label tersebut. Untuk metadata sesi aman pada **jalur OAuth**, admin dapat menambahkan extended properties **shared** berikut menggunakan alat internal yang diizinkan:

```json
{
  "vgaPublic": "true",
  "vgaKind": "session",
  "vgaCourse": "kalkulus-1",
  "vgaMode": "offline"
}
```

Whitelist mata kuliah: `kalkulus-1`/`kalkulus-2`; mode: `online`/`offline`. Website ini tidak menyediakan alat pengubah event. Menulis metadata pada judul/deskripsi biasa tidak mempublikasikannya.

API hanya mengeluarkan field publik yang dipilih. Judul asli, deskripsi, nama murid, kontak, attendees, lokasi, Google Meet, ID event/kalender, dan OAuth tidak dikirim ke pengunjung. Provider error tidak dicetak mentah.

Cache browser dibagi antara beranda dan halaman jadwal, termasuk saat tab dimuat ulang. Backend juga menggabungkan request bersamaan dan memakai hasil yang sama untuk pengunjung lain. Mode awal `CALENDAR_CACHE_MODE=ttl` berlaku 5 menit. Mode `changes` membatalkan cache saat mentor menambah, mengubah atau menghapus acara melalui trigger Apps Script, dengan batas cadangan 6 jam. Halaman terbuka menerima pemberitahuan SSE. Panduan pemasangan: [docs/CALENDAR_CACHE.md](docs/CALENDAR_CACHE.md). Mode notifikasi membutuhkan backend HTTPS publik dan pemasangan trigger; belum diaktifkan pada akun Google.

Jika refresh gagal, data cache bertanda `stale`; tanpa cache bertanda `error`; sumber belum terhubung `unconfigured`. Semuanya menghasilkan **status ketersediaan belum diketahui**. Mentor yang sukses tetap berfungsi. Tidak ada fallback otomatis dari API gagal menjadi demo. Jadwal kosong hanya dianggap bebas ketika sumber dan masa cache valid. Tombol Perbarui jadwal melewati cache browser, tetapi tetap memakai cache backend untuk menghemat panggilan Google.

Rate limit bawaan 60 request/menit/IP, timeout Google, cache terbatas, dan security headers tersedia pada server Node. Untuk deployment multi-instance, terapkan rate limit tambahan pada reverse proxy. `TRUST_PROXY=true` hanya digunakan jika proxy tepercaya selalu menimpa `X-Forwarded-For`.

## Build produksi dan hosting

```powershell
npm ci
npm run build
npm start
```

Server Node menyajikan `dist/` dan API dari satu origin. Gunakan HTTPS melalui reverse proxy; isi `HOST=0.0.0.0` jika dibutuhkan provider. `PORT` default 3001. Deploy `dist/`, `dist-server/`, `package.json`, dan lockfile; jalankan dengan Node yang sesuai. Backend hasil compile tidak membutuhkan paket npm runtime tambahan. Static-only hosting memerlukan adapter/proxy terpisah untuk `/api`; proxy tidak boleh me-rewrite API ke HTML.

Build menghasilkan HTML dengan metadata berbeda untuk kelima route, `404.html`, robots dan sitemap. Untuk static hosting, arahkan route yang valid ke HTML masing-masing dan route lainnya ke `404.html` dengan status 404. Server Node sudah menangani ini. Konten halaman dirender Vue di browser; metadata route tersedia pada HTML awal.

Prototipe default **noindex** dan sitemap kosong. Setelah konten resmi, persetujuan, dan koneksi Google siap, isi domain HTTPS di `VITE_SITE_URL`, set `VITE_SCHEDULE_DEMO=false`, `VITE_SITE_INDEXABLE=true`, `SITE_INDEXABLE=true`, lalu build ulang. Perubahan secret server memerlukan restart. Rotasi credentials dilakukan dengan mencabut token lama di akun Google, menerbitkan refresh token baru, memperbarui secret hosting, dan restart; tidak melalui frontend.

## Batas kesiapan rilis

Logo dan WhatsApp resmi sudah terpasang. Identitas/foto mentor, banner dan dokumentasi resmi, izin publikasi, lokasi/fasilitas, credentials kalender, domain dan hosting masih diperlukan. Tidak ada testimoni rekaan. Situs belum dipublikasikan. Rincian verifikasi dan status fase ada di `IMPLEMENTATION_STATUS.md`.

Font League Gothic dan Lato di-host sendiri dengan SIL Open Font License; salinan lisensi ada di `public/licenses/`. SVG ilustrasi dan sumber PNG demo dibuat orisinal melalui `scripts/create-assets.mjs`; tidak memakai aset MPL ID. Ikon menggunakan Lucide (ISC).

## Pemeriksaan keamanan

Build menjalankan `npm run security:check` secara otomatis; perintah tersebut juga dapat dijalankan sendiri. Gate memeriksa file sensitif/backup/source map pada public dan build, pola credential, SVG aktif, serta nama file di Git index. Nilai credential tidak dicetak. Ini pemeriksaan terbatas; bukan bukti seluruh riwayat Git atau akun provider bebas kebocoran.

Server Node menerapkan CSP untuk script/style lokal, pengecualian **atribut style** posisi kalender, anti-framing, batas panjang URL/query, error aman, whitelist static path dan pemeriksaan realpath. Tautan CV dan origin SEO menggunakan validator HTTPS yang sama. HSTS belum diaktifkan karena hostname HTTPS final belum diverifikasi.

CI dan Dependabot disiapkan di `.github/`; workflow tidak melakukan deployment atau memakai secret produksi. Actions dipin ke SHA dan token hanya read-only. Required checks, ruleset, 2FA, alerts, WAF dan akses preview memerlukan konfigurasi pemilik. Lihat `SECURITY_HARDENING.md` dan hasil audit `SECURITY_AUDIT_REPORT.md`.

Dependency dev formatter memiliki override terbatas: `js-beautify` memakai glob 14.0.2 dan editorconfig memakai minimatch 11.0.1, untuk menutup advisori yang belum dipenuhi rentang dependency lamanya. `@vue/test-utils` dipin 2.4.6 dan sharp 0.35.5. Kompatibilitas formatter CLI, render SVG/PNG, tes unit/komponen dan browser telah diperiksa; review ulang override ketika upstream telah memperbarui rentang versinya.

Referensi teknis: [Calendar events.list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list), [Calendar OAuth scopes](https://developers.google.com/workspace/calendar/api/auth), [Vite](https://vite.dev/guide/). Referensi komposisi: [repo MPL ID](https://github.com/Riswan-Nopiyar/mpl-id-mobile-legends).
