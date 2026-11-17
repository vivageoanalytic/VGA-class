<script setup lang="ts">
import { computed, ref } from "vue";
import { Image } from "lucide-vue-next";
import { visibleGallery } from "../content/gallery";
import GalleryGrid from "../components/gallery/GalleryGrid.vue";
const category = ref("Semua");
const categories = [
  "Semua",
  ...new Set(visibleGallery.map((item) => item.category)),
];
const filtered = computed(() =>
  category.value === "Semua"
    ? visibleGallery
    : visibleGallery.filter((item) => item.category === category.value),
);
</script>
<template>
  <div class="container">
    <header class="page-heading">
      <span class="eyebrow"
        ><RouterLink to="/">Home</RouterLink> / Gallery</span
      >
      <h1>SETIAP PROSES,<br />PUNYA CERITA.</h1>
      <p>
        Ruang dokumentasi perjalanan belajar bersama VGA Class. Sedikit
        pertanyaan, banyak kemungkinan.
      </p>
    </header>
    <div
      v-if="!visibleGallery.length || visibleGallery.some((item) => item.demo)"
      class="notice"
    >
      <Image :size="18" aria-hidden="true" />
      <p>
        <strong>Dokumentasi resmi sedang dipersiapkan.</strong> Visual berlabel
        demo merupakan ilustrasi orisinal, bukan foto kelas atau fasilitas VGA
        Class. Foto nyata hanya ditampilkan setelah mendapat izin publikasi.
      </p>
    </div>
    <div class="gallery-toolbar">
      <div role="group" aria-label="Filter kategori galeri">
        <button
          v-for="item in categories"
          :key="item"
          type="button"
          :aria-pressed="category === item"
          @click="category = item"
        >
          {{ item }}
        </button>
      </div>
      <span class="small muted" aria-live="polite"
        >{{ filtered.length }} visual</span
      >
    </div>
    <GalleryGrid :key="category" :items="filtered" />
  </div>
</template>
<style scoped>
.gallery-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-block: 36px 28px;
}
.gallery-toolbar > div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.gallery-toolbar button {
  padding: 10px 16px;
  background: transparent;
  border: 1px solid var(--color-line);
  font-size: 15px;
}
.gallery-toolbar button[aria-pressed="true"] {
  color: var(--color-surface);
  background: var(--color-brand);
  border-color: var(--color-brand);
}
@media (max-width: 639px) {
  .gallery-toolbar {
    align-items: flex-start;
  }
  .gallery-toolbar button {
    padding: 8px 10px;
    font-size: 14px;
  }
  .gallery-toolbar > span {
    white-space: nowrap;
    padding-top: 10px;
  }
}
</style>
