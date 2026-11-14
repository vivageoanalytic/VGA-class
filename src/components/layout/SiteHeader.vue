<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { Menu, X, ArrowUpRight } from "lucide-vue-next";
import { brand, navigation } from "../../content/brand";
const open = ref(false);
const route = useRoute();
watch(
  () => route.fullPath,
  () => {
    open.value = false;
  },
);
</script>

<template>
  <header class="site-header" @keydown.esc="open = false">
    <div class="container header-inner">
      <RouterLink to="/" class="wordmark" aria-label="VGA Class, beranda"
        ><span class="brand-mark" aria-hidden="true">v.</span
        ><span
          >VGA<span class="wordmark-light">CLASS</span
          ><small>LEARN. UNDERSTAND. GROW.</small></span
        ></RouterLink
      >
      <nav class="desktop-nav" aria-label="Navigasi utama">
        <RouterLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          :aria-current="route.path === item.to ? 'page' : undefined"
          >{{ item.label }}</RouterLink
        >
      </nav>
      <a
        v-if="brand.whatsappUrl"
        class="header-contact"
        :href="brand.whatsappUrl"
        target="_blank"
        rel="noopener noreferrer"
        >Hubungi kami <ArrowUpRight :size="16" aria-hidden="true" /><span
          class="sr-only"
        >
          (buka tab baru)</span
        ></a
      >
      <span
        v-else
        class="header-contact unavailable"
        aria-label="Kontak WhatsApp belum tersedia"
        >Kontak segera tersedia <ArrowUpRight :size="16" aria-hidden="true"
      /></span>
      <button
        class="mobile-toggle"
        type="button"
        :aria-expanded="open"
        aria-controls="mobile-navigation"
        :aria-label="open ? 'Tutup menu' : 'Buka menu'"
        @click="open = !open"
      >
        <X v-if="open" :size="24" /><Menu v-else :size="24" />
      </button>
    </div>
    <nav
      v-if="open"
      id="mobile-navigation"
      class="mobile-nav"
      aria-label="Navigasi mobile"
    >
      <RouterLink
        v-for="item in navigation"
        :key="item.to"
        :to="item.to"
        :aria-current="route.path === item.to ? 'page' : undefined"
        >{{ item.label }}<ArrowUpRight :size="16" aria-hidden="true"
      /></RouterLink>
      <span v-if="!brand.whatsappUrl" class="small"
        >WhatsApp: kontak segera tersedia</span
      >
      <a
        v-else
        :href="brand.whatsappUrl"
        target="_blank"
        rel="noopener noreferrer"
        @click="open = false"
        >Hubungi via WhatsApp<span class="sr-only"> (buka tab baru)</span></a
      >
    </nav>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--color-brand);
  color: var(--color-surface);
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  height: 88px;
}
.wordmark {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  font-family: var(--font-heading);
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.01em;
}
.brand-mark {
  font-family: Georgia, serif;
  font-style: italic;
  font-size: 38px;
  color: var(--color-accent);
  border: 1px solid currentColor;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  line-height: 0.8;
  padding-bottom: 4px;
}
.wordmark-light {
  font-weight: 600;
  margin-left: 4px;
}
.wordmark small {
  display: block;
  font-family: var(--font-body);
  font-size: 6px;
  font-weight: 500;
  letter-spacing: 0.19em;
  margin-top: 6px;
}
.desktop-nav {
  display: flex;
  align-self: stretch;
  gap: 28px;
}
.desktop-nav a {
  display: flex;
  align-items: center;
  position: relative;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}
.desktop-nav a:hover {
  color: var(--color-accent);
}
.desktop-nav a[aria-current="page"]::after {
  content: "";
  position: absolute;
  bottom: 19px;
  inset-inline: 0;
  height: 2px;
  background: var(--color-accent);
}
.header-contact {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid color-mix(in srgb, var(--color-surface) 40%, transparent);
  padding: 10px 12px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}
.unavailable {
  color: color-mix(in srgb, var(--color-surface) 75%, transparent);
}
.mobile-toggle {
  display: none;
  padding: 6px;
  background: transparent;
  border: 0;
  color: inherit;
}
.mobile-nav {
  padding: 8px 24px 24px;
  border-top: 1px solid
    color-mix(in srgb, var(--color-surface) 20%, transparent);
}
.mobile-nav a {
  display: flex;
  justify-content: space-between;
  padding: 13px 0;
  font-size: 13px;
  font-weight: 600;
}
.mobile-nav a[aria-current="page"] {
  color: var(--color-accent);
}
@media (max-width: 1100px) {
  .desktop-nav {
    gap: 20px;
  }
  .header-contact {
    display: none;
  }
}
@media (max-width: 767px) {
  .header-inner {
    height: 72px;
  }
  .desktop-nav {
    display: none;
  }
  .mobile-toggle {
    display: block;
  }
  .wordmark {
    font-size: 27px;
  }
  .brand-mark {
    width: 36px;
    height: 36px;
    font-size: 34px;
  }
}
</style>
