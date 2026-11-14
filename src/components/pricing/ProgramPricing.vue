<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { Check, Info } from "lucide-vue-next";
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
    <div
      class="package-tabs"
      role="tablist"
      :aria-label="`Jenis paket ${program.name}`"
    >
      <button
        v-for="(pack, index) in packages"
        :key="pack.id"
        :id="`${courseId}-tab-${pack.id}`"
        type="button"
        role="tab"
        :aria-selected="selected === pack.id"
        :tabindex="selected === pack.id ? 0 : -1"
        :aria-controls="`${courseId}-prices`"
        @click="selected = pack.id"
        @keydown="moveTab($event, index)"
      >
        {{ pack.name
        }}<span
          >{{
            pack.id === "single" ? "01" : pack.id === "routine" ? "08" : "04"
          }}
          sesi{{ pack.id === "single" ? " / fleksibel" : "" }}</span
        >
      </button>
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
                  <span>{{ column.mode }}</span
                  ><strong>{{ column.duration }} menit</strong>
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
  font-size: 13px;
  max-width: 570px;
  color: var(--color-muted);
}
.program-heading .eyebrow {
  font-size: 9px;
}
.course-symbol {
  margin-left: auto;
  font-family: Georgia, serif;
  font-style: italic;
  font-size: 65px;
  color: var(--color-ornament);
  white-space: nowrap;
}
.package-tabs {
  display: flex;
  border: 1px solid var(--color-line);
  border-bottom: 0;
  background: var(--color-warm);
}
.package-tabs button {
  flex: 1;
  min-width: 0;
  padding: 18px 20px;
  text-align: left;
  border: 0;
  border-bottom: 3px solid transparent;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
}
.package-tabs button span {
  display: block;
  font-size: 10px;
  font-weight: 400;
  margin-top: 3px;
  color: var(--color-muted);
}
.package-tabs button[aria-selected="true"] {
  border-color: var(--color-brand);
  color: var(--color-brand);
  background: var(--color-surface);
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
  font-size: 11px;
  color: var(--color-muted);
  margin-top: 8px;
}
.table-intro .badge {
  font-size: 9px;
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
  font-size: 13px;
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
  font-size: 12px;
}
thead th span {
  display: block;
  text-transform: uppercase;
  font-size: 9px;
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
  font-size: 10px;
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
  font-size: 10px;
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
  font-size: 9px;
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
  font-size: 12px;
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
  font-size: 13px;
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
  font-size: 11px;
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
  .package-tabs button {
    font-size: 12px;
    padding: 14px 12px;
  }
  .package-tabs button span {
    font-size: 9px;
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
    font-size: 8px;
  }
  .package-tabs button {
    padding-inline: 8px;
    font-size: 11px;
  }
  .table-intro .badge {
    font-size: 8px;
  }
}
</style>
