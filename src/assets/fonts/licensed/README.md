# Font persis referensi

Referensi MPL memakai **Origin Super Condensed** (heading) dan **Astoria** (body). Keduanya font komersial; file dari repo referensi tidak disalin. Font fallback yang disertakan: League Gothic dan Lato, berlisensi SIL OFL.

Jika VGA Class sudah memiliki **lisensi webfont yang mengizinkan self-hosting pada domain VGA Class**, tempatkan WOFF2 resmi di direktori ini:

- `OriginSuperCondensed-Regular.woff2`
- `OriginSuperCondensed-Bold.woff2`
- `AstoriaRoman.woff2`
- `AstoriaMedium.woff2`

Restart Vite atau build ulang. Loader mendeteksi file yang ada dan mendaftarkan family/weight yang tepat; tidak ada request 404 jika file belum tersedia. File berlisensi ini diabaikan Git agar tidak terdistribusi sebagai source tanpa izin. Hosting build akan tetap menyajikan font kepada pengunjung sebagaimana mekanisme webfont; pastikan lisensinya sesuai.

Lisensi desktop saja atau keberadaan file di GitHub bukan bukti hak self-hosting. Bila menggunakan lisensi Adobe Web Project, integrasikan proyek web berizin dan tinjau CSP secara terpisah; jangan mengekstrak file dari Adobe/repo lain.
