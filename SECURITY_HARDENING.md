# VGA Class — Security Hardening & Anti-Defacement Plan

**Versi:** 1.0  
**Tanggal:** 16 November 2026  
**Prioritas:** Persiapan keamanan sebelum peluncuran publik  
**Dokumen terkait:** `PRD.md`, `IMPLEMENTATION_PLAN.md`, dan `VGA_Class_DESIGN_SYSTEM_v0.1.md`

**Status implementasi lokal — 16 November 2026:** audit aktual menemukan Vue SPA + backend **Node HTTP**, bukan Worker Cloudflare. Hardening yang diterapkan mengikuti arsitektur tersebut; rencana Cloudflare di bawah tetap bersifat panduan jika platform itu dipilih. Endpoint aktual adalah `GET /api/public-schedule?weekStart=YYYY-MM-DD&mentorId=all` (atau satu ID mentor). File design-system terpisah yang disebut di atas belum tersedia pada checkout ini. Temuan, perubahan, bukti tes dan hal yang belum terverifikasi dicatat pada [`SECURITY_AUDIT_REPORT.md`](SECURITY_AUDIT_REPORT.md).

Perubahan lokal mencakup validasi URL/CV dan query, whitelist static path + realpath, CSP dengan izin khusus atribut style kalender, anti-framing, ignore credentials/backup, gate public/build, patch dependency, serta workflow CI read-only. Ini **tidak** berarti 2FA, WAF, Cloudflare Access, branch rules atau secrets produksi sudah diaktifkan.

**Integrasi Apps Script ? 17 November 2026:** backend menerima JSON asli pemilik success/timezone/count/schedules/warnings, tanpa meminta metadata atau perubahan script Google. POST token/start/end memakai API_SECRET server-only; hasil ContentService diambil melalui GET tanpa token/body, dan redirect POST 307/308 ditolak. Timeout, batas ukuran, validasi waktu dan rekonstruksi field publik tetap diterapkan. Nama kalender menjadi label/filter mentor dengan ID internal stabil. Warning atau baris rusak tetap menampilkan sesi valid sebagai hasil sebagian; waktu kosong memerlukan konfirmasi admin jika kelengkapan sumber tidak terjamin. Uji nyata sampai browser berhasil menampilkan 20 sesi. Tidak ada perubahan deployment atau credential Google. Rincian: [docs/GOOGLE_APPS_SCRIPT_SETUP.md](docs/GOOGLE_APPS_SCRIPT_SETUP.md).

> **INSTRUKSI UNTUK AI CODING:** Baca dokumen ini bersama `PRD.md` dan `IMPLEMENTATION_PLAN.md` sebelum mengubah proyek. **Audit implementasi yang SUDAH ADA lebih dahulu**, lalu kerjakan hardening secara bertahap dan uji setiap perubahan. Jangan langsung mengganti arsitektur, framework, config Cloudflare, dependency, atau alur Google Calendar tanpa memeriksa penggunaannya saat ini. Jangan mengaku sudah mengaktifkan pengaturan dashboard GitHub/Cloudflare apabila belum benar-benar dilakukan dan diverifikasi oleh pemilik akun.

---

**Cache dan notifikasi — 17 November 2026:** cache browser/sessionStorage dan backend menghindari pembacaan sumber setiap navigasi. Mode awal TTL 5 menit; mode perubahan melalui trigger Apps Script memiliki batas cadangan 6 jam. `POST /api/calendar-changed` hanya membatalkan cache dengan bearer secret terpisah, batas ukuran/rate limit dan deduplikasi. Endpoint ini tidak memberikan izin menulis event Google. `GET /api/schedule-updates` mengirim revisi melalui SSE tanpa data acara. Instalasi trigger dan verifikasi HTTPS publik masih menunggu hosting. Petunjuk: [docs/CALENDAR_CACHE.md](docs/CALENDAR_CACHE.md).

## 0. Tujuan dan ruang lingkup

Tujuan keamanan:

1. Mengurangi risiko situs **VGA Class** berubah menjadi konten judi online/judol, spam SEO, tautan penipuan, atau konten lain akibat _defacement_, kebocoran akun, atau celah kode.
2. Melindungi akun **GitHub**, **Cloudflare**, dan **Google Calendar** yang digunakan untuk mengoperasikan situs.
3. Memastikan API kalender **read-only** dan **tidak membocorkan informasi siswa, mentor, atau kredensial**.
4. Mengurangi penyalahgunaan endpoint API oleh bot dan trafik otomatis.
5. Mempermudah **deteksi, investigasi, dan pemulihan** apabila ada insiden.
6. Menjaga seluruh fitur yang telah disepakati tetap berfungsi dan website tetap mudah digunakan.

**Asumsi proyek:** situs promosi dengan 5 route (`/`, `/programs`, `/mentors`, `/schedule`, `/gallery`), frontend Vue 3 + Vite + TypeScript (verifikasi sebelum bertindak), Cloudflare Workers/static assets, dan integrasi read-only ke lima Google Calendar mentor melalui backend. Tidak ada login siswa, pembayaran, CMS, upload file publik, maupun booking otomatis. CTA konsultasi melalui WhatsApp. **Jangan memperkenalkan fitur-fitur tersebut atas nama keamanan.**

**Model ancaman utama:** kompromi akun GitHub/Cloudflare/deployment, secret bocor, dependency berbahaya, XSS/injeksi konten, endpoint API disalahgunakan, informasi kalender terpapar, domain/DNS diambil alih, dan pengindeksan halaman spam. **Tidak ada konfigurasi yang menjamin keamanan 100%.**

## 1. Prioritas dan aturan eksekusi

### P0 — Wajib diselesaikan sebelum go-live publik

- [ ] Audit kode, dependency, deployment, dan konfigurasi yang sedang digunakan.
- [ ] Seluruh akun pengelola menggunakan 2FA/passkey dan akses paling minimum.
- [ ] Tidak ada secret/token/password di Git, frontend bundle, log, maupun file publik.
- [ ] API kalender hanya melayani pembacaan data terfilter; akses Google disimpan di server.
- [ ] Kegagalan sinkronisasi kalender tidak dianggap slot tersedia.
- [ ] Validasi parameter API, pembatasan metode/route, timeout, dan penanganan error aman.
- [ ] Header keamanan yang relevan dan Content Security Policy (CSP) diuji di browser.
- [ ] Build bersih, dependency diperiksa, dan semua route/CTA/fungsi kalender diuji.
- [ ] Konfigurasi backup/rollback, laporan keamanan, serta langkah tanggap insiden tersedia.
- [ ] Website produksi tetap publik; preview/staging dibatasi ke tim bila diperlukan.

### P1 — Disarankan segera setelah P0

- [ ] WAF, bot mitigation, dan rate limiting disesuaikan dengan paket serta pola trafik aktual.
- [ ] Proteksi branch dan required CI checks di GitHub.
- [ ] Dependency alerts, secret scanning/push protection jika tersedia.
- [ ] Monitoring HTTP error, traffic anomaly, deployment baru, perubahan DNS, dan Google Calendar sync.
- [ ] Audit SEO spam, canonical URLs, route fallback, serta Google Search Console untuk domain resmi.

### P2 — Peningkatan jangka panjang

- [ ] Uji penetrasi terarah dengan izin pemilik sistem.
- [ ] Review keamanan berkala setelah fitur/akun/mentor/dependency berubah.
- [ ] Otomatisasi tambahan untuk deteksi insiden dan pemeriksaan konten publik.

**Aturan implementasi:** kerjakan satu kelompok perubahan, tampilkan diff/ringkasan, jalankan tes, laporkan apa yang _belum_ bisa diverifikasi. Jangan menghapus data/secret/konfigurasi produksi, melakukan rotasi token, mengubah DNS, mengaktifkan Access untuk seluruh trafik, atau deploy langsung tanpa izin eksplisit pemilik proyek.

---

## 2. Audit awal wajib sebelum menulis kode

AI coding HARUS mengidentifikasi dan melaporkan:

1. Framework dan mode rendering sebenarnya (Vue SPA, SSR, atau lainnya).
2. Struktur proyek saat ini, file `package.json`, lockfile, workflow CI/CD, dan Wrangler (`wrangler.jsonc` / `wrangler.toml`).
3. Apakah deployment adalah **Cloudflare Workers Static Assets**, Worker dengan script API, Cloudflare Pages, atau layanan lain.
4. Aset yang memang harus tersedia di internet dan folder yang diikutsertakan ke hasil build.
5. Semua integrasi eksternal, script/font/CDN, Analytics, WhatsApp, Google Calendar.
6. Seluruh entry point input dari pengunjung: route parameters, query string kalender, search/filter, URL eksternal, markup dinamis.
7. Adanya secret di konfigurasi / repository / environment yang **diduga** terekspos; **jangan tampilkan nilai secret dalam hasil audit**.
8. Semua API dan method HTTP aktif serta data responsnya.
9. Daftar hal yang aman diubah sekarang vs membutuhkan tindakan manual pemilik akun.

**Output audit minimum:** `SECURITY_AUDIT_REPORT.md` berisi temuan, dampak, tingkat prioritas P0/P1/P2, perubahan yang disarankan, status perbaikan, dan bukti test (tanpa nilai kredensial). Jika proyek masih menggunakan data placeholder, tandai sebagai placeholder dan jangan mengarang bukti live.

---

## 3. Proteksi akun GitHub, Cloudflare, dan domain (dashboard/manual)

### 3.1 Akun wajib aman

- Aktifkan **2FA**, utamakan passkey/security key, di akun GitHub dan Cloudflare. Lindungi pula email utama yang dapat mereset akun tersebut.
- Gunakan kata sandi unik; jangan membagikan credential atau recovery code kepada AI/collaborator.
- Aktifkan notifikasi sign-in/deployment bila tersedia; review sesi login dan perangkat berkala.
- Hanya beri akses repo/Cloudflare kepada pengelola yang memang perlu; hapus akses lama.
- Gunakan token dengan scope paling kecil dan masa berlaku/rotasi yang sesuai. Hindari personal access token berizin luas untuk deploy.
- Aktifkan pengamanan registrar domain dan DNS, termasuk registrar lock jika tersedia; dokumentasikan registrar, pemilik domain, dan cara pemulihan.

### 3.2 Repository GitHub

- Lindungi branch produksi (misalnya `main`) dengan ruleset/branch protection **jika didukung pada tipe repo/paket**.
- Batasi force push dan penghapusan branch produksi.
- Gunakan Pull Request untuk perubahan penting, cek perubahan `package.json`, lockfile, workflow, `wrangler*`, `_headers`, API, serta domain/SEO secara khusus.
- Jalankan tes build/lint/typecheck dalam CI; jadikan pemeriksaan wajib jika memungkinkan.
- Aktifkan Dependabot alerts/security updates dan secret scanning/push protection jika fitur tersedia untuk repository.
- Gunakan `.gitignore` untuk `.env`, `.env.*`, `.dev.vars*`, file token, credential JSON, dan build artifacts yang tak perlu di-track; **tetap izinkan template** seperti `.env.example` yang hanya memuat NAMA variabel/placeholder nonrahasia.
- Ingat: `.gitignore` **tidak menghapus** secret yang pernah ter-commit. Bila secret pernah bocor, cabut/rotasi kredensial dari provider, bersihkan riwayat jika diperlukan, dan audit log.

### 3.3 Cloudflare account dan deployment

- Pastikan hanya branch yang diotorisasi dapat melakukan deploy ke production.
- Periksa siapa yang memiliki izin untuk edit Worker, Secrets, DNS, routes, dan integrasi GitHub.
- **Jangan** aktifkan Cloudflare Access untuk _All traffic_ jika website ditujukan untuk umum.
- Untuk **preview builds**, boleh aktifkan Cloudflare Access dengan scope **Previews only** dan policy allowlist email tim (pemilik perlu mengaturnya di dashboard dan memverifikasi hasilnya).
- Atur separate environments untuk preview/production bila diperlukan. Secret **harus** dikonfigurasi per environment; jangan berasumsi otomatis diwariskan.
- Catat deployment yang diketahui aman dan pastikan prosedur rollback diuji secara terkendali.

**Catatan:** WAF dan aturan domain memerlukan pemeriksaan hostname yang benar (`custom domain` versus `*.workers.dev`). Jangan menganggap sebuah aturan zone di domain kustom otomatis melindungi setiap hostname Worker lain. Uji per hostname yang benar-benar digunakan.

---

## 4. Pengamanan secret dan data sensitif

1. Semua token Google OAuth, refresh token, client secret, dan kredensial service account (jika ada) **hanya** berada di backend Cloudflare Worker/secret store atau penyimpanan aman yang sesuai.
2. **Jangan** meletakkan kredensial di frontend, `import.meta.env.VITE_*`, source maps publik, localStorage, data HTML, kode GitHub, atau `wrangler.jsonc` bagian `vars`.
3. Cloudflare Workers: simpan nilai sensitif di **Variables and Secrets → Secret** atau Wrangler secret; gunakan `.dev.vars`/`.env` hanya untuk local development dan gitignore.
4. `VITE_*` adalah konfigurasi yang dapat masuk ke bundle browser. Hanya gunakan untuk nilai **publik** seperti label/URL publik, bukan token.
5. Tidak pernah logging token, Authorization header, raw Google event description, email peserta, nomor telepon, atau lokasi privat.
6. Bila secret belum tersedia: aplikasi jangan gagal dengan bocornya stack trace. API kalender harus menampilkan `unavailable`/`sync_error` dan UI mengarahkan konfirmasi ke WhatsApp.
7. Jika ditemukan secret benar-benar pernah dipublikasikan, buat daftar kebutuhan rotasi tanpa memperlihatkan nilainya dan minta persetujuan pemilik sebelum mengganti atau mencabutnya.

Contoh perintah penyimpanan secret Worker (dijalankan pemilik/lingkungan terotorisasi setelah memeriksa nama Worker):

```bash
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
```

Nama secret hanyalah contoh; pilih mekanisme OAuth yang benar sesuai arsitektur nyata. Perintah `wrangler secret put` dapat membuat versi Worker dan melakukan deployment, jadi **jangan eksekusi secara otomatis tanpa izin**.

---

## 5. Keamanan Google Calendar / API publik

### 5.1 Arsitektur wajib

```text
Browser pengunjung
    ↓  HTTPS GET /api/schedule?weekStart=YYYY-MM-DD&mentorIds=...
Cloudflare Worker/backend read-only
    ↓  credential server-side, permission minimum
Google Calendar mentor 1–5
    ↓  data event diolah di backend
Response publik: hanya field aman + status sinkronisasi
```

- Backend menggunakan izin Google paling minimum sesuai kebutuhan, misalnya scope event read-only atau free/busy; **jangan minta izin edit/create/delete** jika situs hanya membaca.
- Idealnya gunakan kalender khusus pengajaran/blokir, bukan kalender pribadi yang seluruh isinya ditampilkan apa adanya.
- Akun admin pusat hanya menerima akses yang diperlukan dari masing-masing mentor.
- Jangan menerima `calendarId`/URL Google Calendar arbitrer dari pengguna. Pilih `mentorId` dari daftar allowlist di server.
- API **tidak boleh menyediakan POST/PUT/PATCH/DELETE** untuk membuat/mengubah event. Method selain GET/OPTIONS yang dibutuhkan (jika memang dibutuhkan) harus ditolak dengan respons yang sesuai.
- Validasi `weekStart` sebagai tanggal ISO, normalisasi minggu ke Senin dalam **Asia/Jakarta**, dan batasi rentang query (misalnya satu minggu per request dan batas penelusuran minggu yang masuk akal).
- Validasi `mentorIds` hanya dari ID mentor yang tersedia; batasi jumlah dan panjang parameter. Jangan menggunakan input untuk menyusun URL eksternal secara bebas (mencegah SSRF).
- Terapkan timeout, cache singkat (contoh awal ±5 menit), batas panggilan upstream, serta penanganan rate/quota error dan partial failure per mentor.
- Gunakan cache key yang hanya berisi parameter yang tervalidasi, bukan token atau data sensitif.
- Tetapkan `Content-Type: application/json; charset=utf-8`, `Cache-Control` sesuai kesegaran data, dan hindari respons/diagnostik yang menyertakan raw event.
- API dapat diakses publik untuk menampilkan kalender **hanya** dengan payload yang sudah disanitasi; jangan mengandalkan CORS sebagai autentikasi. Prefer same-origin dan jangan aktifkan wildcard CORS tanpa alasan.

### 5.2 Data yang BOLEH / TIDAK BOLEH muncul di browser

**Boleh (jika telah disetujui):**

- `mentorId`, `mentorDisplayName`, `start`, `end`, `availabilityStatus`, `syncStatus`, `updatedAt`.
- Label aman seperti `Terisi`, `Sesi mengajar`, `Tidak tersedia`, atau `Kalkulus 1/2` **hanya** bila publikasinya disetujui dan berasal dari whitelist.

**Tidak boleh:**

- Nama siswa, nomor telepon, email, alamat privat, undangan peserta, link Meet privat, catatan peserta, deskripsi bebas Google Calendar, raw organizer/attendees, access token, refresh token, maupun raw Google API error.

**Aturan desain yang aman:** lebih baik respons berupa **interval sibuk per mentor** dengan label generik, daripada meneruskan event Google Calendar lengkap ke browser.

### 5.3 Aturan ketersediaan yang sudah disepakati

- Semua mentor memiliki jam operasional **Senin–Minggu 07.00–21.00 WIB**.
- Waktu kosong dalam jam operasional boleh ditampilkan **`Tersedia untuk diajukan` jika dan hanya jika data mentor berhasil disinkronkan dan belum kedaluwarsa**, tanpa event pengajaran atau blokir yang beririsan.
- Di luar 07.00–21.00 WIB = **Tidak tersedia**.
- Jadwal terisi dan blokir mentor menutupi interval waktunya (termasuk event yang beririsan sebagian dengan jam operasional).
- Sesi 90 menit selesai paling lambat 21.00 (mulai maksimal 19.30); sesi 120 menit selesai paling lambat 21.00 (mulai maksimal 19.00).
- Jika API gagal/timeout/token habis/quota error/sync stale, status mentor tersebut = **`Tidak diketahui`**, **BUKAN `Tersedia`**. Mentor lain yang tersinkron valid tidak perlu disembunyikan.
- Tidak ada pemesanan otomatis. Semua jadwal harus dikonfirmasi admin lewat WhatsApp.

### 5.4 Respons error

- Jangan kirim exception stack, token, upstream URL bercredential, ID rahasia, deskripsi event, atau data pribadi.
- Tampilkan pesan netral: `Jadwal sementara tidak dapat diperbarui. Silakan konfirmasi melalui WhatsApp.`
- Log internal hanya metadata aman: timestamp, request ID, kategori kesalahan, mentor ID internal nonrahasia, latensi, dan kode status.

---

## 6. Hardening frontend (XSS, dependency, tautan keluar)

- Jangan gunakan `v-html` untuk teks bebas atau data API. Secara default gunakan interpolasi Vue yang melakukan escaping.
- Jika benar-benar perlu HTML rich-text, gunakan sanitizer yang dikonfigurasi ketat, whitelist tag/atribut minimal, dan review ancaman XSS.
- Validasi dan batasi semua URL eksternal; hanya skema aman (`https:`, `mailto:`, atau `https://wa.me/...` setelah nomor tervalidasi). Tolak `javascript:` dan `data:` untuk tautan pengguna.
- Semua tautan `target="_blank"` harus menggunakan `rel="noopener noreferrer"`.
- Jangan memuat script dari CDN tidak dikenal atau menyuntikkan `innerHTML` dari konten tak terpercaya. Usahakan aset lokal; bila script eksternal diperlukan, audit sumber, izin penggunaan, dan kebijakan CSP/SRI yang sesuai.
- Tidak perlu menambahkan form upload, admin dashboard publik, login siswa, atau editor konten; itu memperbesar attack surface.
- Verifikasi dependency memakai lockfile dan `npm ci` di CI; jalankan `npm audit` dan telaah temuan `high/critical`. Jangan melakukan `npm audit fix --force` otomatis karena bisa merusak kompatibilitas.
- Evaluasi package baru sebelum dipasang, terutama jumlah dependency, reputasi maintainer, kebutuhan instalasi scripts, dan perubahan lockfile yang tidak terkait.
- Jangan menampilkan nomor WhatsApp demo/placeholder sebagai kontak sungguhan.
- Gunakan HTTPS dan pastikan seluruh gambar/font/script dimuat secara aman tanpa mixed content.

---

## 7. HTTP security headers, CSP, dan Cloudflare

### 7.1 Header dasar

Terapkan header yang sesuai tanpa merusak tampilan:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY` **jika situs tidak perlu di-embed pada iframe**.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` jika fitur tersebut memang tidak dipakai.
- `Content-Security-Policy` yang sesuai dengan sumber asset/fitur sebenarnya; **mulai dengan Report-Only bila perlu untuk menguji kompatibilitas**.
- `Strict-Transport-Security` hanya untuk host HTTPS yang memang sepenuhnya siap HTTPS; jangan gunakan `includeSubDomains` atau `preload` tanpa meninjau seluruh subdomain/konsekuensinya.

### 7.2 Contoh awal `public/_headers` untuk static assets

> **Contoh, bukan konfigurasi final yang boleh ditempel tanpa audit.** Cloudflare Workers Static Assets mendukung file `_headers` yang disalin ke `dist` oleh build Vite. File ini **tidak** mengatur respons yang dihasilkan secara langsung oleh Worker script/API—untuk itu atur `Response.headers` pada kode Worker. Pastikan deployment yang dipakai memang mendukung mekanisme ini.

```text
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

**CSP:** bangun berdasarkan hasil audit sumber frontend. Contoh kebijakan dasar untuk Vite SPA yang hanya memakai aset sendiri dan tanpa embed/third-party scripts:

```text
Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; upgrade-insecure-requests
```

Contoh CSP tersebut **harus disesuaikan** jika website memakai Google Fonts, video embed, image CDN, analytics, API beda domain, atau mekanisme style lain. Jika aplikasi memakai inline styles/scripts, atur solusi nonce/hash atau alternatif aman; **jangan** langsung melemahkan ke `unsafe-inline`/`unsafe-eval` tanpa justifikasi dan test. Pastikan `connect-src` mengizinkan endpoint API kalender yang benar jika tidak same-origin. Gunakan pengujian browser dan console, lalu ubah dari `Content-Security-Policy-Report-Only` ke enforce setelah lolos.

### 7.3 Routing Workers untuk SPA + API

Jika project memiliki **Worker script yang menangani `/api/*`** dan static assets SPA, pastikan request API tidak berubah menjadi `index.html` akibat fallback SPA. Di Wrangler, konfigurasi routing perlu mengarahkan `/api/*` ke Worker terlebih dulu (contoh konsep `assets.run_worker_first: ["/api/*"]` pada versi yang mendukung). **Jangan menimpa konfigurasi Wrangler yang sudah berjalan**; verifikasi kecocokan framework dan versi Wrangler lebih dahulu.

- Endpoint API tidak dikenal, misalnya `/api/unknown`, harus merespons `404` JSON/teks aman, bukan HTML SPA `200`.
- Frontend routes `/programs`, `/mentors`, `/schedule`, `/gallery` harus tetap bisa di-refresh dan dibuka langsung.
- Route publik yang tidak dikenal harus menampilkan halaman 404 yang benar dan **tidak menghasilkan konten SEO spam**. Untuk SEO, usahakan HTTP 404 asli jika arsitektur mendukung; hindari mengandalkan `robots.txt` sebagai lapisan keamanan.
- Pastikan secret/environment-specific config tidak ikut terunggah sebagai static asset.

### 7.4 WAF, bot protection, rate limiting

**Tindakan dashboard setelah custom domain aktif:**

- Pastikan domain produksi diproxy/di-route sesuai Cloudflare setup yang benar.
- Aktifkan WAF Managed Rules/Free Managed Ruleset yang tersedia di paket, dengan action yang tidak memblokir pengguna sah.
- Pertimbangkan bot protection, security level, dan rate limiting khusus endpoint `/api/schedule` untuk trafik berlebihan; gunakan angka batas **berdasarkan pengukuran**, bukan mengarang limit yang bisa memblokir kelas/mahasiswa dari satu jaringan kampus.
- Review Security Events dan false positives setelah aturan diaktifkan.
- Uji hostname production, preview, dan `workers.dev` secara terpisah. WAF zone custom domain tidak boleh diasumsikan otomatis mencakup seluruh hostname lainnya.
- Gunakan Cloudflare Access untuk preview/staging privat saja; **production VGA Class harus tetap publik**.

---

## 8. Build, CI/CD, dan supply-chain security

Alur yang direkomendasikan:

```text
AI/Coder mengubah kode di branch kerja
    ↓
Review perubahan / Pull Request
    ↓
CI: install lockfile → lint/typecheck/build/test → dependency/secrets review
    ↓
Merge ke branch produksi yang terlindungi
    ↓
Cloudflare auto-deploy
    ↓
Smoke test route + API kalender + header + tampilan mobile
```

Checklist:

- [ ] `package-lock.json` atau lockfile package manager yang dipakai dipertahankan dan direview.
- [ ] `npm ci` digunakan pada CI untuk proyek npm, bukan `npm install` bebas tanpa lockfile.
- [ ] `npm run build` sukses; jalankan lint/typecheck/test sesuai script yang **benar-benar ada** dalam `package.json`.
- [ ] Audit dependency dengan `npm audit --audit-level=high`; temuan ditinjau, bukan otomatis memaksakan upgrade major.
- [ ] Periksa perubahan file berisiko: `package.json`, lockfile, workflows, Wrangler, CSP, `.env*`, source backend, dan script deployment.
- [ ] Tidak mencetak nilai environment/secrets ke CI logs.
- [ ] Dependabot/secret scanning diaktifkan jika tersedia, alert kritis diproses.
- [ ] Build preview diuji sebelum merge; produksi dideploy hanya dari branch yang diotorisasi.
- [ ] Hasil build tidak menyertakan credential/file sumber pribadi/backup mentah.

**Tidak perlu** menambah dependency keamanan yang tidak dipakai; gunakan fitur native Cloudflare/GitHub bila cukup.

---

## 9. Monitoring, anti-judol, dan integritas SEO

Tujuan utama adalah cepat mengetahui jika ada perubahan tidak sah dan mencegah pengunjung terpapar konten berbahaya.

- Pantau deployments, perubahan GitHub, anggota baru, perubahan DNS, Workers routes, dan perubahan Cloudflare account.
- Monitoring minimal pada halaman penting: `/`, `/programs`, `/mentors`, `/schedule`, `/gallery`, serta endpoint `/api/schedule`.
- Cek uptime, 5xx, respons API, `syncStatus`, serta perubahan konten penting (judul, meta title, canonical, tautan baru, script asing) secara berkala.
- Aktifkan notifikasi keamanan dan laporan dependency yang benar-benar didukung akun.
- Setelah domain resmi aktif, daftarkan Google Search Console dan periksa **Security Issues**, halaman terindeks tidak dikenal, spam keywords, dan perubahan sitemap.
- Pastikan sitemap hanya berisi route sah. Gunakan metadata SEO yang konsisten; jangan menciptakan halaman judol/promo tersembunyi untuk bot atau melayani konten berbeda ke crawler.
- Pastikan folder publik tidak mengandung `backup.zip`, `.env`, source map dengan informasi sensitif, database dump, credential JSON, atau file internal.
- Kelola robots/noindex untuk preview bila perlu; **robots.txt bukan mekanisme akses kontrol**.

**Bila ditemukan URL judol di hasil pencarian tetapi bukan route aplikasi:** periksa dahulu apakah terjadi defacement, cloaking, kebocoran subdomain, atau hanya hasil terindeks lama/tidak relevan. Gunakan log, riwayat deploy, Search Console, dan pemeriksaan respons URL sebelum mengambil tindakan.

---

## 10. Incident response — jika situs disusupi/defaced

> **Tujuan:** hentikan paparan bahaya, pertahankan bukti yang aman, pulihkan layanan, dan tutup jalur serangan. Tindakan yang merusak data, merotasi secret, atau mengganti konfigurasi produksi wajib memperoleh izin pemilik kecuali insiden sudah dikelola melalui runbook operasional yang sebelumnya disetujui.

**Langkah 1 — Identifikasi dan batasi dampak**

- Catat waktu insiden (WIB), URL terdampak, screenshot, status code, deployment/version, dan sinyal keamanan.
- Jika pengunjung berisiko diarahkan ke konten berbahaya, batasi/matikan sementara paparan atau aktifkan halaman pemberitahuan yang aman sesuai kemampuan platform.
- Jangan mengklik tautan berbahaya atau menyalin kode tidak terpercaya ke produksi.

**Langkah 2 — Periksa sumber kompromi**

- Audit history commit/PR, akun GitHub, workflows, perubahan Cloudflare Worker, secret, DNS, dan akses Google.
- Cari perubahan tidak sah pada script, dependency, public assets, metadata SEO, route, serta API.
- Simpan bukti yang relevan tanpa menyebarkan secret atau informasi siswa.

**Langkah 3 — Pulihkan**

- Tutup titik masuk terlebih dahulu (misalnya cabut sesi/token kompromi, tutup PR berbahaya, perbaiki dependency/kode).
- Rotasi kredensial yang diduga bocor melalui pemilik akun; dokumentasikan layanan terdampak.
- Gunakan **rollback** ke deployment yang diverifikasi aman atau deploy ulang commit aman, lalu lakukan smoke test.
- Pastikan domain, Worker routes, preview, dan Google Calendar berjalan benar.

**Langkah 4 — Bersihkan jejak SEO dan lanjut monitoring**

- Periksa sitemap, tautan asing, redirects, tag canonical, halaman 404, Search Console, dan URL yang terlanjur terindeks.
- Ajukan pemrosesan ulang/peninjauan keamanan di Search Console bila memang diperlukan setelah masalah dibereskan.
- Tingkatkan pemantauan dan tulis postmortem (akar masalah, timeline, dampak, perbaikan preventif).

---

## 11. Acceptance criteria / pengujian wajib

AI coding harus menunjukkan bukti uji berikut. **Jangan mengklaim berhasil jika tidak benar-benar diuji.**

### A. Frontend & browser

- [ ] Website menampilkan 5 route tanpa broken link atau blank page, di desktop dan mobile.
- [ ] Refresh langsung `/programs` atau `/schedule` berhasil.
- [ ] Script HTML yang sengaja dimasukkan sebagai string uji pada konten input **tidak dieksekusi**; hanya menjadi teks aman.
- [ ] Tautan eksternal dan WhatsApp tidak bisa diubah menjadi `javascript:` URL.
- [ ] Security headers tersedia sesuai jenis respons (asset statis dan Worker-generated); CSP tidak memblokir fitur sah.
- [ ] Tidak ada mixed content atau token dalam view-source, DevTools Network, asset bundle, maupun source map publik.

### B. API schedule

- [ ] Request tanggal minggu valid dengan mentor valid menghasilkan data publik terfilter.
- [ ] Parameter tanggal/ID tidak valid menghasilkan 400 yang aman (tanpa stack trace).
- [ ] Method yang tidak didukung menghasilkan 405/404 yang sesuai dan **tidak memodifikasi kalender**.
- [ ] `GET /api/unknown` tidak mengembalikan HTML frontend dengan status sukses.
- [ ] Data raw Google Calendar (email, siswa, notes, Meet links, token) **tidak muncul** di respons publik.
- [ ] Kalender mentor yang kosong tetapi tersinkron sehat → tersedia untuk diajukan antara 07.00–21.00 WIB.
- [ ] Kalender gagal/stale → status tidak diketahui, **tidak** menyimpulkan tersedia.
- [ ] Event recurring, cancelled, overlap, rentang 07.00–21.00, lintas minggu, dan timezone Asia/Jakarta diuji.
- [ ] Cache dan rate limiting tidak membuat ketersediaan salah atau memblokir pengguna normal secara berlebihan.

### C. Akun, deploy, dan operasi

- [ ] Pemilik akun memverifikasi 2FA GitHub dan Cloudflare aktif.
- [ ] Pemilik akun memverifikasi preview Access hanya untuk preview, dan production publik.
- [ ] Tidak ada secret masuk repository, deploy logs, maupun frontend.
- [ ] Branch produksi dan auto-deploy sesuai kebijakan yang dipilih pemilik.
- [ ] Prosedur rollback diketahui, deployment aman terdokumentasi, dan monitoring dasar aktif.
- [ ] WAF/rate limiting pada hostname produksi ditinjau dan dicek false positive jika digunakan.

### D. Bukti hasil implementasi

AI coding menyerahkan:

1. `SECURITY_AUDIT_REPORT.md` (before/after, temuan P0/P1/P2, bukti, hal yang belum diuji).
2. Daftar file yang diubah dan alasan setiap perubahan.
3. Ringkasan hasil `build`, `test`, lint/typecheck, audit dependency (termasuk yang gagal).
4. Daftar **manual dashboard actions** yang harus pemilik selesaikan (2FA, Access policy, GitHub settings, WAF/rate limiting, OAuth secrets, domain).
5. Status akhir setiap acceptance criterion: `PASS`, `FAIL`, atau `NOT VERIFIED`, dengan alasan.
6. Penjelasan perubahan yang berpotensi merusak desain/performa dan bagaimana rollback jika dibutuhkan.

---

## 12. Prompt siap ditempel ke AI coding

> **PROMPT**  
> Kamu bertugas melakukan _Security Hardening_ pada repository **VGA Class**. Baca `PRD.md`, `IMPLEMENTATION_PLAN.md`, dan `SECURITY_HARDENING.md` secara lengkap. **Jangan langsung mengubah kode.** Mulai dengan audit kode, dependency, deployment Cloudflare Workers, Google Calendar API, pengelolaan secret, pengaturan SEO, dan HTTP security headers. Buat `SECURITY_AUDIT_REPORT.md` yang membedakan temuan nyata dari risiko hipotetis.
>
> Setelah audit, implementasikan **P0 satu fase per iterasi**: pengamanan API kalender (read-only/sanitasi/fail-closed), validasi input, error handling, secret safety, headers/CSP, dan tes. Pertahankan lima halaman dan semua fitur yang disepakati. Jangan tambahkan login siswa, CMS, booking, atau pembayaran.
>
> Untuk hal yang hanya bisa dilakukan melalui dashboard GitHub/Cloudflare/Google, buat instruksi manual spesifik dan beri status `NOT VERIFIED` sampai pemilik mengonfirmasi. Jangan mengklaim WAF/2FA/Access/Secrets aktif tanpa bukti. Jangan rotasi secret, ubah DNS, deploy production, atau mengaktifkan Access `All traffic` tanpa izin.
>
> Setiap tahap wajib menghasilkan diff, alasan perubahan, hasil tes, potensi regressions, dan daftar item PASS/FAIL/NOT VERIFIED. Gunakan dokumentasi provider terbaru jika ada perbedaan API. Mulai sekarang dari **audit awal**, bukan langsung refactor besar.

---

## 13. Referensi resmi untuk implementasi

Verifikasi kembali dokumentasi ini terhadap versi platform dan konfigurasi akun saat pengerjaan:

- Cloudflare Workers Static Assets & SPA: https://developers.cloudflare.com/workers/static-assets/
- Cloudflare Workers SPA routing: https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/
- Cloudflare Workers `_headers`: https://developers.cloudflare.com/workers/static-assets/headers/
- Cloudflare Workers secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Cloudflare Workers Access: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- Cloudflare Worker custom domains: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- GitHub rulesets and branch protection: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets
- GitHub secret push protection: https://docs.github.com/en/code-security/concepts/secret-security/push-protection
- Google Calendar API authorization scopes: https://developers.google.com/workspace/calendar/api/auth
- OWASP Web Security Testing Guide: https://owasp.org/www-project-web-security-testing-guide/
- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/

---

**Catatan akhir:** Security hardening adalah proses berkelanjutan. Fokus VGA Class v1 adalah situs promosi yang sederhana, **API kalender read-only yang minim data**, pipeline deploy terkontrol, dan kemampuan deteksi/pemulihan yang jelas. Implementasi harus berbasis kondisi repository aktual, bukan sekadar mengikuti checklist secara mekanis.
