# Cache jadwal dan notifikasi perubahan

Cache browser dan backend sudah tersedia. Format JSON serta `doPost` Apps Script yang sedang dipakai tetap sama.

## Cara kerja

- Beranda dan halaman jadwal berbagi cache di memori serta `sessionStorage`. Bolak-balik halaman atau memuat ulang tab selama cache berlaku tidak mengambil data sumber lagi. Request bersamaan untuk minggu yang sama digabung.
- Backend berbagi hasil pembacaan untuk semua pengunjung dalam satu proses. Mode awal `ttl` berlaku **5 menit**; ini tetap bekerja di localhost tanpa pemasangan trigger Google.
- Mode `changes` mempertahankan hasil sampai ada notifikasi perubahan kalender. Notifikasi membatalkan cache, lalu pembaca berikutnya mengambil hasil baru. Halaman yang sedang terbuka menerima pemberitahuan melalui SSE dan memperbarui jadwal.
- Mode `changes` memiliki batas cadangan **6 jam** jika notifikasi terlewat. Bila koneksi SSE terputus, browser memeriksa backend maksimal setiap menit; backend tetap memakai cache sumber yang sama.
- Tombol **Perbarui jadwal** memeriksa backend dengan melewati cache browser. Tombol ini tidak memaksa request Google untuk setiap klik.
- Pembacaan pertama, minggu yang belum tersimpan, restart backend, cache kedaluwarsa atau perubahan kalender tetap dapat memerlukan request Apps Script. Cache backend berada di memori, bukan penyimpanan permanen. Setiap instance backend mempunyai cache sendiri.

Data kosong dari sumber yang berhasil berarti mentor tersedia pada jam operasional. Kegagalan sinkronisasi tetap berstatus stale/error; cache tidak mengubahnya menjadi waktu bebas. Waktu pembaruan menunjukkan fetch sumber yang sebenarnya, bukan waktu membuka halaman.

## Mengaktifkan pembaruan ketika mentor mengubah kalender

Google perlu menghubungi **URL HTTPS publik** website. `localhost` tidak dapat menerima notifikasi dari Google. Selama hosting belum tersedia, biarkan `CALENDAR_CACHE_MODE=ttl`; cache 5 menit sudah mengurangi request.

1. Pastikan hosting menjalankan backend Node beserta endpoint `/api/calendar-changed` dan `/api/schedule-updates`. Hosting static saja tidak cukup. Proxy harus meneruskan Authorization dan SSE tanpa buffering. Gunakan satu instance backend, atau siapkan penyebaran notifikasi/cache bersama sebelum memakai beberapa instance.
2. Pada environment **server**, isi `CALENDAR_WEBHOOK_SECRET` dengan secret acak minimal 32 karakter. Nilai lokal sudah disiapkan di `.env` yang diabaikan Git; salin secara privat ke secret manager hosting. Ini secret terpisah dari `API_SECRET`. Jangan memberi awalan `VITE_`.
3. Di project Apps Script yang sudah berjalan, tambahkan file **`CalendarNotifications.gs`** dari [integrations/google-apps-script/CalendarNotifications.gs](../integrations/google-apps-script/CalendarNotifications.gs). Pertahankan `Code.gs`, deployment URL, dan respons JSON yang sudah dipakai.
4. Tambahkan Script properties:

   | Property             | Nilai                                         |
   | -------------------- | --------------------------------------------- |
   | `VGA_WEBHOOK_URL`    | `https://DOMAIN-WEBSITE/api/calendar-changed` |
   | `VGA_WEBHOOK_SECRET` | Sama dengan `CALENDAR_WEBHOOK_SECRET` server  |

   Installer menggunakan `CONFIG.CALENDAR_IDS` yang sudah ada. Jika konfigurasi script Anda memakai nama lain, isi property `VGA_NOTIFICATION_CALENDAR_IDS` dengan array JSON berisi ID kalender privat yang sama. Tidak perlu menuliskan nama mentor atau mengubah respons API.

5. Jika manifest `appsscript.json` membatasi scope secara eksplisit, **tambahkan** dua scope berikut ke daftar yang sudah ada:

   ```json
   [
     "https://www.googleapis.com/auth/script.scriptapp",
     "https://www.googleapis.com/auth/script.external_request"
   ]
   ```

   Pertahankan scope baca Calendar dan konfigurasi Advanced Calendar service/dependencies yang sudah dipakai untuk nama kalender. Jangan mengganti seluruh manifest Google dengan contoh lokal.

6. Simpan, pilih fungsi **`installVgaCalendarNotifications`**, lalu jalankan sebagai akun admin yang dapat membaca keempat kalender. Setujui izin tambahan untuk trigger dan pengiriman notifikasi. Fungsi ini memasang trigger per kalender dan satu trigger retry 5 menit; menjalankannya ulang tidak menggandakan trigger. Hasil `testDelivered: true` menunjukkan endpoint menerima notifikasi uji. Tidak perlu mengganti deployment web app untuk fungsi trigger ini; respons `doPost` tetap sama.
7. Setelah notifikasi uji berhasil, set environment server `CALENDAR_CACHE_MODE=changes` dan restart backend. Uji tambah, ubah jam, lalu hapus satu acara uji pada kalender mentor. Tunggu trigger Google berjalan; halaman jadwal yang terbuka harus mengikuti perubahan. Hapus acara uji setelah selesai.

Trigger Calendar berjalan saat acara dibuat, diubah atau dihapus. Pemberitahuan tidak berisi detail perubahan, sehingga backend membaca ulang rentang yang sedang dibutuhkan menggunakan API yang sudah ada. [Dokumentasi trigger Calendar Google](https://developers.google.com/apps-script/guides/triggers/events#google_calendar_events).

Callback mengirim hanya UUID perubahan dan bearer secret ke endpoint yang Anda tentukan. Tidak ada judul, peserta, Calendar ID, atau `API_SECRET` pada callback. Redirect tidak diikuti. Jika pengiriman gagal, retry 5 menit mengirim notifikasi yang tertunda; tanpa perubahan tertunda, retry tidak membuat request HTTP.

## Verifikasi dan batas saat ini

Tes mencakup cache saat navigasi, request paralel, kedaluwarsa, reload tab, notifikasi duplikat, autentikasi, perubahan ketika request masih berjalan, serta tambah/ubah/hapus jadwal melalui alur browser. Trigger dan callback diuji menggunakan fixture lokal. Pemasangan trigger pada akun Google serta penerimaan notifikasi di hosting publik belum diverifikasi.

Jika Google gagal menghubungi endpoint, periksa halaman Executions Apps Script, URL HTTPS, kesamaan secret dan routing backend. Gunakan URL final yang langsung menerima POST tanpa redirect. Untuk kembali ke cache 5 menit, set `CALENDAR_CACHE_MODE=ttl` dan restart backend; tidak perlu mengubah JSON Apps Script.
