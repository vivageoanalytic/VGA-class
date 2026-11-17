<script setup lang="ts">
import { Info, Compass, MessagesSquare, CalendarDays } from "lucide-vue-next";
import { activeMentors } from "../content/mentors";
import MentorCard from "../components/mentors/MentorCard.vue";
</script>
<template>
  <div class="container">
    <header class="page-heading">
      <span class="eyebrow"
        ><RouterLink to="/">Home</RouterLink> / Mentors</span
      >
      <h1>BELAJAR BERSAMA.<br />PAHAM LEBIH DALAM.</h1>
      <p>
        Kenali pendamping belajarmu. Kebutuhan materi, cara belajar, dan jadwal
        didiskusikan bersama admin sebelum penempatan mentor.
      </p>
    </header>
    <div v-if="activeMentors.some((m) => m.demo)" class="notice">
      <Info :size="18" aria-hidden="true" />
      <p>
        <strong>Profil demo.</strong> Lima kartu berikut adalah placeholder.
        Nama, foto, kompetensi, dan pengalaman resmi menunggu persetujuan
        publikasi.
      </p>
    </div>
    <div class="mentors-grid">
      <MentorCard
        v-for="mentor in activeMentors"
        :key="mentor.id"
        :mentor="mentor"
      />
    </div>
    <section class="mentor-process section section-border">
      <div>
        <span class="eyebrow">Pendamping yang sesuai</span>
        <h2 class="section-title">DIMULAI DARI<br />KEBUTUHANMU.</h2>
      </div>
      <ol>
        <li>
          <Compass :size="22" aria-hidden="true" />
          <div>
            <h3>01 / Ceritakan tujuanmu</h3>
            <p>
              Materi yang ingin dipahami, target latihan, dan ritme belajarmu.
            </p>
          </div>
        </li>
        <li>
          <MessagesSquare :size="22" aria-hidden="true" />
          <div>
            <h3>02 / Diskusikan bersama</h3>
            <p>Admin membantu membicarakan program dan penempatan mentor.</p>
          </div>
        </li>
        <li>
          <CalendarDays :size="22" aria-hidden="true" />
          <div>
            <h3>03 / Sepakati jadwal</h3>
            <p>
              Waktu, mode, dan lokasi dikonfirmasi bersama melalui WhatsApp.
            </p>
          </div>
        </li>
      </ol>
    </section>
  </div>
</template>
<style scoped>
.mentors-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
  padding-block: 40px 64px;
}
.mentor-process {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
}
.mentor-process ol {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 28px;
}
.mentor-process li {
  display: flex;
  gap: 18px;
}
.mentor-process li svg {
  color: var(--color-brand);
}
.mentor-process h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 10px;
}
.mentor-process li p {
  color: var(--color-muted);
  font-size: 16px;
}
@media (max-width: 767px) {
  .mentors-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
  }
  .mentor-process {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}
@media (max-width: 479px) {
  .mentors-grid {
    gap: 16px 12px;
  }
  .mentors-grid :deep(.mentor-content) {
    padding: 14px;
  }
  .mentors-grid :deep(.mentor-title h3) {
    font-size: 23px;
  }
  .mentors-grid :deep(.mentor-content p) {
    font-size: 14px;
  }
}
</style>
