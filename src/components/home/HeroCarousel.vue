<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
} from "lucide-vue-next";
import { banners } from "../../content/banners";
const slides = banners
  .filter((b) => b.active)
  .sort((a, b) => a.order - b.order);
const index = ref(0);
const slide = computed(() => slides[index.value]!);
const userPaused = ref(false),
  hovered = ref(false),
  focused = ref(false),
  reduced = ref(false);
const paused = computed(
  () => userPaused.value || hovered.value || focused.value || reduced.value,
);
let timer: ReturnType<typeof setInterval>, media: MediaQueryList | undefined;
let touchStart = 0;
const move = (delta: number, user = true) => {
  index.value = (index.value + delta + slides.length) % slides.length;
  if (user) userPaused.value = true;
};
const setReduced = () => {
  reduced.value = media?.matches ?? false;
};
function focusOut(event: FocusEvent) {
  if (
    !(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)
  )
    focused.value = false;
}
function touchEnd(event: TouchEvent) {
  const difference = touchStart - event.changedTouches[0]!.clientX;
  if (Math.abs(difference) > 55) move(difference > 0 ? 1 : -1);
}
onMounted(() => {
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  setReduced();
  media.addEventListener("change", setReduced);
  timer = setInterval(() => {
    if (!paused.value && !document.hidden) move(1, false);
  }, 5000);
});
onBeforeUnmount(() => {
  clearInterval(timer);
  media?.removeEventListener("change", setReduced);
});
</script>

<template>
  <section
    class="hero"
    aria-label="Program unggulan"
    aria-roledescription="carousel"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @focusin="focused = true"
    @focusout="focusOut"
    @touchstart.passive="touchStart = $event.touches[0]!.clientX"
    @touchend.passive="touchEnd"
  >
    <Transition name="hero-fade"
      ><picture :key="slide.id" class="hero-art"
        ><source
          media="(max-width: 639px)"
          :srcset="slide.webpMobile"
          type="image/webp" />
        <source media="(max-width: 639px)" :srcset="slide.imageMobile" />
        <source :srcset="slide.webpDesktop" type="image/webp" />
        <img
          :src="slide.imageDesktop"
          :alt="slide.alt"
          width="1800"
          height="830"
          fetchpriority="high" /></picture
    ></Transition>
    <div class="container hero-inner">
      <div
        class="hero-copy"
        :aria-live="userPaused ? 'polite' : 'off'"
        aria-atomic="true"
      >
        <span class="eyebrow">Kalkulus 1 & 2 · Untuk mahasiswa</span>
        <h1>
          <span
            v-for="(line, i) in slide.title"
            :key="line"
            :class="{ 'outline-title': i === 2 }"
            >{{ line }}</span
          >
        </h1>
        <p>{{ slide.description }}</p>
        <div class="hero-actions">
          <RouterLink :to="slide.ctaTo" class="button"
            >{{ slide.ctaLabel
            }}<ArrowUpRight :size="17" aria-hidden="true" /></RouterLink
          ><span class="hero-mini"
            >Belajar untuk memahami.<br /><strong
              >Bukan sekadar menghafal.</strong
            ></span
          >
        </div>
      </div>
      <div class="art-label">
        <span class="badge badge-neutral">Visual demo / ilustrasi orisinal</span
        ><span>THE BEAUTY OF UNDERSTANDING.</span>
      </div>
      <div class="hero-bottom">
        <span class="hero-edition"
          >VGA CLASS <span> / </span> LEARNING, REIMAGINED.</span
        >
        <div class="hero-controls">
          <span class="slide-count"
            >0{{ index + 1 }}<span> / 0{{ slides.length }}</span></span
          ><button
            type="button"
            class="carousel-button"
            aria-label="Banner sebelumnya"
            @click="move(-1)"
          >
            <ArrowLeft :size="17" /></button
          ><button
            type="button"
            class="carousel-button"
            aria-label="Banner berikutnya"
            @click="move(1)"
          >
            <ArrowRight :size="17" /></button
          ><button
            type="button"
            class="carousel-button playback"
            :disabled="reduced"
            :aria-label="
              reduced
                ? 'Animasi otomatis dinonaktifkan sesuai preferensi perangkat'
                : userPaused
                  ? 'Putar banner otomatis'
                  : 'Jeda banner otomatis'
            "
            :aria-pressed="userPaused || reduced"
            @click="userPaused = !userPaused"
          >
            <Play v-if="userPaused || reduced" :size="14" /><Pause
              v-else
              :size="14"
            />
          </button>
        </div>
      </div>
    </div>
  </section>
  <div class="hero-strip">
    <div class="container">
      <span
        ><span class="strip-star" aria-hidden="true">✳</span> PRIVAT ATAU
        KELOMPOK</span
      ><span>ONLINE & OFFLINE</span><span>90 / 120 MENIT</span
      ><span class="strip-campus"
        >ITS & KAMPUS LAINNYA <ArrowUpRight :size="16" aria-hidden="true"
      /></span>
    </div>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  background: var(--color-warm);
  min-height: 650px;
}
.hero-art {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
}
.hero-art img {
  height: 100%;
  width: 100%;
  object-fit: cover;
  object-position: center;
}
.hero-inner {
  position: relative;
  padding-top: 70px;
}
.hero-copy {
  max-width: 610px;
  position: relative;
  z-index: 1;
}
.hero h1 {
  font-size: clamp(65px, 7.1vw, 108px);
  line-height: 0.96;
  letter-spacing: -0.012em;
  color: var(--color-brand);
  margin: 24px 0;
}
.hero h1 span {
  display: block;
}
.outline-title {
  color: var(--color-brand);
}
.hero-copy p {
  max-width: 420px;
  font-size: 16px;
  color: var(--color-muted);
}
.hero-actions {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 30px;
}
.hero-mini {
  color: var(--color-muted);
  font-size: 14px;
  line-height: 1.6;
}
.hero-mini strong {
  color: var(--color-ink);
  font-weight: 500;
}
.hero-bottom {
  margin-top: 58px;
  padding-block: 18px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--color-line);
}
.hero-edition {
  font-size: 14px;
  letter-spacing: 0.12em;
  font-weight: 600;
}
.hero-edition span {
  padding-inline: 10px;
  opacity: 0.4;
}
.hero-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.slide-count {
  font-size: 15px;
  font-weight: 700;
  margin-right: 18px;
}
.slide-count span {
  color: var(--color-muted);
  font-weight: 400;
}
.carousel-button {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-line);
  color: var(--color-brand);
  background: transparent;
}
.carousel-button:hover {
  background: var(--color-accent);
}
.playback {
  border-color: transparent;
}
.art-label {
  position: absolute;
  right: 0;
  top: 38px;
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 13px;
  color: var(--color-muted);
  letter-spacing: 0.08em;
}
.art-label .badge {
  font-size: 13px;
}
.hero-strip {
  background: var(--color-accent);
  color: var(--color-accent-ink);
}
.hero-strip .container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 64px;
}
.hero-strip .container > span {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.strip-star {
  font-size: 28px;
}
.hero-fade-enter-active,
.hero-fade-leave-active {
  transition: opacity 0.6s;
}
.hero-fade-enter-from,
.hero-fade-leave-to {
  opacity: 0;
}
@media (min-width: 1600px) {
  .hero h1 {
    font-size: 114px;
  }
  .hero {
    min-height: 700px;
  }
}
@media (max-width: 1023px) {
  .hero h1 {
    font-size: 78px;
  }
  .hero-art {
    opacity: 0.6;
  }
  .hero-copy {
    max-width: 500px;
  }
  .hero-inner {
    padding-top: 55px;
  }
  .art-label > span:last-child {
    display: none;
  }
}
@media (max-width: 639px) {
  .hero {
    min-height: unset;
  }
  .hero-inner {
    padding-top: 38px;
  }
  .hero h1 {
    font-size: clamp(57px, 15vw, 84px);
    margin: 22px 0;
  }
  .hero-copy p {
    font-size: 16px;
    max-width: 320px;
  }
  .hero-art {
    opacity: 1;
  }
  .hero-art img {
    object-position: center bottom;
  }
  .hero-actions {
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 24px;
  }
  .hero-mini {
    font-size: 14px;
  }
  .hero-actions .button {
    padding-inline: 17px;
    font-size: 15px;
  }
  .hero-bottom {
    margin-top: 240px;
  }
  .hero-edition {
    font-size: 13px;
    max-width: 140px;
  }
  .slide-count {
    margin-right: 4px;
    font-size: 14px;
  }
  .hero-controls {
    gap: 4px;
  }
  .carousel-button {
    height: 32px;
    width: 32px;
  }
  .art-label {
    top: auto;
    bottom: 90px;
    right: 10px;
  }
  .hero-strip .container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px 16px;
    padding-block: 18px;
  }
  .hero-strip .container > span {
    font-size: 13px;
    gap: 6px;
  }
  .strip-star {
    font-size: 19px;
  }
}
</style>
