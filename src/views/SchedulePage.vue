<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Info,
  Clock3,
  AlertCircle,
} from "lucide-vue-next";
import { brand } from "../content/brand";
import { activeMentors } from "../content/mentors";
import { useSchedule } from "../composables/useSchedule";
import type { DemoScenario } from "../services/publicSchedule";
import {
  addDays,
  formatDay,
  formatUpdated,
  formatWeek,
  localDate,
  minuteLabel,
  startOfWeek,
} from "../utils/dateTime";
import {
  getFreeIntervals,
  hasFreshSync,
  hasFreshSchedule,
} from "../utils/intervals";
import {
  isScheduleMentorId,
  scheduleMentorMarker,
} from "../utils/scheduleMentors";
import WeekGrid from "../components/schedule/WeekGrid.vue";
import WhatsAppCTA from "../components/shared/WhatsAppCTA.vue";
const thisWeek = startOfWeek(localDate());
const route = useRoute();
const requestedMentor = () =>
  typeof route.query.mentor === "string" &&
  isScheduleMentorId(route.query.mentor)
    ? (route.query.mentor as string)
    : "all";
const week = ref(thisWeek),
  mentor = ref(requestedMentor()),
  selectedDay = ref(localDate()),
  scenario = ref<DemoScenario>("success");
watch(
  () => route.query.mentor,
  () => {
    mentor.value = requestedMentor();
  },
);
const { data, loading, error, now, reload } = useSchedule(week, scenario);
const calendarMentors = computed(() =>
  data.value?.source === "apps-script"
    ? data.value.mentors.map((mentor) => ({
        id: mentor.mentorId,
        name: mentor.mentorDisplayName ?? "Mentor",
        marker: scheduleMentorMarker(mentor.mentorId),
      }))
    : brand.demo
      ? activeMentors
      : activeMentors.filter(
          (mentor) => mentor.publicationApproved && !mentor.demo,
        ),
);
watch([calendarMentors, loading], ([mentors, busy]) => {
  if (
    !busy &&
    mentor.value !== "all" &&
    !mentors.some((item) => item.id === mentor.value)
  )
    mentor.value = "all";
});
const visibleMentors = computed(() =>
  calendarMentors.value.filter(
    (m) => mentor.value === "all" || m.id === mentor.value,
  ),
);
const visibleEvents = computed(() =>
  (data.value?.events ?? []).filter(
    (e) => mentor.value === "all" || e.mentorId === mentor.value,
  ),
);
const syncs = computed(() =>
  (data.value?.mentors ?? []).filter(
    (m) => mentor.value === "all" || m.mentorId === mentor.value,
  ),
);
const unhealthy = computed(
  () =>
    !loading.value &&
    (error.value ||
      (data.value?.source === "apps-script"
        ? !hasFreshSchedule(data.value, now.value) || data.value.partial
        : syncs.value.some((m) => !hasFreshSync(m, now.value)))),
);
const lastUpdated = computed(
  () =>
    data.value?.updatedAt ??
    syncs.value
      .map((s) => s.updatedAt)
      .filter((v): v is string => !!v)
      .sort()
      .at(0),
);
const staleMentorIds = computed(() =>
  syncs.value.filter((s) => !hasFreshSync(s, now.value)).map((s) => s.mentorId),
);
const days = computed(() =>
  Array.from({ length: 7 }, (_, i) => addDays(week.value, i)),
);
watch(week, () => (selectedDay.value = week.value));
function freeFor(id: string) {
  return getFreeIntervals(
    data.value?.events ?? [],
    selectedDay.value,
    syncs.value.find((s) => s.mentorId === id),
    now.value,
  );
}
const earliest = addDays(thisWeek, -84),
  latest = addDays(thisWeek, 84);
</script>
<template>
  <div class="container">
    <header class="page-heading">
      <span class="eyebrow"
        ><RouterLink to="/">Home</RouterLink> / Schedule</span
      >
      <h1>TEMUKAN WAKTU.<br />LANJUTKAN LANGKAHMU.</h1>
      <p>
        Cek jadwal mengajar mentor VGA Class pada minggu pilihanmu. Gunakan
        filter untuk melihat mentor tertentu. Jam kosong selama operasional
        merupakan waktu yang dapat diajukan, tetapi jadwal dan penempatan mentor
        baru resmi setelah konfirmasi admin melalui WhatsApp.
      </p>
    </header>
    <div v-if="brand.demo" class="notice demo-notice">
      <Info :size="18" aria-hidden="true" />
      <div>
        <p>
          <strong>Data contoh — bukan jadwal nyata.</strong> Kalender ini
          memperagakan sesi 90/120 menit, sesi bersamaan, dan blok waktu mentor.
        </p>
        <label for="demo-scenario"
          >Skenario data contoh<select id="demo-scenario" v-model="scenario">
            <option value="success">Sumber berhasil diperbarui</option>
            <option value="empty">Tidak ada sesi tercatat</option>
            <option value="partial">Satu mentor gagal diperbarui</option>
            <option value="stale">Data kedaluwarsa</option>
            <option value="error">Semua sumber gagal</option>
          </select></label
        >
      </div>
    </div>
    <section class="calendar-section" aria-label="Jadwal mentor mingguan">
      <div class="calendar-toolbar">
        <div class="week-navigation">
          <button
            type="button"
            class="icon-button"
            aria-label="Minggu sebelumnya"
            :disabled="week <= earliest"
            @click="week = addDays(week, -7)"
          >
            <ArrowLeft :size="17" /></button
          ><button
            type="button"
            class="icon-button"
            aria-label="Minggu berikutnya"
            :disabled="week >= latest"
            @click="week = addDays(week, 7)"
          >
            <ArrowRight :size="17" />
          </button>
          <h2 aria-live="polite">{{ formatWeek(week) }}</h2>
        </div>
        <div class="calendar-actions">
          <button
            type="button"
            class="today-button"
            :disabled="week === thisWeek"
            @click="week = thisWeek"
          >
            Minggu ini</button
          ><button
            type="button"
            class="icon-button"
            aria-label="Perbarui jadwal"
            :disabled="loading"
            @click="reload"
          >
            <RefreshCw :size="15" :class="{ spinning: loading }" />
          </button>
        </div>
      </div>
      <div class="mentor-filter" role="group" aria-label="Filter mentor">
        <button
          type="button"
          :aria-pressed="mentor === 'all'"
          @click="mentor = 'all'"
        >
          Semua mentor</button
        ><button
          v-for="m in calendarMentors"
          :key="m.id"
          type="button"
          :class="m.marker"
          :aria-pressed="mentor === m.id"
          @click="mentor = m.id"
        >
          <span class="mentor-dot" aria-hidden="true" />{{ m.name }}
        </button>
      </div>
      <div class="calendar-status" aria-live="polite">
        <span
          ><Clock3 :size="13" aria-hidden="true" />Setiap hari · 07.00–21.00
          WIB</span
        ><span
          >{{
            loading
              ? "Memuat jadwal…"
              : lastUpdated
                ? `Terakhir diperbarui: ${formatUpdated(lastUpdated)}`
                : "Belum ada pembaruan valid"
          }}{{ data?.demo ? " · Demo" : "" }}</span
        >
      </div>
      <div v-if="loading" class="calendar-loading" role="status">
        <span class="sr-only">Memuat jadwal mingguan</span>
        <div v-for="i in 7" :key="i" class="skeleton" />
      </div>
      <template v-else
        ><div v-if="unhealthy" class="notice error-notice" role="status">
          <AlertCircle :size="18" aria-hidden="true" />
          <p>
            <template v-if="data?.partial"
              ><strong>Sebagian jadwal belum lengkap.</strong> Jadwal yang
              berhasil dibaca tetap ditampilkan. Ketersediaan perlu dikonfirmasi
              ke admin.</template
            >
            <template v-else
              ><strong>Data belum dapat diperbarui.</strong> Status mentor yang
              gagal atau kedaluwarsa <strong>belum diketahui</strong>. Rentang
              kosongnya belum dapat dinyatakan tersedia.</template
            >
          </p>
          <button type="button" class="retry-button" @click="reload">
            Coba lagi
          </button>
        </div>
        <WeekGrid
          :week-start="week"
          :events="visibleEvents"
          :stale-mentor-ids="staleMentorIds"
      /></template>
      <p class="calendar-hint">
        Geser kalender untuk melihat seluruh hari dan jam. Blok berwarna
        menunjukkan waktu terisi; nama mentor tetap tercantum pada setiap blok.
      </p>
    </section>
    <section class="availability-section" aria-labelledby="availability-title">
      <div class="availability-heading">
        <div>
          <span class="eyebrow">{{
            brand.demo
              ? "Simulasi ketersediaan"
              : "Berdasarkan jadwal tersinkron"
          }}</span>
          <h2 id="availability-title">RENTANG YANG DAPAT DIAJUKAN</h2>
        </div>
        <label for="availability-day"
          >Hari<select id="availability-day" v-model="selectedDay">
            <option v-for="day in days" :key="day" :value="day">
              {{
                formatDay(day, {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })
              }}
            </option>
          </select></label
        >
      </div>
      <div class="availability-list" aria-live="polite">
        <p v-if="!loading && !visibleMentors.length" class="muted">
          {{
            unhealthy
              ? "Status jadwal mentor belum diketahui. Coba perbarui jadwal atau hubungi admin."
              : "Belum ada mentor dengan jadwal tercatat pada minggu ini. Hubungi admin untuk informasi ketersediaan."
          }}
        </p>
        <div
          v-for="m in visibleMentors"
          :key="m.id"
          class="availability-row"
          :class="m.marker"
        >
          <span class="availability-mentor"
            ><span class="mentor-dot" aria-hidden="true" />{{ m.name
            }}<small v-if="brand.demo">Demo</small></span
          ><span v-if="loading" class="muted">Memuat…</span
          ><span v-else-if="freeFor(m.id) === null" class="unknown-status"
            >Status belum diketahui</span
          ><span v-else-if="!freeFor(m.id)?.length" class="muted"
            >Terisi / tidak tersedia sepanjang operasional</span
          >
          <div v-else class="free-intervals">
            <span v-for="interval in freeFor(m.id)" :key="interval.start"
              >{{ minuteLabel(interval.start) }}–{{
                minuteLabel(interval.end)
              }}</span
            ><small
              >{{ brand.demo ? "Simulasi: " : "" }}Tersedia untuk
              diajukan</small
            >
          </div>
        </div>
      </div>
      <div class="availability-note">
        <Info :size="16" aria-hidden="true" />
        <p>
          Sesi baru harus selesai maksimal <strong>21.00 WIB</strong>. Durasi 90
          menit paling lambat mulai <strong>19.30</strong>; 120 menit paling
          lambat <strong>19.00</strong>, selama rentangnya tidak terisi. Di luar
          07.00–21.00: <strong>tidak tersedia</strong>. Rentang pendek belum
          tentu cukup untuk satu sesi. Persetujuan akhir tetap melalui admin.
        </p>
      </div>
      <WhatsAppCTA />
    </section>
  </div>
</template>
<style scoped>
.demo-notice {
  margin-bottom: 32px;
}
.demo-notice > div {
  flex: 1;
}
.demo-notice label {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 14px;
  font-size: 14px;
}
select {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 2px;
  color: var(--color-ink);
  padding: 8px 12px;
  font-size: 15px;
  max-width: 100%;
}
.calendar-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}
.week-navigation {
  display: flex;
  align-items: center;
  gap: 8px;
}
.week-navigation h2 {
  font-size: 30px;
  margin-left: 12px;
  font-weight: 600;
}
.calendar-actions {
  display: flex;
  gap: 10px;
}
.today-button {
  padding: 8px 15px;
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  font-size: 15px;
}
.today-button:disabled,
.icon-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.mentor-filter {
  display: flex;
  gap: 8px;
  margin-top: 24px;
  flex-wrap: wrap;
}
.mentor-filter button {
  display: flex;
  align-items: center;
  gap: 7px;
  background: var(--color-surface);
  padding: 8px 12px;
  border: 1px solid var(--color-line);
  font-size: 14px;
}
.mentor-filter button[aria-pressed="true"] {
  background: var(--color-brand);
  border-color: var(--color-brand);
  color: var(--color-surface);
}
.mentor-dot {
  display: inline-block;
  height: 7px;
  width: 7px;
  background: var(--mentor-color);
  border-radius: 50%;
}
.mentor-filter button[aria-pressed="true"] .mentor-dot {
  outline: 1px solid var(--color-surface);
}
.calendar-status {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 14px;
  color: var(--color-muted);
  margin-block: 20px 14px;
}
.calendar-status > span:first-child {
  display: flex;
  align-items: center;
  gap: 7px;
}
.calendar-hint {
  margin-top: 12px;
  font-size: 14px;
  color: var(--color-muted);
}
.calendar-loading {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  height: 520px;
  gap: 3px;
  border: 1px solid var(--color-line);
}
.calendar-loading .skeleton {
  height: 100%;
}
.error-notice {
  background: var(--color-error-soft);
  border-color: var(--color-error);
  color: var(--color-error);
  margin-bottom: 16px;
}
.error-notice p {
  max-width: none;
}
.retry-button {
  margin-left: auto;
  padding: 6px 12px;
  border: 1px solid currentColor;
  background: transparent;
  white-space: nowrap;
  font-size: 14px;
}
.availability-section {
  margin-top: 44px;
  padding: 32px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
}
.availability-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin-bottom: 24px;
}
.availability-heading .eyebrow {
  font-size: 14px;
}
.availability-heading h2 {
  font-size: 31px;
  color: var(--color-brand);
  margin-top: 12px;
}
.availability-heading label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}
.availability-row {
  display: flex;
  gap: 24px;
  align-items: baseline;
  padding-block: 16px;
  border-top: 1px solid var(--color-line);
  font-size: 15px;
}
.availability-mentor {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 140px;
  font-weight: 600;
}
.availability-mentor small {
  color: var(--color-muted);
  font-size: 14px;
  font-weight: 400;
}
.unknown-status {
  color: var(--color-error);
}
.free-intervals {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.free-intervals > span {
  background: var(--color-success-soft);
  color: var(--color-success);
  padding: 3px 8px;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.free-intervals small {
  font-size: 14px;
  color: var(--color-muted);
}
.availability-note {
  margin-block: 20px 24px;
  display: flex;
  gap: 10px;
  color: var(--color-muted);
  font-size: 14px;
}
.availability-note svg {
  margin-top: 2px;
}
.availability-note p {
  max-width: none;
}
.spinning {
  animation: rotate 1s linear infinite;
}
@keyframes rotate {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 767px) {
  .calendar-toolbar {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }
  .week-navigation h2 {
    font-size: 25px;
    margin-left: 6px;
  }
  .calendar-actions {
    align-self: flex-end;
  }
  .demo-notice label {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
  .availability-section {
    padding: 24px 18px;
  }
  .availability-heading {
    align-items: flex-start;
    flex-direction: column;
  }
  .availability-row {
    flex-direction: column;
    gap: 10px;
  }
  .availability-heading h2 {
    font-size: 27px;
  }
  .error-notice {
    flex-wrap: wrap;
  }
  .error-notice p {
    flex: 1;
  }
  .retry-button {
    margin-left: 30px;
  }
}
</style>
