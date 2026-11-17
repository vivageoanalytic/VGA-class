# Menyambungkan Google Calendar VGA Class

Untuk integrasi **Apps Script** yang dipilih pemilik, gunakan [panduan Apps Script](GOOGLE_APPS_SCRIPT_SETUP.md) dan kode `integrations/google-apps-script/Code.gs`. Panduan di bawah merupakan alternatif OAuth langsung melalui Google Cloud Console.

Panduan ini sesuai backend read-only yang sudah ada. Belum ada project, credential, atau koneksi Google nyata yang dibuat/dikonfigurasi oleh aplikasi. Pemilik akun menyiapkan aksesnya di Google, lalu mengisi environment server.

Yang dibutuhkan: **Client ID**, **Client Secret**, **Refresh Token akun admin**, dan **Calendar ID setiap mentor**. OAuth memberikan izin kepada backend untuk membaca kalender yang memang dapat diakses akun admin. [Penjelasan OAuth Google](https://developers.google.com/identity/protocols/oauth2/web-server).

## 1. Siapkan kalender mentor

Gunakan kalender khusus jadwal mengajar untuk setiap mentor, terpisah dari kalender pribadi. Di Google Calendar desktop, buka **Settings and sharing → Shared with / Share with specific people → Add people and groups**, lalu bagikan kepada email akun admin dengan izin **See event details / See all event details** (lihat detail, tanpa izin mengubah). Admin menerima undangan dan menambahkan kalender tersebut ke akunnya. Kalender tidak perlu dijadikan publik. [Panduan berbagi kalender Google](https://support.google.com/calendar/answer/37082).

Di pengaturan kalender mentor, buka **Integrate calendar → Calendar ID**, lalu salin ID-nya. Ini bukan link Google Meet atau secret iCal address. Simpan kelima ID untuk mapping server `mentor-1` sampai `mentor-5` yang ada pada `src/content/mentors.ts`.

## 2. Buat project dan aktifkan Calendar API

Buka [Google Cloud Console](https://console.cloud.google.com/), pilih **New Project**, beri nama misalnya `VGA Class`, dan pilih project itu. Masuk **APIs & Services → Library**, cari **Google Calendar API**, lalu **Enable**. [Dokumentasi aktivasi Calendar API](https://developers.google.com/workspace/calendar/api/quickstart/nodejs#enable_the_api).

## 3. Atur Google Auth Platform

Masuk **Google Auth platform → Branding** dan isi nama aplikasi serta email dukungan/kontak. Untuk akun Gmail biasa, gunakan audience **External**; saat masih **Testing**, tambahkan **email akun admin** pada **Audience → Test users**. Pilihan **Internal** digunakan jika tersedia dan aplikasi memang hanya untuk organisasi Google Workspace itu. [Pengaturan consent dan audience](https://developers.google.com/workspace/guides/configure-oauth-consent).

Di **Data Access**, tambahkan hanya scope:

```text
https://www.googleapis.com/auth/calendar.events.readonly
```

Scope ini mengizinkan membaca event. Pengunjung website tidak perlu login Google; hanya akun admin yang melakukan persetujuan awal untuk backend. [Daftar scope Calendar resmi](https://developers.google.com/workspace/calendar/api/auth).

## 4. Buat OAuth Client ID

Di **Google Auth platform → Clients → Create client**, pilih **Web application**. Tambahkan Authorized redirect URI berikut, persis tanpa slash tambahan:

```text
https://developers.google.com/oauthplayground
```

Simpan **Client ID** dan **Client Secret** saat Google menampilkannya. Credential ini dipakai untuk proses setup melalui OAuth Playground; website ini tidak memiliki callback/login OAuth publik. [Credential web-server Google](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred).

## 5. Dapatkan refresh token

Buka [OAuth 2.0 Playground resmi Google](https://developers.google.com/oauthplayground/), kemudian:

1. Klik ikon roda gigi di kanan atas.
2. Pastikan OAuth endpoints **Google**, flow **Server-side**, Access type **Offline**, dan Force prompt **Consent Screen**.
3. Centang **Use your own OAuth credentials**, isi Client ID dan Client Secret dari project VGA Class.
4. Pada Step 1, isi scope `https://www.googleapis.com/auth/calendar.events.readonly`, lalu **Authorize APIs**.
5. Login memakai **akun admin yang sudah memiliki akses ke kelima kalender**, lalu setujui akses baca.
6. Pada Step 2, klik **Exchange authorization code for tokens**. Salin **Refresh token** ke penyimpanan lokal yang aman.

Gunakan credential milik project sendiri: Playground menjelaskan bahwa token yang memakai credential bawaan Playground dicabut otomatis setelah 24 jam. Jangan gunakan fitur share link yang menyertakan credential/token. [Petunjuk dan batasan Playground](https://developers.google.com/oauthplayground/).

Untuk audience **External + Testing**, refresh token yang mencakup scope Calendar kedaluwarsa setelah **7 hari**. Sebelum penggunaan jangka panjang, tinjau status publikasi dan persyaratan verifikasi Google yang berlaku pada aplikasi/akunmu, lalu lakukan otorisasi ulang jika diperlukan. Token juga dapat berhenti berlaku jika akses dicabut. [Aturan masa berlaku refresh token](https://developers.google.com/identity/protocols/oauth2#expiration).

## 6. Isi konfigurasi lokal

Jika `.env` belum ada, salin `.env.example` menjadi `.env`. Jika sudah ada, edit file yang ada; jangan menimpa credential lain.

Isi nilai asli pada variabel berikut. Nilai `ISI_...` di bawah hanya placeholder:

```dotenv
VITE_SCHEDULE_DEMO=false
GOOGLE_CLIENT_ID=ISI_CLIENT_ID
GOOGLE_CLIENT_SECRET=ISI_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN=ISI_REFRESH_TOKEN
GOOGLE_MENTOR_CALENDARS='{"mentor-1":"ISI_CALENDAR_ID_1","mentor-2":"ISI_CALENDAR_ID_2","mentor-3":"ISI_CALENDAR_ID_3","mentor-4":"ISI_CALENDAR_ID_4","mentor-5":"ISI_CALENDAR_ID_5"}'
```

Seluruh ID kalender dan credential Google menggunakan variabel server di atas, **tanpa awalan `VITE_`**. Simpan di `.env` lokal yang diabaikan Git, atau secret manager hosting. Jangan menaruhnya di `public/`, file source, screenshot, maupun chat. Nomor WhatsApp sudah diatur ke `6285142296149`; tidak perlu diganti untuk setup Google.

## 7. Jalankan dan cek koneksi

Terminal pertama:

```powershell
npm run dev:api
```

Terminal kedua:

```powershell
npm run dev
```

Jika dev server sudah berjalan ketika `.env` diubah, restart keduanya. Buka `/schedule`: label **Data contoh** tidak muncul setelah demo dimatikan. Setiap mentor yang tersambung memiliki timestamp pembaruan dan status ketersediaan yang dihitung dari kalender. Mentor yang gagal tetap **Status belum diketahui**; jangan menganggapnya bebas.

API proyek untuk pemeriksaan lokal:

```text
GET /api/public-schedule?weekStart=YYYY-MM-DD&mentorId=all
```

Gunakan tanggal minggu yang ingin dicek. Tidak ada endpoint publik untuk membuat atau mengubah event. Event tanpa metadata publik aman tampil dengan label generik. Untuk label mata kuliah/mode yang disetujui, lihat kontrak `extendedProperties.shared` pada README.

## Jika belum tersambung

| Gejala                            | Yang diperiksa                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `unconfigured`                    | Variabel Google kosong atau mentor belum memiliki mapping ID kalender.                                                                                 |
| `error` sesudah otorisasi         | API sudah diaktifkan, token diterbitkan dari Client ID/Secret yang sama, admin sudah menerima kalender, ID tepat, dan token belum kedaluwarsa/dicabut. |
| `redirect_uri_mismatch` di Google | Redirect URI client harus persis `https://developers.google.com/oauthplayground`.                                                                      |
| Akses testing ditolak             | Email admin masuk ke daftar Test users dan akun yang dipilih saat login benar.                                                                         |
| Tidak ada refresh token           | Access type Offline dan prompt Consent Screen pada Playground; ulangi otorisasi memakai client sendiri.                                                |
| Kalender kosong                   | Periksa minggu yang dipilih dan kalender sumber. Kalender kosong hanya menunjukkan ketersediaan jika sync berhasil.                                    |

Koneksi nyata dan kebijakan akun Google hanya dapat dibuktikan setelah konfigurasi pemilik tersedia; panduan ini tidak mengaktifkannya secara otomatis.
