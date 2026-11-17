<script setup lang="ts">
import { ref } from "vue";
import { ArrowUpRight } from "lucide-vue-next";
import type { Mentor } from "../../content/mentors";
import MentorProfileDialog from "./MentorProfileDialog.vue";
defineProps<{ mentor: Mentor; compact?: boolean }>();
const profile = ref<InstanceType<typeof MentorProfileDialog>>();
</script>
<template>
  <article class="mentor-card" :class="mentor.marker">
    <button
      type="button"
      class="mentor-trigger"
      :aria-label="`Lihat profil lengkap ${mentor.name}`"
      aria-haspopup="dialog"
      @click="profile?.open()"
    >
      <span class="mentor-portrait"
        ><img
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
        }}</span></span
      >
      <span class="mentor-content"
        ><span class="mentor-title"
          ><span class="mentor-name">{{ mentor.name }}</span
          ><ArrowUpRight :size="22" aria-hidden="true" /></span
        ><span class="mentor-bio">{{
          compact && mentor.demo
            ? "Identitas resmi segera diperbarui."
            : mentor.bio
        }}</span
        ><span
          class="competencies"
          v-if="mentor.publicationApproved && mentor.competencies.length"
          ><span v-for="item in mentor.competencies" :key="item">{{
            item
          }}</span></span
        ><span class="mentor-profile-link"
          >Lihat profil lengkap
          <ArrowUpRight :size="17" aria-hidden="true" /></span
      ></span>
    </button>
    <MentorProfileDialog ref="profile" :mentor="mentor" />
  </article>
</template>
<style scoped>
.mentor-card {
  min-width: 0;
  background: var(--color-surface);
  border-bottom: 3px solid var(--mentor-color, var(--color-brand));
  transition: box-shadow 0.2s;
}
.mentor-card:hover {
  box-shadow: var(--shadow);
}
.mentor-trigger {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  text-align: left;
  background: transparent;
  color: inherit;
}
.mentor-trigger:focus-visible {
  outline-offset: 4px;
}
.mentor-portrait {
  display: block;
  position: relative;
  overflow: hidden;
  background: var(--mentor-soft, var(--color-warm));
}
.mentor-portrait::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: 0;
  border-bottom: 45px solid var(--mentor-color, var(--color-brand));
  border-left: 45px solid transparent;
}
.mentor-portrait img {
  aspect-ratio: 6/6.4;
  width: 100%;
  object-fit: cover;
  mix-blend-mode: multiply;
  transition: transform 0.3s;
}
.mentor-trigger:hover .mentor-portrait img {
  transform: scale(1.025);
}
.mentor-portrait .badge {
  position: absolute;
  left: 14px;
  top: 14px;
  background: var(--color-paper);
  color: var(--mentor-color, var(--color-brand));
  font-size: 13px;
}
.mentor-index {
  position: absolute;
  right: 15px;
  bottom: 2px;
  font-size: 90px;
  color: var(--mentor-color, var(--color-brand));
  opacity: 0.2;
  line-height: 1;
}
.mentor-content {
  display: block;
  padding: 20px;
}
.mentor-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  color: var(--mentor-color, var(--color-brand));
}
.mentor-name {
  font: 400 40px/1.1 var(--font-heading);
  font-stretch: 75%;
  font-synthesis: none;
  text-transform: uppercase;
}
.mentor-bio {
  display: block;
  margin-top: 12px;
  font-size: var(--text-body);
  color: var(--color-muted);
  line-height: 1.6;
}
.competencies {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}
.competencies span {
  font-size: var(--text-caption);
  background: var(--mentor-soft, var(--color-warm));
  color: var(--mentor-color, var(--color-brand));
  padding: 4px 8px;
}
.mentor-profile-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-top: 1px solid var(--color-line);
  padding-top: 16px;
  margin-top: 20px;
  color: var(--mentor-color, var(--color-brand));
  font-size: var(--text-small);
  font-weight: 700;
}
@media (max-width: 479px) {
  .mentor-content {
    padding: 18px;
  }
  .mentor-name {
    font-size: 36px;
  }
  .mentor-profile-link {
    font-size: var(--text-caption);
  }
  .mentor-portrait .badge {
    left: 10px;
    top: 10px;
  }
}
</style>
