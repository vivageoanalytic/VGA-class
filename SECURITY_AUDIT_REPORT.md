# Audit keamanan VGA Class

Tanggal audit: 16 November 2026 (WIB). Cakupan: source lokal dan hasil build; bukan audit akun/provider atau uji penetrasi produksi. Baseline sebelum perubahan: commit `f138150`.

## Kompatibilitas instalasi Cloudflare — 18 November 2026

Build commit `f66124f` gagal sebelum kompilasi karena npm 10 menolak lockfile dengan override bertingkat `js-beautify > editorconfig > minimatch`. Kegagalan yang sama direproduksi pada npm 10.9.9. Override `editorconfig > minimatch` kini didefinisikan langsung pada parent paket tersebut; versi glob/minimatch dipertahankan. Lockfile diserialisasi ulang dengan npm 10, dan CI menggunakan Node 22 agar memeriksa target instalasi Cloudflare.

Verifikasi terisolasi pada Windows: instalasi bersih Node 22.23.5/npm 10.9.9 berhasil, **301 tes unit/komponen lulus**, serta build produksi/TypeScript/security gate lulus tanpa `.env` lokal. Instalasi `node_modules` utama tetap dipertahankan. Build aktual Cloudflare dari commit perbaikan belum dijalankan.

Audit dependency terbaru mendeteksi **7 temuan high** yang berasal dari satu advisori picomatch melalui alat build/test (Vite, Vitest dan Vue language tools). [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), diperbarui 17 November 2026, mencakup picomatch sampai 4.0.7; registry dan advisori belum menyediakan versi patch saat pemeriksaan. Ini terpisah dari error lockfile. Gate `npm audit --audit-level=high` tetap aktif dan saat ini gagal; tidak dilakukan downgrade framework atau pengabaian advisori. Hasil audit 0 pada catatan 16 November di bawah merupakan hasil historis, bukan status audit terbaru.

## Integrasi JSON Apps Script asli ? 17 November 2026

Backend menerima success, timezone, count, schedules, warnings milik pemilik. Setiap sesi dibaca dari mentor/title/start/end/allDay tanpa syarat versi, ID/status mentor atau echo rentang tambahan. Nama kalender menjadi label publik yang memang dikirim API; website membuat ID stabil dan timestamp penerimaan sendiri. Calendar ID dan token tidak diteruskan ke browser.

POST bertoken hanya menuju deployment HTTPS Google yang dikonfigurasikan pemilik. Pengambilan hasil ContentService memakai GET tanpa body/token; redirect POST 307/308 ditolak. Timeout 12 detik, maksimal tiga redirect dan respons 1 MiB tetap berlaku. Field publik direkonstruksi; judul mentah, lokasi, kontak murid, link Meet dan field tambahan diabaikan. Warning atau baris rusak mempertahankan sesi valid dengan penanda sebagian; karena sumber gagal tidak diketahui, waktu kosong perlu konfirmasi admin. Fetch gagal memakai stale/error.

Bukti terbaru: 269 tes unit/komponen, 17 tes browser, build/TypeScript dan security gate PASS. JSON dari script asli dijalankan melalui adapter, validator browser, kalender mingguan, filter, all-day, partial dan kondisi kosong. Uji nyata sampai browser membaca 20 sesi, dua label kalender dan 13 sesi setelah filter Zaky; homepage menampilkan tiga cuplikan, tanpa error browser atau notice kegagalan. Layout aktual 390 px tetap di dalam viewport. Screenshot: docs/previews/schedule-live.png. Pengiriman token telah diizinkan eksplisit oleh pemilik; tidak ada perubahan akun, token atau deployment Google.

Tidak diperlukan pemasangan script pengganti. Contoh lokal Code.gs memakai bentuk respons asli dan tidak menyimpan ID kalender privat di repository. Pengaturan akun/hosting, kelengkapan profil, kalender yang belum pernah muncul pada schedules, dan rilis domain produksi tidak dibuktikan oleh uji ini.

## Perbaikan daftar mentor dan server dev ? 17 November 2026

Vite development/preview melayani API yang sama tanpa proxy ke proses port 3001, mengatasi HTTP 500 ketika backend terpisah tidak berjalan. Secret dibaca hanya di konfigurasi Node, tidak menjadi define frontend. Validasi query, rate limit, method GET dan header API tetap dipakai; konfigurasi Google di server uji dikosongkan. Kalender live tidak menampilkan nama contoh ketika API gagal.

Jendela pembacaan 31 hari digunakan untuk menemukan nama mentor dari JSON pemilik, kemudian event difilter ke minggu pilihan. Mentor yang sudah diketahui tetap ada meskipun tidak memiliki sesi. Verifikasi data nyata menampilkan keempat nama dan Agus tersedia 07.00?21.00 pada hari kosong, tanpa blok sesi Agus dalam minggu 16?22 November. Warning/kegagalan sumber tetap menahan klaim ketersediaan. Lihat docs/previews/availability-live.png.

## Cache dan notifikasi perubahan — 17 November 2026

Cache publik tersanitasi dibagi di memori/sessionStorage browser, sedangkan backend menggabungkan pembacaan per minggu untuk semua pengunjung dalam satu proses. Mode awal TTL 5 menit tetap aktif tanpa trigger. Mode changes memakai notifikasi dan lease maksimal 6 jam; timestamp fetch asli dipertahankan. Invalidasi menggunakan revisi acak dan mencegah respons lama menimpa hasil setelah perubahan. Cache backend belum dibagi antar-instance dan tidak bertahan setelah restart.

Endpoint baru `POST /api/calendar-changed` hanya membatalkan cache, tidak membuat/mengubah/menghapus acara Google. Autentikasi bearer memakai secret terpisah `CALENDAR_WEBHOOK_SECRET`, perbandingan hash konstan, JSON maksimal 4 KiB berisi UUID saja, rate limit dan deduplikasi notifikasi. SSE `GET /api/schedule-updates` hanya mengirim revisi publik, dibatasi 100 koneksi dan tidak membuka judul/Calendar ID. Secret tetap server-only. GET jadwal tidak menyediakan parameter untuk memaksa panggilan Google.

Tambahan `CalendarNotifications.gs` mempertahankan script dan JSON pemilik, memakai trigger perubahan Calendar serta URLFetch ke HTTPS tujuan tanpa redirect. Retry hanya mengirim perubahan yang tertunda. Secret lokal terpisah telah dibuat pada `.env`; pemasangan trigger akun Google dan callback hosting publik belum dilakukan. Langkah instalasi, scope tambahan serta batas multi-instance: [docs/CALENDAR_CACHE.md](docs/CALENDAR_CACHE.md).

Verifikasi lokal terbaru: **301 tes unit/komponen, 19 tes browser, build/TypeScript dan security gate lulus**. Browser menguji navigasi memakai satu pembacaan sumber, notifikasi duplikat tanpa pembacaan tambahan, lalu tambah/ubah/hapus acara melalui backend fixture. Uji nyata localhost:5173 memperlihatkan satu request API website untuk navigasi jadwal–beranda–jadwal dan reload tab, dengan keempat mentor/20 sesi tetap tampil tanpa error browser. Kegagalan sumber dijadwalkan untuk diperiksa lagi dalam semenit, termasuk jika snapshot sebelumnya memiliki lease panjang atau kedaluwarsa. Ini bukan bukti pemasangan trigger nyata pada akun Google.

## Arsitektur yang ditemukan

- Vue 3 SPA, TypeScript, Vite, Tailwind, Vue Router. Lima route publik dan 404; metadata HTML per route dibuat saat build.
- Backend sebenarnya **Node HTTP**, `api/server.ts`, bukan Cloudflare Worker. Tidak ditemukan Wrangler, `_headers`, konfigurasi Cloudflare, maupun workflow CI pada baseline. Status deployment/hosting tidak diketahui.
- Aset publik: `public/` disalin ke `dist/`, termasuk ilustrasi demo dan font lokal. Backend terkompilasi di `dist-server/` tidak menjadi static root.
- Integrasi: WhatsApp hanya jika nomor valid; Google Calendar melalui backend. Tidak ada analytics, script CDN, login, pembayaran, CMS, atau upload publik.
- Input publik: pathname, query `weekStart`/`mentorId`, filter lokal, konfigurasi URL publik. Respons kalender memakai whitelist, bukan raw event.
- `GET /api/public-schedule` membaca data. Method lain ditolak 405; API yang tidak dikenal 404 JSON. Canceled/transparent diabaikan, recurring diproses per kejadian, cache per mentor/minggu dan sync gagal/stale tidak dianggap tersedia.
- Secret Google diakses melalui environment server. Tidak ditemukan `v-html` atau penyisipan HTML dari API pada source baseline. Pemeriksaan source saat ini tidak membuktikan seluruh riwayat Git/account bersih.

## Temuan sebelum perubahan

| ID     | Prioritas      | Bukti dan dampak                                                                                                                                                                                | Rencana perbaikan                                                                                                                          |
| ------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| SEC-01 | P0             | `.gitignore` belum mencakup `.dev.vars`, file OAuth/credential, dan backup. `public/` tidak memiliki gate untuk mencegah file sensitif ikut build. Ini celah pencegahan, bukan bukti kebocoran. | Tambah ignore dan pemeriksaan source/build; batasi static serving dan uji penolakan file internal.                                         |
| SEC-02 | P0             | CSP memiliki `style-src 'unsafe-inline'` untuk seluruh style; belum ada `object-src 'none'` dan `X-Frame-Options`.                                                                              | Batasi pengecualian ke atribut style Vue untuk posisi kalender; blok inline script/event handler, objek dan framing. Uji browser produksi. |
| SEC-03 | P0             | Query dibatasi tanggal/mentor tetapi belum ada batas panjang request dan parameter kosong bisa memakai default. URI rusak berakhir sebagai 500 generik.                                         | Batas URL/query, penolakan input ambigu/duplikat/rusak dengan 400/414, tanpa mengubah kontrak valid.                                       |
| SEC-04 | P0             | `npm audit` baseline melaporkan advisori dependency. Sebagian rantai berasal dari alat testing (`@vue/test-utils` → formatter/glob/minimatch), bukan kode server produksi.                      | Review advisory dan pilih versi kompatibel, hindari `audit fix --force`; catat hasil audit setelah perubahan.                              |
| SEC-05 | P1             | Belum ada CI yang menjalankan install lockfile, unit/component tests, build, browser tests dan gate artefak.                                                                                    | Tambah workflow dengan akses read-only, actions dipin SHA, tanpa deploy atau secret produksi.                                              |
| SEC-06 | P1             | Belum ada kebijakan tautan CV. `VITE_SITE_URL` memakai regex terpisah di frontend/build/server.                                                                                                 | Satu validator URL, HTTPS tanpa credentials, PDF lokal dari direktori CV, approval publikasi, `noopener noreferrer`, uji skema berbahaya.  |
| SEC-07 | P0 operasional | 2FA, ruleset, WAF, akses preview, secret manager, OAuth live, DNS, backup dan rollback live tidak dapat dibuktikan dari repository.                                                             | NOT VERIFIED; tindakan manual pemilik, tidak ada perubahan dashboard/deploy/rotasi tanpa instruksi.                                        |

## Status setelah perubahan dan bukti uji

| ID     | Status                            | Perubahan / bukti                                                                                                                                                                                                                                                                                                                                              |
| ------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 | PASS lokal                        | Ignore diperluas; `security:check` menolak artefak privat, backup, map, SVG aktif dan pola credential. Static server menolak dotfile/extension internal, membatasi PDF ke `/cv/`, serta memastikan realpath tetap di dalam dist. Gate artefak dan uji negatif server lulus. Tidak ada nilai secret dicetak.                                                    |
| SEC-02 | PASS lokal                        | `api/securityHeaders.ts` menambah object/frame/script-attribute restrictions dan `X-Frame-Options: DENY`. `style-src-attr 'unsafe-inline'` dipertahankan khusus positioning Vue; inline style elements/scripts tidak diizinkan. Header teruji pada HTML, aset, error dan API; modal/jadwal produksi tidak menghasilkan error CSP.                              |
| SEC-03 | PASS lokal                        | URL dibatasi 2048 karakter, query kalender 256 karakter; mentor kosong/duplikat/unknown/tanggal invalid ditolak. URI rusak menghasilkan 400 aman. Metode dan endpoint tetap read-only.                                                                                                                                                                         |
| SEC-04 | PASS saat audit                   | `npm audit` awal: 6 advisori (5 moderate, 1 high), termasuk sharp dan rantai formatter testing. Sesudah patch: **0 advisori**, termasuk dependency dev. Sharp 0.35.5, test-utils 2.4.6 dipin; override hanya rantai js-beautify: glob 14.0.2 dan editorconfig→minimatch 11.0.1. Formatter CLI dan render SVG/PNG diuji. Tidak menjalankan `audit fix --force`. |
| SEC-05 | PASS source / NOT VERIFIED remote | Workflow CI dan Dependabot ditambahkan, read-only permissions, actions dipin SHA, tidak ada deploy. Seluruh perintah pemeriksaan diuji lokal; workflow di GitHub/ruleset belum dijalankan atau diaktifkan.                                                                                                                                                     |
| SEC-06 | PASS lokal                        | Validator HTTPS bersama frontend/build/server, URL CV HTTPS tanpa credentials atau `/cv/*.pdf`, approval CV terpisah, link tab baru `noopener noreferrer`. Tes memverifikasi CV valid, URL berbahaya ditolak dan HTML biodata tetap teks.                                                                                                                      |
| SEC-07 | NOT VERIFIED                      | Pengaturan akun, hosting/DNS, Google live, WAF dan rollback produksi tetap tindakan pemilik. Tidak ada perubahan akun, deployment atau rotasi token.                                                                                                                                                                                                           |

Hasil lokal: **228 unit/component tests PASS**, **16 browser tests PASS**, build produksi dan TypeScript PASS, `npm run security:check` PASS, `npm audit` **0 advisori** pada 16 November 2026. Uji browser menggunakan Chrome lokal; lebar 360/390/768/1024/1440 px, kelima route + 404, profil mentor desktop/mobile, focus restore, CV placeholder, jadwal terfilter, serta CSP produksi lulus. Audit WCAG otomatis pada kelima route dan modal mentor tidak menemukan pelanggaran dalam cakupan tag yang diperiksa; ini bukan sertifikasi penuh.

### Status acceptance criteria dokumen hardening

| Kriteria                                                                          | Status dan cakupan                                                                                                                                                                  |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Route/refresh/interaksi desktop-mobile                                        | PASS lokal; lima route, 404 dan direct refresh diuji.                                                                                                                               |
| A — XSS/tautan keluar                                                             | PASS lokal; payload HTML hanya menjadi teks, URL javascript/data/http/credentials ditolak, CV valid dan rel tab baru diuji.                                                         |
| A — Headers/CSP                                                                   | PASS Node lokal untuk HTML/aset/API/error; NOT VERIFIED pada edge/hosting yang belum dipilih. Style attrs kalender tetap diizinkan.                                                 |
| A — Mixed content/secret di browser                                               | PASS pada artefak dan sumber lokal yang diperiksa; font/aset self-hosted, bukan hotlink font referensi. Riwayat Git lengkap, log provider dan trafik domain produksi: NOT VERIFIED. |
| B — Validasi/method/API unknown                                                   | PASS pada unit dan server HTTP lokal. Tidak ada endpoint write Google.                                                                                                              |
| B — Sanitasi/filter/empty/partial/stale/cache/rate/recurring/canceled/overlap/WIB | PASS dengan provider fixture terkontrol; Google Calendar nyata: NOT VERIFIED.                                                                                                       |
| C — Akun/deploy/2FA/Access/ruleset/WAF/rollback/monitoring                        | NOT VERIFIED; langkah manual di bawah.                                                                                                                                              |
| D — Audit/perubahan/perintah dan keterbatasan                                     | PASS dokumen/source lokal; tidak ada klaim dashboard sudah dikonfigurasi.                                                                                                           |

### File yang diubah dan alasan

- `api/server.ts`, `api/staticPolicy.ts`, `api/securityHeaders.ts`: response policy, path/realpath safety, header dan error URL yang aman. `api/publicSchedule.ts`: batas input dan nilai kosong.
- `src/utils/urls.ts`, `src/content/brand.ts`, `scripts/create-seo.ts`: satu validasi URL publik; `src/utils/mentorProfile.ts`: CV yang disetujui dan aman.
- `.gitignore`, `scripts/check-security.ts`, `package.json`, lockfile: pencegahan artefak privat, gate pemeriksaan dan patch dependency.
- `.github/workflows/ci.yml`, `.github/dependabot.yml`: pipeline pemeriksaan dan jadwal dependency review; belum merupakan proteksi branch aktif.
- `tests/security.test.ts`, `tests/mentorProfile.test.ts`, `tests/api.test.ts`, `tests/e2e/site.spec.ts`: regresi URL/XSS/CV/artefak/header/API dan interaksi profil.
- Dokumen hardening, README, status implementasi: kontrak sebenarnya, temuan dan tindakan manual. File UI/tipografi serta data mentor berubah sesuai permintaan desain/profil pengguna; tidak mengubah arsitektur kalender atau rumus harga.

### Risiko regresi dan pemulihan

Teks lebih besar meningkatkan tinggi halaman dan lebar area tabel/kalender yang dapat digeser; uji viewport dan keyboard lulus. CSP melarang third-party embed/script/style baru tanpa review; CV berupa tautan keluar tidak memerlukan embed. Pembatasan file akan menolak file publik baru di luar policy; tambahkan tipe/rute secara eksplisit setelah ditinjau. Override formatter berada di dependency development dan perlu ditinjau ulang saat upstream diperbarui.

Untuk rollback lokal, kembalikan source dan lockfile dari commit tepercaya pada branch kerja, jalankan `npm ci`, build, unit/browser tests dan gate sebelum mengganti artefak. Jangan rollback hanya lockfile atau menyalin frontend baru dengan backend lama. Untuk hosting, gunakan deployment aman yang dicatat pemilik lalu verifikasi route/API/header; prosedur rollback live belum dijalankan.

## Tindakan manual pemilik

1. Verifikasi 2FA/passkey GitHub, penyedia hosting, akun Google admin, registrar, dan email pemulihan.
2. Jika GitHub digunakan: pasang ruleset pada branch produksi, larang force push/deletion, jadikan CI check wajib, review collaborator; aktifkan alerts dan push protection yang tersedia pada paket akun.
3. Pilih dan verifikasi hosting aktual. Jika Cloudflare digunakan kelak, siapkan adapter sesuai platform; `_headers` tidak menggantikan header respons API Worker. Access preview hanya untuk staging; jangan menutup website produksi publik.
4. Pertahankan script dan daftar kalender yang sudah dipakai. Verifikasi akses baca serta label kalender yang ingin ditampilkan. Website mengikuti JSON yang ada; jika menambah mentor tanpa sesi, namanya baru dapat dikenali setelah muncul pada schedules.
5. HTTPS, domain/DNS/registrar lock, WAF/rate limit pada hostname sebenarnya, monitoring uptime/sync/deployment/DNS dan Search Console: NOT VERIFIED.
6. Tentukan commit/deployment aman, backup konfigurasi nonrahasia dan akses secret manager. Latihan rollback di staging, lakukan smoke test, lalu catat hasil. Runbook insiden ada di `SECURITY_HARDENING.md`; tidak ada rollback/rotasi/deploy yang dilakukan pada audit ini.

## Referensi pemeriksaan

- [Apps Script web apps](https://developers.google.com/apps-script/guides/web): doGet, deployment dan identitas eksekusi.
- [ContentService redirects](https://developers.google.com/apps-script/guides/content#redirects): redirect satu kali pakai untuk respons data.
- [CSP style-src-attr](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-attr): atribut posisi kalender dinamis memerlukan kebijakan yang berbeda dari elemen style.
- [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use): least privilege dan pin action ke commit.
- [Glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4): salah satu advisory pada rantai alat development baseline.
