<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Info,
  MousePointer2,
} from "lucide-vue-next";
import {
  packages,
  type CourseId,
  type PackageId,
  type StudyMode,
  type Duration,
} from "../../content/pricing";
import { programs } from "../../content/programs";
import {
  formatPrice,
  getSingleSessionPrice,
  getRoutinePrice,
  getPracticePrice,
} from "../../utils/pricing";
import WhatsAppCTA from "../shared/WhatsAppCTA.vue";
const props = defineProps<{ courseId: CourseId }>();
const program = computed(() => programs.find((p) => p.id === props.courseId)!);
const selected = ref<PackageId>("single");
const currentPackage = computed(() =>
  packages.find((p) => p.id === selected.value)!,
);
const columns: { mode: StudyMode; duration: Duration; label: string }[] = [
  { mode: "offline", duration: 90, label: "Offline · 90 menit" },
  { mode: "offline", duration: 120, label: "Offline · 120 menit" },
  { mode: "online", duration: 90, label: "Online · 90 menit" },
  { mode: "online", duration: 120, label: "Online · 120 menit" },
];
function price(mode: StudyMode, duration: Duration, count: number) {
  return (
    selected.value === "routine" ? getRoutinePrice : getSingleSessionPrice
  )(props.courseId, mode, duration, count);
}
async function moveTab(event: KeyboardEvent, index: number) {
  let next = index;
  if (event.key === "ArrowRight") next = (index + 1) % packages.length;
  else if (event.key === "ArrowLeft")
    next = (index - 1 + packages.length) % packages.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = packages.length - 1;
  else return;
  event.preventDefault();
  selected.value = packages[next]!.id;
  await nextTick();
  document.getElementById(`${props.courseId}-tab-${selected.value}`)?.focus();
}
</script>
<template>
  <section :id="courseId" class="program-section section-border">
    <div class="program-heading">
      <span class="course-index display">{{ program.number }}</span>
      <div>
        <span class="eyebrow">{{ program.title }}</span>
        <h2>{{ program.name }}</h2>
        <p>{{ program.description }}</p>
      </div>
      <span class="course-symbol" aria-hidden="true">{{ program.symbol }}</span>
    </div>
    <div class="package-picker">
      <div class="package-picker-heading">
        <span class="package-picker-icon" aria-hidden="true"
          ><MousePointer2 :size="22"
        /></span>
        <div>
          <h3>Pilih paket belajar</h3>
          <p :id="`${courseId}-package-help`">
            Pilih salah satu paket untuk melihat rincian harga dan fasilitasnya.
          </p>
        </div>
      </div>
      <div
        class="package-tabs"
        role="tablist"
        :aria-label="`Jenis paket ${program.name}`"
        :aria-describedby="`${courseId}-package-help`"
      >
        <button
          v-for="(pack, index) in packages"
          :key="pack.id"
          :id="`${courseId}-tab-${pack.id}`"
          type="button"
          role="tab"
          :aria-selected="selected === pack.id"
          :aria-labelledby="`${courseId}-label-${pack.id}`"
          :aria-describedby="`${courseId}-sessions-${pack.id}`"
          :tabindex="selected === pack.id ? 0 : -1"
          :aria-controls="`${courseId}-prices`"
          @click="selected = pack.id"
          @keydown="moveTab($event, index)"
        >
          <span class="package-tab-header">
            <span>
              <span
                :id="`${courseId}-label-${pack.id}`"
                class="package-tab-name"
                >{{ pack.name }}</span
              >
              <span
                :id="`${courseId}-sessions-${pack.id}`"
                class="package-tab-sessions"
                >{{ pack.sessionLabel }}</span
              >
            </span>
            <span class="package-tab-indicator" aria-hidden="true"
              ><Check v-if="selected === pack.id" :size="17"
            /></span>
          </span>
          <span class="package-tab-action">
            <span>{{
              selected === pack.id ? "Sedang ditampilkan" : "Lihat rincian"
            }}</span>
            <ArrowDown
              v-if="selected === pack.id"
              :size="18"
              aria-hidden="true"
            />
            <ArrowRight v-else :size="18" aria-hidden="true" />
          </span>
        </button>
      </div>
    </div>
    <div
      :id="`${courseId}-prices`"
      class="pricing-panel"
      role="tabpanel"
      :aria-labelledby="`${courseId}-tab-${selected}`"
      tabindex="0"
    >
      <div class="table-intro">
        <div>
          <h3>{{ currentPackage.name }}</h3>
          <p>{{ currentPackage.detail }}</p>
        </div>
        <span class="badge badge-neutral"
          >Harga ITS · {{ currentPackage.unit }}</span
        >
      </div>
      <div
        class="table-scroll"
        role="region"
        :aria-label="`Tabel harga ${program.name}, ${currentPackage.name}, geser horizontal pada layar kecil`"
        tabindex="0"
      >
        <table>
          <caption class="sr-only">
            {{
              program.name
            }}
            —
            {{
              currentPackage.name
            }},
            {{
              currentPackage.unit
            }}. Tanda — berarti tidak ditawarkan.
          </caption>
          <thead>
            <tr>
              <th scope="col">Jumlah<br />mahasiswa</th>
              <template v-if="selected !== 'practice'"
                ><th v-for="column in columns" :key="column.label" scope="col">
                  <span>{{ column.mode }}</span><strong
                    >{{ column.duration }} menit</strong
                  >
                </th></template
              >
              <th v-else scope="col">
                <span>Offline · 4 × 120 menit</span
                ><strong>Harga per mahasiswa / paket</strong>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="count in selected === 'practice' ? 5 : 7" :key="count">
              <th scope="row">
                {{ count }}
                <span>{{ count === 1 ? "orang · privat" : "orang" }}</span>
              </th>
              <template v-if="selected !== 'practice'"
                ><td
                  v-for="column in columns"
                  :key="column.label"
                  :class="{
                    unavailable:
                      price(column.mode, column.duration, count) === null,
                  }"
                >
                  <span
                    v-if="price(column.mode, column.duration, count) === null"
                    aria-label="Tidak ditawarkan"
                    >—</span
                  ><span v-else>{{
                    formatPrice(price(column.mode, column.duration, count))
                  }}</span>
                </td></template
              >
              <td v-else>
                {{ formatPrice(getPracticePrice(courseId, count)) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="table-footnote">
        Semua harga <strong>per mahasiswa</strong>,
        {{
          selected === "single"
            ? "untuk satu pertemuan"
            : selected === "routine"
              ? "untuk 8 pertemuan"
              : "untuk 4 pertemuan × 120 menit"
        }}.
        <span v-if="selected !== 'practice'"
          >Tanda <strong>—</strong> berarti kombinasi tidak ditawarkan.</span
        >
      </p>
      <div class="package-detail">
        <div>
          <span class="eyebrow">Termasuk dalam paket</span>
          <ul>
            <li v-for="note in currentPackage.notes" :key="note">
              <Check :size="15" aria-hidden="true" />{{ note }}
            </li>
          </ul>
        </div>
        <div class="package-contact">
          <p>
            Punya kebutuhan belajar tertentu?<br /><strong
              >Yuk, diskusikan bersama admin.</strong
            >
          </p>
          <WhatsAppCTA />
        </div>
      </div>
    </div>
    <div class="program-note">
      <Info :size="16" aria-hidden="true" />
      <p>
        Mahasiswa non-ITS: <strong>harga ITS +10%</strong>, dibulatkan ke
        kelipatan Rp5.000 terdekat (half-up). Fasilitas bergantung pada lokasi
        yang disepakati. Perekaman hanya dengan persetujuan peserta.
      </p>
    </div>
  </section>
</template>
<style scoped>
.program-section {
  padding-block: 48px;
  scroll-margin-top: 28px;
}
.program-heading {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 32px;
}
.course-index {
  font-size: 60px;
  line-height: 1;
  color: var(--color-ornament);
}
.program-heading h2 {
  font-size: 52px;
  color: var(--color-brand);
  margin: 10px 0 12px;
}
.program-heading p {
  font-size: 16px;
  max-width: 570px;
  color: var(--color-muted);
}
.program-heading .eyebrow {
  font-size: 14px;
}
.course-symbol {
  margin-left: auto;
  font-family: Georgia, serif;
  font-style: italic;
  font-size: 65px;
  color: var(--color-ornament);
  white-space: nowrap;
}
.package-picker {
  padding: 24px;
  border: 1px solid var(--color-line);
  background: var(--color-warm);
  margin-bottom: 20px;
}
.package-picker-heading {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 22px;
}
.package-picker-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  background: var(--color-brand-soft);
  color: var(--color-brand);
  border-radius: var(--radius);
}
.package-picker-heading h3 {
  font: 700 20px/1.35 var(--font-body);
  margin-bottom: 6px;
}
.package-picker-heading p {
  color: var(--color-muted);
  font-size: 16px;
}
.package-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
.package-tabs button {
  min-width: 0;
  padding: 18px 20px;
  text-align: left;
  border: 2px solid var(--color-line);
  border-radius: var(--radius);
  background: var(--color-surface);
  font-size: 16px;
  color: var(--color-ink);
  transition:
    border-color 0.2s,
    background 0.2s,
    box-shadow 0.2s;
}
.package-tabs button:hover {
  border-color: var(--color-brand);
  box-shadow: var(--shadow);
}
.package-tab-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.package-tab-name {
  display: block;
  font-size: 18px;
  line-height: 1.4;
  font-weight: 700;
}
.package-tab-sessions {
  display: block;
  font-size: 15px;
  margin-top: 6px;
  color: var(--color-muted);
}
.package-tab-indicator {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border: 2px solid var(--color-line);
  border-radius: 50%;
  margin-top: 1px;
}
.package-tab-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--color-line);
  padding-top: 12px;
  margin-top: 16px;
  color: var(--color-brand);
  font-size: 14px;
  font-weight: 700;
}
.package-tabs button[aria-selected="true"] {
  border-color: var(--color-brand);
  color: var(--color-surface);
  background: var(--color-brand);
}
.package-tabs button[aria-selected="true"] .package-tab-sessions {
  color: var(--color-paper);
}
.package-tabs button[aria-selected="true"] .package-tab-indicator {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: var(--color-accent-ink);
}
.package-tabs button[aria-selected="true"] .package-tab-action {
  border-color: color-mix(in srgb, var(--color-surface) 30%, transparent);
  color: var(--color-surface);
}
.pricing-panel {
  border: 1px solid var(--color-line);
  background: var(--color-surface);
}
.table-intro {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 28px;
}
.table-intro h3 {
  font-family: var(--font-heading);
  font-size: 28px;
  text-transform: uppercase;
}
.table-intro p {
  font-size: 14px;
  color: var(--color-muted);
  margin-top: 8px;
}
.table-intro .badge {
  font-size: 14px;
}
.table-scroll {
  overflow-x: auto;
  overscroll-behavior-x: contain;
}
table {
  border-collapse: collapse;
  width: 100%;
  min-width: 660px;
  font-variant-numeric: tabular-nums;
  font-size: 16px;
  text-align: left;
}
thead {
  background: var(--color-brand);
  color: var(--color-surface);
}
th,
td {
  padding: 17px 24px;
}
thead th {
  font-weight: 500;
  font-size: 15px;
}
thead th span {
  display: block;
  text-transform: uppercase;
  font-size: 14px;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
  opacity: 0.8;
}
thead th strong {
  font-weight: 500;
}
tbody tr:nth-child(even) {
  background: var(--color-paper);
}
tbody th {
  font-size: 16px;
  font-weight: 600;
  border-right: 1px solid var(--color-line);
}
tbody th span {
  font-size: 14px;
  font-weight: 400;
  color: var(--color-muted);
  margin-left: 6px;
}
tbody td {
  font-weight: 500;
  border-bottom: 1px solid var(--color-line);
}
tbody tr:last-child td {
  border-bottom: 0;
}
.unavailable {
  color: var(--color-muted);
}
.table-footnote {
  padding: 16px 28px;
  max-width: none;
  border-top: 1px solid var(--color-line);
  font-size: 14px;
  color: var(--color-muted);
}
.package-detail {
  border-top: 1px solid var(--color-line);
  padding: 28px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}
.package-detail .eyebrow {
  font-size: 14px;
}
.package-detail ul {
  list-style: none;
  padding: 0;
  margin: 16px 0 0;
  display: grid;
  gap: 8px;
}
.package-detail li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
}
.package-detail li svg {
  color: var(--color-success);
}
.package-contact {
  border-left: 1px solid var(--color-line);
  padding-left: 36px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 20px;
}
.package-contact p {
  font-size: 16px;
  color: var(--color-muted);
}
.package-contact p strong {
  color: var(--color-ink);
  font-weight: 500;
}
.program-note {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  font-size: 14px;
  color: var(--color-muted);
}
.program-note svg {
  margin-top: 2px;
}
.program-note p {
  max-width: none;
}
@media (max-width: 767px) {
  .course-symbol {
    display: none;
  }
  .table-intro {
    align-items: flex-start;
    flex-direction: column;
    padding: 20px;
  }
  .package-detail {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 20px;
  }
  .package-contact {
    border-left: 0;
    border-top: 1px solid var(--color-line);
    padding: 24px 0 0;
  }
  .package-picker {
    padding: 20px;
  }
  .package-tabs {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .package-tabs button {
    padding: 16px;
  }
  .package-tab-name {
    font-size: 17px;
  }
  .package-tab-action {
    padding-top: 10px;
    margin-top: 12px;
  }
}
@media (max-width: 479px) {
  .program-heading {
    gap: 14px;
  }
  .course-index {
    font-size: 42px;
  }
  .program-heading h2 {
    font-size: 42px;
  }
  .program-heading .eyebrow {
    font-size: 13px;
  }
  .package-picker {
    padding: 16px;
  }
  .package-picker-heading {
    gap: 10px;
  }
  .package-picker-heading h3 {
    font-size: 18px;
  }
  .package-picker-heading p {
    font-size: 15px;
  }
  .package-picker-icon {
    width: 36px;
    height: 36px;
  }
  .table-intro .badge {
    font-size: 13px;
  }
}
</style>
