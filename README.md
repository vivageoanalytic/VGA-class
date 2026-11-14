# VGA Class

Website promosi les Kalkulus 1 dan Kalkulus 2 sesuai `PRD.md` dan `IMPLEMENTATION_PLAN.md`. Vue 3, TypeScript, Vite, Tailwind CSS, Vue Router, serta backend Node.js read-only. Tidak menggunakan database.

## Menjalankan lokal

Butuh Node.js **22.12+** dan npm. Dari direktori proyek:

```powershell
npm ci
npm run dev
```

Buka alamat Local yang dicetak Vite (biasanya `http://127.0.0.1:5173`). Tanpa `.env`, development menggunakan kalender demo berlabel. Semua halaman bisa langsung dicoba tanpa akun Google. CTA WhatsApp nonaktif sampai nomor resmi diisi.

Untuk menyesuaikan konfigurasi:

```powershell
Copy-Item .env.example .env
```

Setelah mengubah variabel `VITE_*`, restart Vite atau build ulang. Jangan masukkan rahasia dalam variabel berawalan `VITE_`.

## Perintah

| Perintah           | Kegunaan                                                                    |
| ------------------ | --------------------------------------------------------------------------- |
| `npm run dev`      | Frontend dengan hot reload                                                  |
| `npm run dev:api`  | Compile lalu jalankan backend lokal, port 3001                              |
| `npm run build`    | Pemeriksaan TypeScript, build frontend, metadata per route, compile backend |
| `npm start`        | Serve hasil build dan API dari satu origin                                  |
| `npm run preview`  | Preview frontend hasil build; mode live membutuhkan backend terpisah        |
| `npm test`         | Golden pricing, interval/WIB, API, sanitasi, dan komponen                   |
| `npm run test:e2e` | Browser smoke, interaksi, responsive, WCAG dasar; jalankan build dahulu     |
| `npm run assets`   | Membuat ulang **aset demo** PNG, WebP dan SVG dari ilustrasi orisinal       |

E2E menggunakan Chrome lokal jika ada di lokasi standar Windows. Pada mesin lain, jalankan `npx playwright install chromium` sekali. Playwright menyalakan dan mematikan server uji di port 4173 dan 3001; kosongkan kedua port sebelum menjalankan tes.

`dev:api` mengompilasi source sekali ketika dimulai, lalu me-restart server saat output berubah. Setelah mengedit source backend, jalankan `npx tsc -p tsconfig.server.json` dari terminal lain atau restart `dev:api`. Untuk mode live lokal, isi `.env`, set `VITE_SCHEDULE_DEMO=false`, jalankan `npm run dev:api` dan `npm run dev` pada dua terminal. Vite mem-proxy `/api` ke backend.

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

Harga yang tidak ditawarkan dikembalikan sebagai `null` dan ditampilkan `—`. Tes membaca tabel referensi langsung dari PRD dan membandingkan **seluruh 122 sel** dengan engine; angka tidak disalin menjadi rumus khusus komponen.

Profil dan gambar asli hanya ditampilkan jika `publicationApproved: true`; placeholder memiliki `demo: true` serta label yang terlihat. Set `demo: false` setelah konten asli disetujui. Nomor WhatsApp menggunakan format internasional Indonesia, `62` diikuti nomor tanpa `+`, spasi, atau nol awal. Semua CTA memakai konfigurasi yang sama.

## Google Calendar

Adapter sudah diimplementasikan dan diuji dengan provider simulasi. **Koneksi lima kalender asli belum diverifikasi** karena akses dan credentials belum diberikan.

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

Tanggal dinormalisasi ke Senin WIB; horizon ±12 minggu; mentor dan parameter divalidasi. Kalender dibaca dengan `singleEvents=true` untuk kejadian berulang dan pagination. Event canceled/transparent tidak memblokir; event all-day tetap memblokir. Waktu asli dipertahankan, lalu UI memotong visual ke 07.00–21.00 WIB. Batas akhir interval eksklusif.

Event tanpa metadata publik menjadi **Sedang tidak tersedia**. Untuk mengizinkan metadata sesi aman, admin dapat menambahkan extended properties **shared** berikut menggunakan alat internal yang diizinkan:

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

Cache per mentor/minggu berlaku 5 menit; request bersamaan digabung. Jika refresh gagal, data cache bertanda `stale`; tanpa cache bertanda `error`; sumber belum terhubung `unconfigured`. Semuanya menghasilkan **status ketersediaan belum diketahui**. Mentor yang sukses tetap berfungsi. Tidak ada fallback otomatis dari API gagal menjadi demo. Jadwal kosong hanya dianggap bebas ketika sumber dan timestamp valid.

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

WhatsApp resmi, identitas/foto mentor, banner dan dokumentasi resmi, izin publikasi, lokasi/fasilitas, credentials kalender, domain dan hosting masih diperlukan. Tidak ada testimoni rekaan. Situs belum dipublikasikan. Rincian verifikasi dan status fase ada di `IMPLEMENTATION_STATUS.md`.

Font Barlow Condensed dan DM Sans di-host sendiri dengan SIL Open Font License; salinan lisensi ada di `public/licenses/`. SVG ilustrasi dan sumber PNG demo dibuat orisinal melalui `scripts/create-assets.mjs`; tidak memakai aset MPL ID. Ikon menggunakan Lucide (ISC).

Referensi teknis: [Calendar events.list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list), [Calendar OAuth scopes](https://developers.google.com/workspace/calendar/api/auth), [Vite](https://vite.dev/guide/). Referensi komposisi: [repo MPL ID](https://github.com/Riswan-Nopiyar/mpl-id-mobile-legends).
