<script setup lang="ts">
import { computed } from "vue";
import {
  addDays,
  formatDay,
  formatTime,
  localDate,
  minuteLabel,
  OPEN_MINUTE,
} from "../../utils/dateTime";
import { layoutDayEvents } from "../../utils/intervals";
import { activeMentors } from "../../content/mentors";
import type { PublicEvent } from "../../types/schedule";
const props = defineProps<{
  weekStart: string;
  events: PublicEvent[];
  staleMentorIds?: string[];
}>();
const days = computed(() =>
  Array.from({ length: 7 }, (_, i) => addDays(props.weekStart, i)),
);
const dayLayouts = computed(() =>
  days.value.map((day) => layoutDayEvents(props.events, day)),
);
const gridColumns = computed(
  () =>
    `64px ${dayLayouts.value.map((events) => `${Math.max(175, ...events.map((e) => e.columns * 95))}px`).join(" ")}`,
);
const hours = Array.from({ length: 15 }, (_, i) => i + 7);
const mentorClass = (id: string) =>
  activeMentors.find((m) => m.id === id)?.marker;
</script>
<template>
  <div
    class="calendar-scroll"
    role="region"
    aria-label="Kalender mingguan, geser horizontal untuk melihat seluruh hari"
    tabindex="0"
  >
    <div class="week-grid" :style="{ gridTemplateColumns: gridColumns }">
      <div class="time-header">WIB<span>UTC+7</span></div>
      <div
        v-for="day in days"
        :key="day"
        class="day-header"
        :class="{ 'is-today': day === localDate() }"
      >
        <span>{{ formatDay(day, { weekday: "short" }) }}</span
        ><strong>{{ formatDay(day, { day: "2-digit" }) }}</strong
        ><small>{{ formatDay(day, { month: "short" }) }}</small
        ><span v-if="day === localDate()" class="sr-only">Hari ini</span>
      </div>
      <div class="time-axis">
        <span
          v-for="hour in hours"
          :key="hour"
          :style="{ top: `${(hour - 7) * 64}px` }"
          >{{ minuteLabel(hour * 60) }}</span
        >
      </div>
      <div
        v-for="(day, dayIndex) in days"
        :key="`grid-${day}`"
        class="day-column"
        :class="{ 'today-column': day === localDate() }"
        :aria-label="
          formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })
        "
      >
        <div
          v-for="hour in 14"
          :key="hour"
          class="hour-line"
          :style="{ top: `${(hour - 1) * 64}px` }"
          aria-hidden="true"
        />
        <article
          v-for="(item, index) in dayLayouts[dayIndex]"
          :key="`${item.event.mentorId}-${item.event.start}-${index}`"
          class="calendar-event"
          :class="[
            mentorClass(item.event.mentorId),
            {
              'stale-event': staleMentorIds?.includes(item.event.mentorId),
              'compact-event': item.end - item.start < 75,
            },
          ]"
          :style="{
            top: `${((item.start - OPEN_MINUTE) / 60) * 64}px`,
            height: `${((item.end - item.start) / 60) * 64}px`,
            left: `calc(${(item.column / item.columns) * 100}% + 3px)`,
            width: `calc(${100 / item.columns}% - 6px)`,
          }"
        >
          <strong>{{ item.event.mentorDisplayName }}</strong><span
            class="event-time"
            >{{ formatTime(item.event.start) }}–{{
              formatTime(item.event.end)
            }}</span
          ><span class="event-label">{{
            item.event.publicLabel === "Sesi"
              ? item.event.course || "Sesi"
              : "Tidak tersedia"
          }}</span
          ><span
            v-if="item.event.mode && item.end - item.start >= 90"
            class="event-mode"
            >{{ item.event.mode }} · Terisi</span
          ><span
            v-if="staleMentorIds?.includes(item.event.mentorId)"
            class="event-mode"
            >Data lama</span
          >
        </article>
      </div>
    </div>
  </div>
</template>
<style scoped>
.calendar-scroll {
  overflow: auto;
  max-height: 720px;
  border: 1px solid var(--color-line);
  background: var(--color-surface);
  overscroll-behavior-x: contain;
}
.week-grid {
  min-width: 1320px;
  display: grid;
  grid-template-columns: 64px repeat(7, minmax(175px, 1fr));
  grid-template-rows: 88px 920px;
  position: relative;
}
.time-header,
.day-header {
  position: sticky;
  top: 0;
  z-index: 5;
  border-bottom: 1px solid var(--color-line);
  background: var(--color-paper);
}
.time-header {
  left: 0;
  z-index: 8;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  padding-top: 23px;
}
.time-header span {
  display: block;
  font-size: 8px;
  font-weight: 400;
  color: var(--color-muted);
  margin-top: 3px;
}
.day-header {
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  align-items: baseline;
  justify-content: center;
  gap: 3px 7px;
  border-left: 1px solid var(--color-line);
}
.day-header > span:first-child {
  width: 100%;
  text-align: center;
  text-transform: uppercase;
  font-size: 9px;
  letter-spacing: 0.09em;
  color: var(--color-muted);
}
.day-header strong {
  font-family: var(--font-heading);
  font-size: 30px;
  line-height: 1.3;
  font-weight: 600;
}
.day-header small {
  font-size: 10px;
  color: var(--color-muted);
}
.day-header.is-today {
  background: var(--color-brand);
  color: var(--color-surface);
}
.day-header.is-today > span:first-child,
.day-header.is-today small {
  color: var(--color-paper);
}
.time-axis {
  position: sticky;
  left: 0;
  z-index: 4;
  background: var(--color-paper);
}
.time-axis span {
  position: absolute;
  left: 9px;
  transform: translateY(-50%);
  font-size: 10px;
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
  background: var(--color-paper);
}
.time-axis span:first-child {
  transform: translateY(4px);
}
.day-column {
  position: relative;
  border-left: 1px solid var(--color-line);
}
.today-column {
  background: color-mix(in srgb, var(--color-accent) 10%, var(--color-surface));
}
.hour-line {
  position: absolute;
  height: 64px;
  width: 100%;
  border-bottom: 1px solid var(--color-line);
  background: linear-gradient(
    transparent calc(50% - 0.5px),
    color-mix(in srgb, var(--color-line) 45%, transparent) 50%,
    transparent calc(50% + 0.5px)
  );
}
.calendar-event {
  position: absolute;
  z-index: 2;
  padding: 7px 5px;
  border-left: 3px solid var(--mentor-color);
  background: var(--mentor-soft);
  color: var(--mentor-color);
  display: flex;
  flex-direction: column;
  overflow: auto;
  font-size: 10px;
  line-height: 1.4;
  min-width: 0;
}
.calendar-event strong {
  font-size: 10px;
  font-weight: 700;
}
.event-time {
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  margin-top: 2px;
}
.event-label {
  margin-top: 4px;
  font-size: 9px;
}
.event-mode {
  font-size: 8px;
  margin-top: 2px;
}
.stale-event {
  opacity: 0.65;
  border-left-style: dashed;
}
.compact-event {
  padding-top: 4px;
}
.compact-event .event-label {
  margin-top: 1px;
  font-size: 8px;
}
</style>
