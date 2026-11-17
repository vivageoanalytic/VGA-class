<script setup lang="ts">
import { ArrowDown, Info } from "lucide-vue-next";
import { programs } from "../content/programs";
import ProgramPricing from "../components/pricing/ProgramPricing.vue";
import {
  formatPrice,
  getNonITSPrice,
  getSingleSessionPrice,
} from "../utils/pricing";
const exampleITSPrice = getSingleSessionPrice("kalkulus-1", "offline", 90, 1)!;
</script>
<template>
  <div class="container">
    <header class="page-heading">
      <span class="eyebrow"
        ><RouterLink to="/">Home</RouterLink> / Programs & Pricing</span
      >
      <h1>CARA BELAJARMU.<br />PILIHAN PROGRAMMU.</h1>
      <p>
        Privat untuk fokus, bareng teman untuk bertumbuh. Bandingkan paket
        Kalkulus 1 dan Kalkulus 2, dengan harga yang jelas per mahasiswa.
      </p>
    </header>
    <nav class="course-anchors" aria-label="Pilih program">
      <a v-for="program in programs" :key="program.id" :href="`#${program.id}`"
        ><span class="display">{{ program.number }}</span
        >{{ program.name }}<ArrowDown :size="17" aria-hidden="true"
      /></a>
    </nav>
    <div class="notice">
      <Info :size="18" aria-hidden="true" />
      <p>
        <strong>Harga untuk mahasiswa ITS.</strong> Mahasiswa kampus lain dapat
        bergabung dengan acuan +10%. Contoh: harga ITS
        {{ formatPrice(exampleITSPrice) }} menjadi
        {{ formatPrice(getNonITSPrice(exampleITSPrice)) }} setelah pembulatan.
      </p>
    </div>
    <ProgramPricing
      v-for="program in programs"
      :key="program.id"
      :course-id="program.id"
    />
  </div>
</template>
<style scoped>
.course-anchors {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}
.course-anchors a {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 22px;
  min-width: 210px;
  background: var(--color-surface);
  color: var(--color-brand);
  border: 1px solid var(--color-line);
  font-weight: 600;
  font-size: 16px;
}
.course-anchors a:hover {
  border-color: var(--color-brand);
}
.course-anchors .display {
  font-size: 24px;
  color: var(--color-muted);
}
.course-anchors svg {
  margin-left: auto;
}
.notice {
  margin-bottom: 48px;
}
@media (max-width: 479px) {
  .course-anchors {
    gap: 10px;
  }
  .course-anchors a {
    min-width: 0;
    padding: 12px;
    flex: 1;
    font-size: 15px;
    gap: 8px;
  }
  .course-anchors .display {
    font-size: 20px;
  }
}
</style>
