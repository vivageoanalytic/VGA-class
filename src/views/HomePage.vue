<script setup lang="ts">
import {
  ArrowUpRight,
  BookOpen,
  Users,
  Monitor,
  MoveUpRight,
} from "lucide-vue-next";
import { programs } from "../content/programs";
import { activeMentors } from "../content/mentors";
import { visibleGallery } from "../content/gallery";
import { formatPrice, getSingleSessionPrice } from "../utils/pricing";
import HeroCarousel from "../components/home/HeroCarousel.vue";
import SchedulePreview from "../components/home/SchedulePreview.vue";
import SectionHeading from "../components/layout/SectionHeading.vue";
import MentorCard from "../components/mentors/MentorCard.vue";
import GalleryGrid from "../components/gallery/GalleryGrid.vue";
import FAQAccordion from "../components/shared/FAQAccordion.vue";
const advantages = [
  {
    icon: BookOpen,
    title: "Paham dari akarnya.",
    description:
      "Mulai dari konsep, temukan alur berpikirnya, lalu kerjakan soal dengan lebih terarah.",
  },
  {
    icon: Users,
    title: "Sendiri atau bersama.",
    description:
      "Pilih les privat untuk fokus personal, atau ajak teman dan belajar sebagai kelompok.",
  },
  {
    icon: Monitor,
    title: "Sesuaikan ritmemu.",
    description:
      "Online atau offline, 90 atau 120 menit. Kebutuhan dan waktu disepakati bersama.",
  },
];
</script>
<template>
  <HeroCarousel />
  <section class="container section advantages">
    <div class="advantage-intro">
      <span class="eyebrow">Lebih dari sekadar rumus</span>
      <h2>BELAJAR YANG<br />MASUK AKAL.</h2>
    </div>
    <article
      v-for="(item, i) in advantages"
      :key="item.title"
      class="advantage"
    >
      <div class="advantage-top">
        <component
          :is="item.icon"
          :size="23"
          :stroke-width="1.5"
          aria-hidden="true"
        /><span>0{{ i + 1 }}</span>
      </div>
      <h3>{{ item.title }}</h3>
      <p>{{ item.description }}</p>
    </article>
  </section>
  <section class="program-preview section section-border">
    <div class="container">
      <SectionHeading
        eyebrow="Pilih titik mulamu"
        title="DUA PROGRAM. BANYAK KEMUNGKINAN."
        link="/programs"
        link-label="Semua program & harga"
      />
      <div class="program-cards">
        <article
          v-for="program in programs"
          :key="program.id"
          class="program-card"
        >
          <div class="program-card-top">
            <span class="program-number">PROGRAM / {{ program.number }}</span
            ><span class="program-symbol" aria-hidden="true">{{
              program.symbol
            }}</span>
          </div>
          <h3>{{ program.name }}</h3>
          <p>{{ program.description }}</p>
          <ul class="topic-tags">
            <li v-for="topic in program.topics" :key="topic">{{ topic }}</li>
          </ul>
          <div class="program-card-bottom">
            <div>
              <span>Contoh harga privat</span
              ><strong
                >{{
                  formatPrice(
                    getSingleSessionPrice(program.id, "offline", 120, 1),
                  )
                }}<small> / mahasiswa / sesi</small></strong
              ><span>Offline · 120 menit · satuan · mahasiswa ITS</span>
            </div>
            <RouterLink
              :to="`/programs#${program.id}`"
              class="program-arrow"
              :aria-label="`Lihat program dan harga ${program.name}`"
              ><ArrowUpRight :size="23" aria-hidden="true"
            /></RouterLink>
          </div>
        </article>
      </div>
      <p class="pricing-preview-note">
        Belajar berkelompok? Bandingkan seluruh tarif per mahasiswa di halaman
        Programs & Pricing. Mahasiswa non-ITS: harga ITS +10% setelah
        pembulatan.
      </p>
    </div>
  </section>
  <section class="container section"><SchedulePreview /></section>
  <section class="container section section-border">
    <SectionHeading
      eyebrow="Teman berpikir, teman bertumbuh"
      title="KENALI MENTORMU."
      link="/mentors"
      link-label="Lihat semua mentor"
    />
    <p
      v-if="activeMentors.some((mentor) => mentor.demo)"
      class="section-description"
    >
      Pendamping belajar dimulai dari kebutuhanmu. Profil berikut masih berupa
      demo; identitas resmi menyusul setelah disetujui.
    </p>
    <div class="home-mentors">
      <MentorCard
        v-for="mentor in activeMentors.slice(0, 5)"
        :key="mentor.id"
        :mentor="mentor"
        compact
      />
    </div>
  </section>
  <section class="gallery-preview section section-border">
    <div class="container">
      <SectionHeading
        eyebrow="Catatan perjalanan"
        title="SEBUAH PROSES. SEBUAH CERITA."
        link="/gallery"
        link-label="Jelajahi galeri"
      /><GalleryGrid :items="visibleGallery.slice(0, 3)" />
      <p v-if="visibleGallery.some((item) => item.demo)" class="gallery-note">
        Ilustrasi demo orisinal. Dokumentasi kelas akan hadir setelah mendapat
        izin publikasi.
      </p>
    </div>
  </section>
  <section id="about" class="container section about-section section-border">
    <div class="about-art grid-pattern" aria-hidden="true">
      <span class="about-plus">+</span
      ><span class="about-equation"
        >Curiosity<br /><i>×</i> Practice<br /><i>=</i> Progress.</span
      ><span class="about-art-bottom"
        >THE PROCESS IS THE POINT. <MoveUpRight :size="40" :stroke-width="1"
      /></span>
    </div>
    <div class="about-copy">
      <span class="eyebrow">Tentang VGA Class</span>
      <h2>RUANG UNTUK<br />BERTANYA.<br /><span>BERANI PAHAM.</span></h2>
      <p>
        Kalkulus punya banyak simbol. Belajar seharusnya membantu kita menemukan
        maknanya.
      </p>
      <p>
        VGA Class menyediakan les Kalkulus 1 dan Kalkulus 2, terutama untuk
        mahasiswa ITS. Privat atau kelompok, online atau offline—kita mulai dari
        kebutuhan belajarmu.
      </p>
      <p>
        Mahasiswa kampus lain juga dapat bergabung. Materi, lokasi, jadwal, dan
        penempatan mentor dibicarakan bersama admin.
      </p>
      <RouterLink to="/programs" class="text-link"
        >Temukan cara belajarmu<ArrowUpRight :size="16" aria-hidden="true"
      /></RouterLink>
    </div>
  </section>
  <section id="faq" class="container section section-border faq-section">
    <div>
      <span class="eyebrow">Sebelum mulai</span>
      <h2 class="section-title">MASIH ADA<br />TANDA TANYA?</h2>
      <p class="muted">
        Mulai dari yang sering ditanyakan.<br />Sisanya bisa kita obrolkan
        bersama.
      </p>
      <span class="faq-decoration" aria-hidden="true">?</span>
    </div>
    <FAQAccordion />
  </section>
</template>
<style scoped>
.advantages {
  display: grid;
  grid-template-columns: 1.1fr repeat(3, 1fr);
  gap: 32px;
}
.advantage-intro h2 {
  font-size: 37px;
  color: var(--color-brand);
  margin-top: 16px;
}
.advantage-intro .eyebrow {
  font-size: 8px;
}
.advantage {
  border-left: 1px solid var(--color-line);
  padding-left: 28px;
}
.advantage-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--color-brand);
  margin-bottom: 22px;
}
.advantage-top span {
  color: var(--color-muted);
  font-size: 9px;
}
.advantage h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}
.advantage p {
  font-size: 12px;
  color: var(--color-muted);
  line-height: 1.8;
}
.program-preview {
  background: var(--color-warm);
}
.program-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.program-card {
  background: var(--color-paper);
  padding: 30px 32px;
  border-top: 3px solid var(--color-brand);
  position: relative;
  overflow: hidden;
}
.program-card:last-child {
  background: var(--color-surface);
}
.program-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  height: 48px;
}
.program-number {
  font-size: 9px;
  letter-spacing: 0.13em;
  color: var(--color-muted);
}
.program-symbol {
  font-family: Georgia, serif;
  font-style: italic;
  font-size: 80px;
  color: var(--color-ornament);
  position: absolute;
  top: 17px;
  right: 25px;
  line-height: 1;
}
.program-card h3 {
  font-family: var(--font-heading);
  color: var(--color-brand);
  font-size: 49px;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 16px;
}
.program-card > p {
  font-size: 12px;
  color: var(--color-muted);
  max-width: 385px;
}
.topic-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0;
  margin-block: 22px 28px;
  list-style: none;
}
.topic-tags li {
  font-size: 9px;
  padding: 4px 9px;
  border: 1px solid var(--color-line);
  border-radius: 2px;
}
.program-card-bottom {
  border-top: 1px solid var(--color-line);
  padding-top: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.program-card-bottom > div > span {
  display: block;
  font-size: 9px;
  color: var(--color-muted);
}
.program-card-bottom strong {
  display: block;
  font-size: 24px;
  color: var(--color-brand);
  margin-block: 4px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.program-card-bottom strong small {
  font-size: 9px;
  color: var(--color-muted);
  font-weight: 400;
}
.program-arrow {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: var(--color-brand);
  color: var(--color-surface);
  border-radius: var(--radius);
  flex-shrink: 0;
}
.program-arrow:hover {
  background: var(--color-brand-hover);
}
.pricing-preview-note {
  margin-top: 20px;
  font-size: 10px;
  color: var(--color-muted);
  max-width: none;
}
.section-description {
  font-size: 13px;
  color: var(--color-muted);
  margin-top: -14px;
  margin-bottom: 30px;
}
.home-mentors {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 18px;
}
.home-mentors :deep(.mentor-content) {
  padding: 18px 14px;
}
.home-mentors :deep(.mentor-title h3) {
  font-size: 23px;
}
.home-mentors :deep(.mentor-content p) {
  font-size: 9px;
}
.home-mentors :deep(.mentor-index) {
  font-size: 65px;
}
.gallery-preview {
  background: var(--color-warm);
}
.gallery-note {
  font-size: 10px;
  color: var(--color-muted);
  margin-top: 25px;
}
.about-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 90px;
  align-items: center;
}
.about-art {
  padding: 40px;
  position: relative;
  background-color: var(--color-warm);
  min-height: 440px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.about-plus {
  position: absolute;
  right: 25px;
  top: 8px;
  font-size: 70px;
  color: var(--color-brand);
  font-weight: 400;
  line-height: 1;
}
.about-equation {
  font-family: var(--font-heading);
  font-size: clamp(48px, 5vw, 72px);
  line-height: 1.15;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--color-brand);
}
.about-equation i {
  font-style: normal;
  color: var(--color-muted);
  font-weight: 400;
}
.about-art-bottom {
  margin-top: 38px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  font-size: 8px;
  letter-spacing: 0.11em;
  color: var(--color-brand);
}
.about-copy h2 {
  font-size: 56px;
  color: var(--color-brand);
  margin-block: 20px 26px;
}
.about-copy h2 > span {
  -webkit-text-stroke: 1px var(--color-brand);
  color: transparent;
}
.about-copy p {
  color: var(--color-muted);
  margin-bottom: 18px;
  font-size: 13px;
}
.about-copy .text-link {
  margin-top: 8px;
}
.faq-section {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 90px;
}
.faq-section > div > p {
  margin-top: 22px;
  font-size: 13px;
}
.faq-decoration {
  display: block;
  font-family: var(--font-heading);
  font-size: 140px;
  color: var(--color-line);
  font-weight: 600;
  line-height: 1;
  margin-top: 15px;
}
@media (max-width: 1023px) {
  .advantages {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
  .advantage-intro {
    grid-column: 1 / -1;
  }
  .advantage-intro h2 br {
    display: none;
  }
  .advantage-intro h2 {
    font-size: 40px;
  }
  .advantage {
    padding-left: 20px;
  }
  .home-mentors {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .home-mentors > :nth-child(n + 4) {
    display: none;
  }
  .about-section,
  .faq-section {
    gap: 40px;
  }
  .about-copy h2 {
    font-size: 44px;
  }
  .about-art {
    padding: 28px;
    min-height: 400px;
  }
  .program-card {
    padding: 26px;
  }
  .program-card-bottom strong {
    font-size: 22px;
  }
  .program-card-bottom strong small {
    display: block;
  }
}
@media (max-width: 767px) {
  .program-cards {
    grid-template-columns: 1fr;
  }
  .program-card-bottom strong small {
    display: inline;
  }
  .about-section {
    grid-template-columns: 1fr;
  }
  .about-art {
    min-height: 370px;
  }
  .about-equation {
    font-size: 62px;
  }
  .about-copy h2 {
    font-size: 52px;
  }
  .faq-section {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  .faq-decoration {
    display: none;
  }
}
@media (max-width: 639px) {
  .advantages {
    grid-template-columns: 1fr;
    gap: 28px;
  }
  .advantage-intro h2 {
    font-size: 36px;
  }
  .advantage {
    padding-left: 20px;
  }
  .advantage-top {
    margin-bottom: 12px;
  }
  .advantage p {
    max-width: 42ch;
  }
  .program-card {
    padding: 24px;
  }
  .program-symbol {
    font-size: 65px;
  }
  .program-card h3 {
    font-size: 43px;
  }
  .program-card-bottom strong {
    font-size: 24px;
  }
  .program-card-bottom strong small {
    display: block;
  }
  .home-mentors {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  .home-mentors > :nth-child(3) {
    display: none;
  }
  .about-art {
    min-height: 340px;
  }
  .about-equation {
    font-size: 55px;
  }
}
</style>
