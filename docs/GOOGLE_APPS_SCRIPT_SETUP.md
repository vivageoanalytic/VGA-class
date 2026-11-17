# JSON Apps Script yang sudah dipakai

Website mengikuti format asli pemilik. Script Google yang sudah berjalan tidak perlu diubah atau diterbitkan ulang demi website.

Backend mengirim **POST** dengan JSON `token`, `start`, `end`. Token berasal dari `API_SECRET` server. Respons yang dibaca:

```json
{
  "success": true,
  "timezone": "Asia/Jakarta",
  "count": 1,
  "schedules": [
    {
      "mentor": "VGA Tutor",
      "title": "Sesi belajar",
      "start": "2026-11-17T02:00:00.000Z",
      "end": "2026-11-17T04:00:00.000Z",
      "allDay": false
    }
  ],
  "warnings": []
}
```

Tidak ada syarat versi, mentorId, daftar/status mentor, timestamp sumber atau echo rentang dari Apps Script. Website sendiri membuat ID stabil, waktu pembaruan dan model tampilan internal.

## Konfigurasi

```dotenv
VITE_SCHEDULE_DEMO=false
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/ISI_DEPLOYMENT_ID/exec
API_SECRET=ISI_SECRET_YANG_SAMA_DENGAN_SCRIPT_PROPERTY
```

URL dan secret yang sudah diisi pemilik tetap digunakan. `API_SECRET` harus sama dengan Script property Google. Jangan memakai awalan `VITE_` untuk token atau URL sumber. Calendar ID tetap berada di script Google. Tidak diperlukan mapping mentor baru atau credential OAuth manual.

Untuk lokal cukup jalankan `npm run dev`. Vite melayani frontend dan API dari origin yang sama, tanpa proses backend terpisah. `npm run preview` juga menyertakan API lokal. Restart setelah mengganti konfigurasi environment bila belum terbarui. Hosting memakai environment server yang sama, `npm run build`, kemudian `npm start` pada backend Node HTTP.

## Perilaku website

Backend membaca jendela 31 hari untuk mengenali nama mentor dari Apps Script, termasuk yang tidak punya sesi pada minggu pilihan. Jendela dimulai 12 hari sebelum Senin minggu tersebut dan berakhir 19 hari sesudahnya (eksklusif). Hanya event pada tujuh hari yang dipilih yang ditampilkan sebagai waktu terisi. Mentor yang sudah dikenali tetap terdaftar ketika tidak punya sesi; bila sinkronisasi berhasil, hari tanpa event tersedia untuk diajukan pada 07.00?21.00 WIB. Nama tidak diisi secara manual.

- Label dan filter mengikuti field `mentor`. ID internal stabil saat urutan event berubah. Kalender dengan label sama digabung sebagai satu kelompok; tidak ditebak menjadi Mentor 01–05.
- `start`, `end` dan `allDay` menjadi blok waktu. Acara seharian diberi label **Seharian**, interval di luar minggu diabaikan dan duplikat dihapus.
- Timestamp pembaruan berasal dari fetch website. `success: true` dengan jadwal kosong tetap merupakan pembacaan berhasil.
- Nama mentor yang sudah dikenali dipertahankan selama proses backend berjalan, termasuk pada minggu kosong. Kalender yang belum pernah muncul di `schedules` belum memberi identitas mentor untuk ditampilkan; website tidak mengarang namanya.
- Jika ada `warnings` atau baris rusak, sesi valid tetap tampil dengan penanda sebagian. Warning tidak mengidentifikasi kalender yang gagal, sehingga rentang kosong perlu konfirmasi admin.
- `success: false`, HTML, struktur rusak atau jaringan gagal memakai cache bertanda stale, atau error jika belum ada cache. Tidak ada fallback otomatis ke demo.
- Cache browser dan backend menggabungkan permintaan serta memakai ulang hasil saat berpindah halaman. Mode awal berlaku lima menit; mode notifikasi membatalkan cache saat kalender berubah dengan batas cadangan enam jam. Judul mentah/field tambahan serta token tidak dikirim ke browser. Pemasangan trigger opsional dijelaskan di [CALENDAR_CACHE.md](CALENDAR_CACHE.md); `doPost` dan bentuk JSON tidak diubah.

Token hanya dikirim pada POST awal. Hasil ContentService diambil melalui redirect GET tanpa token/body. [Redirect Google](https://developers.google.com/apps-script/guides/content#redirects). Membuka URL di browser menjalankan GET, bukan pengujian POST. [Metode web app Google](https://developers.google.com/apps-script/guides/web).

File `integrations/google-apps-script/Code.gs` adalah contoh lokal dengan bentuk respons asli pemilik; ID kalender privat dihilangkan dari repository. Pengguna tidak diwajibkan memasang ulang contoh ini pada deployment yang sudah berjalan.
