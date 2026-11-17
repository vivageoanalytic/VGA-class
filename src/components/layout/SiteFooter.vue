<script setup lang="ts">
import { ArrowUpRight, MoveUpRight } from "lucide-vue-next";
import { brand, navigation } from "../../content/brand";
import WhatsAppCTA from "../shared/WhatsAppCTA.vue";
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-cta">
      <div>
        <span class="eyebrow">Langkah berikutnya</span>
        <h2>KALKULUS LEBIH JELAS.<br />MULAI DARI OBROLAN.</h2>
        <p>
          Ceritakan kebutuhan belajarmu. Kita diskusikan program dan jadwal yang
          sesuai.
        </p>
      </div>
      <div class="footer-contact">
        <WhatsAppCTA light /><span
          >Jadwal final dikonfirmasi bersama admin.</span
        >
      </div>
      <MoveUpRight
        class="footer-arrow"
        :size="140"
        :stroke-width="0.7"
        aria-hidden="true"
      />
    </div>
    <div class="container footer-bottom">
      <div class="footer-brand">
        <RouterLink to="/" aria-label="VGA Class, beranda"
          ><picture
            ><source :srcset="brand.logo.src" type="image/webp" />
            <img
              class="footer-logo"
              :src="brand.logo.fallback"
              :alt="brand.logo.alt"
              :width="brand.logo.width"
              :height="brand.logo.height"
              loading="lazy" /></picture
        ></RouterLink>
        <p>Belajar untuk memahami.</p>
      </div>
      <nav aria-label="Navigasi footer">
        <RouterLink v-for="item in navigation" :key="item.to" :to="item.to"
          >{{ item.label }}<ArrowUpRight :size="12" aria-hidden="true"
        /></RouterLink>
      </nav>
      <div class="footer-info">
        <span>Kalkulus 1 & Kalkulus 2</span
        ><span>Online & offline · untuk mahasiswa</span
        ><span>Operasional: setiap hari, 07.00–21.00 WIB</span
        ><a
          v-if="brand.whatsappUrl"
          :href="brand.whatsappUrl"
          target="_blank"
          rel="noopener noreferrer"
          >WhatsApp: {{ brand.whatsappDisplay
          }}<span class="sr-only"> (buka tab baru)</span></a
        ><span v-else>WhatsApp resmi belum tersedia.</span>
      </div>
    </div>
    <div class="container footer-legal">
      <span>© {{ new Date().getFullYear() }} VGA Class</span
      ><span
        >Prototipe · Profil & visual demo diberi label. Bukan dokumentasi
        resmi.</span
      ><a href="#main">Kembali ke atas ↑</a>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  color: var(--color-paper);
  background: var(--color-brand);
  margin-top: 64px;
}
.footer-cta {
  padding-block: 64px;
  display: flex;
  align-items: center;
  gap: 40px;
  position: relative;
}
.eyebrow {
  color: var(--color-accent);
}
.footer-cta h2 {
  font-size: clamp(36px, 4vw, 54px);
  margin: 16px 0;
}
.footer-cta p {
  color: color-mix(in srgb, var(--color-paper) 75%, transparent);
  font-size: 16px;
  max-width: 470px;
}
.footer-contact {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-left: auto;
  z-index: 1;
}
.footer-contact span {
  font-size: 14px;
}
.footer-arrow {
  color: color-mix(in srgb, var(--color-paper) 14%, transparent);
}
.footer-bottom {
  border-top: 1px solid color-mix(in srgb, var(--color-paper) 22%, transparent);
  padding-block: 40px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 32px;
  font-size: 15px;
}
.footer-logo {
  width: auto;
  height: 96px;
  object-fit: contain;
}
.footer-brand p {
  margin-top: 8px;
}
.footer-bottom nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 28px;
  align-content: start;
}
.footer-bottom nav a {
  display: flex;
  align-items: center;
  gap: 6px;
}
.footer-bottom nav a:hover {
  color: var(--color-accent);
}
.footer-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: color-mix(in srgb, var(--color-paper) 75%, transparent);
}
.footer-legal {
  padding-block: 22px;
  border-top: 1px solid color-mix(in srgb, var(--color-paper) 22%, transparent);
  display: flex;
  justify-content: space-between;
  gap: 20px;
  font-size: 14px;
  color: color-mix(in srgb, var(--color-paper) 70%, transparent);
}
@media (max-width: 1023px) {
  .footer-arrow {
    display: none;
  }
}
@media (max-width: 767px) {
  .footer-cta {
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
    padding-block: 40px;
  }
  .footer-contact {
    margin-left: 0;
  }
  .footer-bottom {
    grid-template-columns: 1fr 1fr;
  }
  .footer-brand {
    grid-column: 1 / -1;
  }
  .footer-legal {
    flex-wrap: wrap;
  }
  .footer-legal span:nth-child(2) {
    order: 3;
    width: 100%;
  }
}
</style>
