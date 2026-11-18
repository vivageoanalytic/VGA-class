# Menghubungkan kalender ke Cloudflare Pages

Website sudah memakai domain produksi **https://vga-class.pages.dev**. Backend Cloudflare sekarang tersedia di source: Pages Functions meneruskan tiga endpoint kalender ke satu SQLite Durable Object bernama `vga-calendar-v1`, pada Worker privat `vga-class-calendar`. Semua lokasi/pengunjung berbagi cache dan revisi yang sama. JSON serta deployment Apps Script tetap dipakai.

Pages membutuhkan Worker terpisah untuk mendefinisikan kelas Durable Object. Karena itu, **pasang Worker dahulu, kemudian push perubahan Pages**. [Binding Durable Objects pada Pages](https://developers.cloudflare.com/pages/functions/bindings/#durable-objects).

## 1. Siapkan Worker kalender dan secret

Di terminal VS Code, dari root proyek:

```powershell
npm ci
npx wrangler login
npm run setup:calendar
```

Login menggunakan **akun Cloudflare yang sama dengan project Pages VGA Class**. Jika ada pilihan beberapa akun, pilih pemilik project tersebut. `setup:calendar` melakukan dua tindakan pada akun itu: memasang Worker beserta namespace cache, lalu mengunggah tiga secret server dari `.env`:

| Secret Worker             | Sumber/nilai                                              |
| ------------------------- | --------------------------------------------------------- |
| `GOOGLE_APPS_SCRIPT_URL`  | Deployment `/exec` Google yang sudah dipakai pada `.env`  |
| `API_SECRET`              | Sama dengan `API_SECRET` Script properties Google         |
| `CALENDAR_WEBHOOK_SECRET` | Sama dengan `VGA_WEBHOOK_SECRET` Script properties Google |

Nilai secret dikirim melalui stdin Wrangler, tanpa argumen shell, file sementara atau pencetakan nilai. **File `.env` tetap lokal dan tidak di-commit.** Script penyiapan hanya berjalan ketika pemilik menjalankan perintah tersebut; build/CI tidak menjalankannya.

Worker ini tidak menyediakan URL publik langsung. Akses berjalan melalui binding internal Pages. Namespace memakai migrasi SQLite yang tersedia pada Workers Free; pemakaian tetap mengikuti kuota akun. [Dokumentasi Durable Objects](https://developers.cloudflare.com/durable-objects/platform/pricing/).

## 2. Push perubahan Pages

Setelah penyiapan Worker berhasil, tinjau perubahan di VS Code, lalu:

```powershell
git add .
git commit -m "Add Cloudflare calendar backend and durable cache"
git push origin main
```

Cloudflare Pages akan membangun commit baru. Pertahankan **Build command `npm run build`**, **Build output directory `dist`**, dan production branch `main`. File root `wrangler.jsonc` memasang binding `CALENDAR_COORDINATOR` ke Worker kalender. Nama project dalam file tersebut mengikuti `vga-class` yang sudah dipakai. Build juga menghasilkan `_headers` untuk static assets; respons API memasang header sendiri.

Pada environment **build Pages**, pastikan:

```dotenv
VITE_SCHEDULE_DEMO=false
VITE_SITE_URL=https://vga-class.pages.dev
VITE_SITE_INDEXABLE=false
```

Secret Google/webhook berada pada **Worker `vga-class-calendar`**, bukan variabel `VITE_*` atau bundle frontend. Root `wrangler.jsonc` menjadi sumber konfigurasi binding Pages. Jika build sebelumnya gagal karena namespace belum tersedia, setelah Worker terpasang jalankan ulang deployment commit backend terbaru.

## 3. Periksa API publik

Buka halaman jadwal, lalu endpoint dengan Senin minggu yang ingin ditampilkan, misalnya:

```text
https://vga-class.pages.dev/api/public-schedule?weekStart=2026-11-16&mentorId=all
```

Hasil yang diharapkan adalah **JSON**, `demo: false`, `source: "apps-script"`, dan `syncStatus: "success"`, dengan nama mentor dari Apps Script. Minggu dibatasi 12 minggu sebelum/sesudah minggu saat ini; ubah tanggal contoh bila sudah lewat horizon. Error 503 "Backend kalender Cloudflare belum terhubung" berarti binding/Worker belum tersedia. `syncStatus: "unconfigured"` berarti secret Google belum terpasang pada Worker. `stale`/`error` berarti pengambilan sumber gagal; waktu kosong tidak dinyatakan tersedia.

Membuka `/api/calendar-changed` di browser menggunakan GET, sehingga respons yang benar adalah **405** dengan `Allow: POST`. Ini hanya pemeriksaan keberadaan route, bukan bukti autentikasi callback berhasil.

Mode awal tetap **TTL 5 menit**, sehingga jadwal tetap diperbarui walaupun trigger Google belum dipasang. Cache publik, katalog mentor dan deduplikasi notifikasi disimpan di SQLite. Membuka halaman/berpindah lokasi tidak perlu membaca Google lagi selama lease berlaku. Restart/isolate eviction mempertahankan cache. Minggu sangat besar di atas 1 MB tetap disimpan di memori; setelah eviction minggu tersebut perlu dibaca ulang.

## 4. Pasang trigger Google

Script properties yang diperlukan:

```text
VGA_WEBHOOK_URL = https://vga-class.pages.dev/api/calendar-changed
VGA_WEBHOOK_SECRET = nilai yang sama dengan CALENDAR_WEBHOOK_SECRET Worker
```

Tambahkan [CalendarNotifications.gs](../integrations/google-apps-script/CalendarNotifications.gs) di samping `Code.gs` yang sudah berjalan. Pertahankan kode API dan manifest/Advanced Calendar service yang dipakai untuk nama mentor. Tambahkan scope trigger/URLFetch jika manifest membatasi scope. Langkah lengkap ada di [CALENDAR_CACHE.md](CALENDAR_CACHE.md).

Jalankan **`installVgaCalendarNotifications`** dari editor Apps Script. Periksa hasil `testDelivered: true`. Akun pemasang harus dapat membaca semua kalender mentor. Callback mengirim UUID perubahan saja; tidak mengirim data siswa atau ID kalender. Retry 5 menit hanya mengirim ulang perubahan yang masih tertunda.

## 5. Aktifkan pembaruan berdasarkan perubahan

Setelah API sukses dan callback uji berhasil, pada `integrations/cloudflare/wrangler.jsonc` ubah:

```json
"CALENDAR_CACHE_MODE": "changes"
```

Lalu jalankan:

```powershell
npm run deploy:calendar
```

Perubahan konfigurasi membuang cache lama yang tidak sesuai dan pembacaan berikutnya memakai mode baru. Buka halaman jadwal, uji tambah/ubah/hapus acara uji, lalu tunggu trigger Google berjalan. SSE memberi tahu halaman terbuka untuk mengambil cache baru. Notifikasi sendiri hanya membatalkan cache; pembaca berikutnya melakukan satu pembacaan sumber yang dibagi antar-pengunjung.

Mode perubahan memiliki fallback 6 jam bila notifikasi terlewat. Mode TTL dapat dipulihkan dengan mengubah nilai kembali ke `ttl` lalu deploy Worker. Jangan mengaktifkan `changes` sebelum pengujian callback berhasil.

## Verifikasi lokal dan batas

`npm test` memeriksa kontrak JSON, cache, sanitasi dan autentikasi. `npm run test:cloudflare` membangun Worker secara dry-run lalu memakai workerd/SQLite lokal untuk memeriksa pembacaan bersama, eviction, invalidasi, deduplikasi, error stale dan SSE. Tidak memakai kalender atau akun Cloudflare produksi. `npm run build` memeriksa tipe Node/Vue/Cloudflare dan security gate artefak.

Pemasangan Worker/secret/binding pada akun pemilik serta notifikasi trigger Google nyata masih perlu diverifikasi setelah pemilik menjalankan langkah di atas. `npm audit` terpisah tetap melaporkan advisori picomatch yang belum memiliki patch; check tersebut tidak dinonaktifkan.
