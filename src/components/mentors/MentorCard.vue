<script setup lang="ts">
import { ArrowUpRight } from "lucide-vue-next";
import type { Mentor } from "../../content/mentors";
defineProps<{ mentor: Mentor; compact?: boolean }>();
</script>
<template>
  <article class="mentor-card" :class="mentor.marker">
    <div class="mentor-portrait">
      <img
        :src="mentor.photo"
        :alt="
          mentor.demo
            ? `Foto placeholder ${mentor.name}, bukan identitas mentor asli`
            : `Foto ${mentor.name}`
        "
        width="600"
        height="700"
        loading="lazy"
      /><span v-if="mentor.demo" class="badge">Profil demo</span
      ><span class="mentor-index display" aria-hidden="true">{{
        mentor.id.replace("mentor-", "").padStart(2, "0")
      }}</span>
    </div>
    <div class="mentor-content">
      <div class="mentor-title">
        <h3>{{ mentor.name }}</h3>
        <ArrowUpRight :size="17" aria-hidden="true" />
      </div>
      <p v-if="!compact">{{ mentor.bio }}</p>
      <p v-else class="small muted">
        {{ mentor.demo ? "Identitas resmi segera diperbarui." : mentor.bio }}
      </p>
      <div v-if="mentor.competencies.length" class="competencies">
        <span v-for="item in mentor.competencies" :key="item">{{ item }}</span>
      </div>
      <p v-if="mentor.experience && mentor.publicationApproved" class="small">
        {{ mentor.experience }}
      </p>
    </div>
  </article>
</template>
<style scoped>
.mentor-card {
  min-width: 0;
  background: var(--color-surface);
  border-bottom: 3px solid var(--mentor-color);
}
.mentor-portrait {
  position: relative;
  overflow: hidden;
  background: var(--mentor-soft);
}
.mentor-portrait::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: 0;
  border-bottom: 45px solid var(--mentor-color);
  border-left: 45px solid transparent;
}
.mentor-portrait img {
  aspect-ratio: 6/6.4;
  width: 100%;
  object-fit: cover;
  mix-blend-mode: multiply;
}
.mentor-portrait .badge {
  position: absolute;
  left: 14px;
  top: 14px;
  background: var(--color-paper);
  color: var(--mentor-color);
  font-size: 8px;
}
.mentor-index {
  position: absolute;
  right: 15px;
  bottom: 2px;
  font-size: 90px;
  color: var(--mentor-color);
  opacity: 0.2;
  line-height: 1;
}
.mentor-content {
  padding: 20px;
}
.mentor-title {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--mentor-color);
}
.mentor-title h3 {
  font-family: var(--font-heading);
  font-size: 26px;
  font-weight: 600;
  text-transform: uppercase;
}
.mentor-content p {
  margin-top: 10px;
  font-size: 12px;
  color: var(--color-muted);
}
.competencies {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
.competencies span {
  font-size: 10px;
  background: var(--mentor-soft);
  color: var(--mentor-color);
  padding: 3px 6px;
}
</style>
