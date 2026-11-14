<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowUpRight, CalendarDays } from "lucide-vue-next";
import { useSchedule } from "../../composables/useSchedule";
import {
  startOfWeek,
  localDate,
  formatDay,
  formatTime,
} from "../../utils/dateTime";
import { hasFreshSync } from "../../utils/intervals";
const week = ref(startOfWeek(localDate()));
const { data, loading, error, now, reload } = useSchedule(week);
const preview = computed(
  () =>
    data.value?.events
      .filter((event) =>
        hasFreshSync(
          data.value?.mentors.find((m) => m.mentorId === event.mentorId),
          now.value,
        ),
      )
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
      .slice(0, 3) ?? [],
);
const healthy = computed(() =>
  data.value?.mentors.some((m) => hasFreshSync(m, now.value)),
);
</script>
<template>
  <div class="schedule-preview">
    <div class="schedule-preview-copy">
      <span class="eyebrow">Waktu untuk bertumbuh</span>
      <h2>KETEMU DI<br />JADWALMU.</h2>
      <p>
        Cari gambaran waktu belajar yang pas. Jadwal final dan penempatan mentor
        dikonfirmasi bersama admin.
      </p>
      <RouterLink to="/schedule" class="text-link"
        >Jelajahi jadwal mingguan<ArrowUpRight :size="16" aria-hidden="true"
      /></RouterLink>
    </div>
    <div class="schedule-preview-list" aria-live="polite">
      <div class="preview-list-heading">
        <span
          ><CalendarDays :size="16" aria-hidden="true" />Cuplikan minggu
          ini</span
        ><span v-if="data?.demo" class="badge">Data contoh</span>
      </div>
      <div
        v-if="loading"
        class="skeleton"
        role="status"
        aria-label="Memuat jadwal"
      />
      <div v-else-if="error || !healthy" class="preview-message">
        <p>
          Status jadwal belum diketahui. Hubungi admin untuk informasi terbaru.
        </p>
        <button class="text-link" type="button" @click="reload">
          Coba lagi ↗
        </button>
      </div>
      <template v-else
        ><div
          v-for="event in preview"
          :key="`${event.mentorId}-${event.start}`"
          class="preview-session"
        >
          <div class="preview-day">
            <strong>{{
              formatDay(localDate(event.start), { day: "2-digit" })
            }}</strong
            ><span>{{
              formatDay(localDate(event.start), {
                weekday: "short",
                month: "short",
              })
            }}</span>
          </div>
          <div class="preview-event">
            <strong>{{ event.course || event.publicLabel }}</strong
            ><span
              >{{ event.mentorDisplayName }} · {{ formatTime(event.start) }}–{{
                formatTime(event.end)
              }}
              WIB</span
            >
          </div>
          <span class="preview-mode">{{ event.mode || "Terblokir" }}</span>
        </div>
        <p v-if="!preview.length" class="preview-message">
          Tidak ada sesi tercatat pada minggu ini. Rentang yang dapat diajukan
          dapat dilihat pada jadwal lengkap.
        </p></template
      >
      <p class="preview-disclaimer">
        {{
          data?.demo
            ? "Simulasi tampilan, bukan jadwal mengajar sebenarnya."
            : "Indikasi jadwal tersinkron; persetujuan akhir melalui admin."
        }}
      </p>
    </div>
  </div>
</template>
<style scoped>
.schedule-preview {
  display: grid;
  grid-template-columns: 1fr 1.1fr;
  gap: 70px;
  padding: 48px;
  background: var(--color-warm);
  border: 1px solid var(--color-line);
  position: relative;
}
.schedule-preview h2 {
  font-size: 58px;
  color: var(--color-brand);
  margin: 18px 0;
}
.schedule-preview-copy p {
  color: var(--color-muted);
  font-size: 13px;
  max-width: 330px;
  margin-bottom: 24px;
}
.schedule-preview-copy .eyebrow {
  font-size: 9px;
}
.schedule-preview-list {
  background: var(--color-paper);
  border: 1px solid var(--color-line);
}
.preview-list-heading {
  padding: 18px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--color-line);
}
.preview-list-heading > span:first-child {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
}
.preview-list-heading .badge {
  font-size: 8px;
}
.preview-session {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 18px;
  border-bottom: 1px solid var(--color-line);
}
.preview-day {
  text-align: center;
  width: 48px;
  flex-shrink: 0;
}
.preview-day strong {
  font-family: var(--font-heading);
  font-size: 31px;
  font-weight: 600;
  line-height: 1;
  display: block;
  color: var(--color-brand);
}
.preview-day span {
  display: block;
  font-size: 8px;
  color: var(--color-muted);
  margin-top: 4px;
}
.preview-event strong {
  display: block;
  font-size: 12px;
  font-weight: 500;
}
.preview-event span {
  display: block;
  font-size: 10px;
  color: var(--color-muted);
  margin-top: 3px;
}
.preview-mode {
  margin-left: auto;
  font-size: 9px;
  color: var(--color-muted);
  border: 1px solid var(--color-line);
  padding: 3px 7px;
}
.preview-disclaimer {
  padding: 12px 20px;
  font-size: 9px;
  color: var(--color-muted);
}
.preview-message {
  padding: 24px 20px;
  font-size: 13px;
}
.preview-message button {
  border: 0;
  background: transparent;
  padding: 0;
  margin-top: 12px;
}
@media (max-width: 1023px) {
  .schedule-preview {
    padding: 32px;
    gap: 32px;
  }
}
@media (max-width: 767px) {
  .schedule-preview {
    grid-template-columns: 1fr;
    padding: 24px 20px;
  }
  .schedule-preview h2 {
    font-size: 46px;
  }
  .preview-session {
    padding-inline: 12px;
    gap: 10px;
  }
  .preview-event span {
    font-size: 9px;
  }
  .preview-mode {
    font-size: 8px;
    padding-inline: 4px;
  }
}
</style>
