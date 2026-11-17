/**
 * VGA CLASS - GOOGLE CALENDAR API
 * Backend penghubung Google Calendar dengan Cloudflare Pages.
 *
 * Fitur:
 * 1. Membaca beberapa kalender mentor.
 * 2. Mengambil nama mentor otomatis dari nama kalender.
 * 3. Mengambil jadwal berdasarkan rentang tanggal.
 * 4. Menyembunyikan judul, deskripsi, lokasi, dan peserta acara.
 * 5. Menggunakan token rahasia untuk autentikasi.
 * 6. Mengurutkan jadwal berdasarkan waktu.
 */

const CONFIG = {
  TIMEZONE: "Asia/Jakarta",

  // Masukkan Calendar ID masing-masing mentor.
  // Nama mentor tidak perlu ditulis karena diambil otomatis.
  CALENDAR_IDS: [
    // Calendar ID tetap di project Google; pertahankan daftar yang sudah Anda pakai.
  ],

  // Maksimal rentang tanggal yang boleh diminta.
  MAX_RANGE_DAYS: 31,
};

/**
 * Endpoint utama.
 * Dipanggil oleh Cloudflare Pages Functions menggunakan POST.
 */
function doPost(e) {
  try {
    // 1. Pastikan request memiliki body.
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({
        success: false,
        message: "Request body is required",
      });
    }

    const body = JSON.parse(e.postData.contents);

    // 2. Validasi token rahasia.
    const savedToken =
      PropertiesService.getScriptProperties().getProperty("API_SECRET");

    if (!savedToken || body.token !== savedToken) {
      return jsonResponse({
        success: false,
        message: "Unauthorized",
      });
    }

    // 3. Validasi tanggal.
    const start = new Date(body.start);
    const end = new Date(body.end);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return jsonResponse({
        success: false,
        message: "Invalid date range",
      });
    }

    const rangeDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    if (rangeDays > CONFIG.MAX_RANGE_DAYS) {
      return jsonResponse({
        success: false,
        message: "Date range exceeds maximum limit",
      });
    }

    // 4. Persiapkan hasil.
    const schedules = [];
    const warnings = [];

    // 5. Baca seluruh kalender mentor.
    CONFIG.CALENDAR_IDS.forEach(function (calendarId) {
      try {
        const calendar = CalendarApp.getCalendarById(calendarId);

        if (!calendar) {
          warnings.push("A calendar could not be accessed");
          return;
        }

        // Nama mentor otomatis mengikuti nama kalender.
        const mentorName = calendar.getName();

        // Ambil acara pada rentang tanggal yang diminta.
        const events = calendar.getEvents(start, end);

        events.forEach(function (event) {
          schedules.push({
            mentor: mentorName,

            // Jangan tampilkan judul acara asli.
            title: "Sesi belajar",

            start: event.getStartTime().toISOString(),
            end: event.getEndTime().toISOString(),

            allDay: event.isAllDayEvent(),
          });
        });
      } catch (calendarError) {
        console.warn("Calendar read error");
        warnings.push("One calendar could not be processed");
      }
    });

    // 6. Urutkan jadwal dari waktu paling awal.
    schedules.sort(function (a, b) {
      return new Date(a.start) - new Date(b.start);
    });

    // 7. Kirim hasil.
    return jsonResponse({
      success: true,
      timezone: CONFIG.TIMEZONE,
      count: schedules.length,
      schedules: schedules,
      warnings: warnings,
    });
  } catch (error) {
    console.warn("Schedule request failed");

    return jsonResponse({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Format response JSON.
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
