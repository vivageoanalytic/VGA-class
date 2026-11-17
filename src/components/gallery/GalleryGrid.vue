<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { ArrowUpRight, ArrowLeft, ArrowRight, X } from "lucide-vue-next";
import type { GalleryItem } from "../../content/gallery";
const props = defineProps<{ items: GalleryItem[] }>();
const dialog = ref<HTMLDialogElement>();
const selectedIndex = ref(0);
const selected = computed(() => props.items[selectedIndex.value]);
async function show(index: number) {
  selectedIndex.value = index;
  await nextTick();
  dialog.value?.showModal();
}
function step(direction: number) {
  selectedIndex.value =
    (selectedIndex.value + direction + props.items.length) % props.items.length;
}
</script>
<template>
  <div v-if="items.length" class="gallery-grid">
    <button
      v-for="(item, i) in items"
      :key="item.id"
      type="button"
      class="gallery-item"
      :aria-label="`Perbesar: ${item.caption}${item.demo ? ' (ilustrasi demo)' : ''}`"
      @click="show(i)"
    >
      <div class="gallery-image">
        <img
          :src="item.image"
          :alt="item.alt"
          width="640"
          height="460"
          loading="lazy"
        /><span v-if="item.demo" class="badge">Ilustrasi demo</span
        ><span class="gallery-expand" aria-hidden="true"
          ><ArrowUpRight :size="20"
        /></span>
      </div>
      <span class="gallery-caption"
        ><span
          ><small>{{ item.category }}</small
          ><strong>{{ item.caption }}</strong></span
        ><span aria-hidden="true">↗</span></span
      >
    </button>
  </div>
  <div v-else class="state-panel">
    <h2>Dokumentasi segera hadir</h2>
    <p class="muted">
      Foto kegiatan akan ditampilkan setelah mendapat izin publikasi.
    </p>
  </div>
  <dialog
    ref="dialog"
    class="lightbox"
    aria-labelledby="lightbox-title"
    @click="$event.target === dialog && dialog?.close()"
    @keydown.left.prevent="step(-1)"
    @keydown.right.prevent="step(1)"
  >
    <template v-if="selected"
      ><div class="lightbox-top">
        <span class="badge" v-if="selected.demo"
          >Ilustrasi demo · bukan dokumentasi resmi</span
        ><button
          type="button"
          class="icon-button"
          aria-label="Tutup gambar"
          autofocus
          @click="dialog?.close()"
        >
          <X :size="22" />
        </button>
      </div>
      <img :src="selected.image" :alt="selected.alt" width="640" height="460" />
      <div class="lightbox-bottom">
        <div>
          <h2 id="lightbox-title">{{ selected.caption }}</h2>
          <p class="small muted">
            {{ selectedIndex + 1 }} / {{ items.length }} ·
            {{ selected.category }}
          </p>
        </div>
        <div class="lightbox-controls">
          <button
            type="button"
            class="icon-button"
            aria-label="Gambar sebelumnya"
            @click="step(-1)"
          >
            <ArrowLeft :size="18" /></button
          ><button
            type="button"
            class="icon-button"
            aria-label="Gambar berikutnya"
            @click="step(1)"
          >
            <ArrowRight :size="18" />
          </button>
        </div></div
    ></template>
  </dialog>
</template>
<style scoped>
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}
.gallery-item {
  text-align: left;
  background: transparent;
  border: 0;
  padding: 0;
  min-width: 0;
}
.gallery-image {
  position: relative;
  overflow: hidden;
  background: var(--color-warm);
}
.gallery-image img {
  width: 100%;
  aspect-ratio: 1.4;
  object-fit: cover;
  transition: transform 0.4s;
}
.gallery-item:hover img {
  transform: scale(1.04);
}
.gallery-image .badge {
  position: absolute;
  top: 14px;
  left: 14px;
  background: var(--color-paper);
  font-size: 13px;
}
.gallery-expand {
  position: absolute;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  right: 12px;
  bottom: 12px;
  background: var(--color-surface);
  color: var(--color-brand);
}
.gallery-caption {
  display: flex;
  justify-content: space-between;
  padding-top: 16px;
  gap: 12px;
}
.gallery-caption small {
  display: block;
  text-transform: uppercase;
  font-size: 13px;
  color: var(--color-muted);
  letter-spacing: 0.1em;
  margin-bottom: 6px;
}
.gallery-caption strong {
  font-size: 16px;
  font-weight: 500;
}
.gallery-caption > span:last-child {
  color: var(--color-brand);
}
.lightbox {
  width: min(850px, calc(100% - 32px));
  max-height: calc(100dvh - 40px);
  border: 0;
  padding: 20px;
  background: var(--color-paper);
  color: var(--color-ink);
  margin: auto;
  box-shadow: var(--shadow);
}
.lightbox::backdrop {
  background: color-mix(in srgb, var(--color-ink) 80%, transparent);
}
.lightbox-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.lightbox-top button {
  margin-left: auto;
}
.lightbox > img {
  width: 100%;
  max-height: 60dvh;
  object-fit: contain;
  background: var(--color-warm);
}
.lightbox-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 20px;
}
.lightbox-bottom h2 {
  font-size: 30px;
  margin-bottom: 8px;
}
.lightbox-controls {
  display: flex;
  gap: 8px;
}
@media (max-width: 767px) {
  .gallery-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px 16px;
  }
  .gallery-grid .gallery-item:last-child {
    grid-column: 1 / -1;
    max-width: 100%;
  }
  .lightbox-bottom h2 {
    font-size: 24px;
  }
}
@media (max-width: 479px) {
  .gallery-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .lightbox {
    padding: 12px;
  }
  .lightbox-top .badge {
    font-size: 13px;
  }
}
</style>
