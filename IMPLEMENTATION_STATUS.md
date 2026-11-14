# Status implementasi VGA Class

Implementasi lokal berdasarkan PRD v1. Dokumen spesifikasi asli tetap dipertahankan. Pekerjaan mencakup fondasi, seluruh halaman, pricing, kalender demo, adapter Google read-only, dan verifikasi lokal. Publikasi dan pembuktian koneksi Google asli belum dilakukan.

| Fase               | Status                                             | Bukti / batas                                                                                                                                  |
| ------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Fondasi        | Diimplementasikan                                  | Vue 3, TypeScript, Vite, Tailwind, Vue Router; 5 route + 404; konfigurasi dan aset demo                                                        |
| 1 — Layout         | Diimplementasikan                                  | Header sticky, navbar aktif/mobile, footer, tokens, keyboard dan reduced motion                                                                |
| 2 — Pricing        | Lulus unit test                                    | Seluruh 122 sel PRD, half-up, kapasitas dan non-ITS; satu engine                                                                               |
| 3 — Home           | Diimplementasikan                                  | Carousel desktop/mobile, swipe, kontrol/jeda, keunggulan, program/harga, jadwal, mentor, galeri, About, FAQ                                    |
| 4 — Programs       | Diimplementasikan                                  | Kedua program, 3 paket, tabel scroll, fasilitas bersyarat dan CTA nonaktif hingga nomor tersedia                                               |
| 5 — Mentor/Gallery | Diimplementasikan dengan placeholder               | Lima mentor demo, izin publikasi pada data, kategori, lightbox native dan Escape/arrow/focus restore                                           |
| 6 — Jadwal demo    | Diimplementasikan dan diuji                        | 7 hari, WIB, 07.00–21.00, overlap paralel, filter, minggu, empty/partial/stale/error, rentang pengajuan                                        |
| 7 — Google         | Adapter dan tes tersedia; integrasi nyata menunggu | OAuth read-only server, pagination, sanitasi, canceled, cache, timeout, rate limit; belum diuji ke 5 kalender berizin                          |
| 8 — QA/SEO         | Verifikasi lokal tersedia; rilis menunggu          | Metadata route, canonical bila domain diisi, OG, robots/sitemap, noindex prototipe, build dan uji browser lokal; belum ada deploy/domain resmi |

Verifikasi akhir lokal: **180 tes unit/komponen lulus**, **13 tes browser lulus**, dan **build produksi + pemeriksaan TypeScript lulus** melalui `npm test`, `npm run build`, `npm run test:e2e`. Browser test mencakup kelima route dan 404, menu/FAQ/carousel/swipe/reduced motion, pricing keyboard, lightbox, status kalender, API tanpa secrets, kegagalan API pada frontend produksi, serta layout 360/390/768/1024/1440 px. Audit otomatis WCAG 2 A/AA dan 2.1 AA pada kelima halaman tidak menemukan pelanggaran pada cakupan pemeriksaan tersebut; ini bukan sertifikasi aksesibilitas lengkap. Pemindaian bundle tidak menemukan nama secret Google atau nilai fixture rahasia.

Sebelum rilis: isi kontak dan konten resmi dengan persetujuan, validasi nominal akhir, hubungkan lima kalender, periksa respons API nyata, siapkan hosting HTTPS dan secret manager, lalu smoke test deployment. Jangan mengaktifkan indexing atau mengklaim fase integrasi/produksi selesai sebelum dependensi tersebut tersedia.
