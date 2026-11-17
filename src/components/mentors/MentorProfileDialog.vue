<script setup lang="ts">
import { computed, ref } from "vue";
import {
  X,
  ExternalLink,
  GraduationCap,
  BookOpen,
  FileText,
} from "lucide-vue-next";
import type { Mentor } from "../../content/mentors";
import { getPublicCvUrl } from "../../utils/mentorProfile";
const props = defineProps<{ mentor: Mentor }>();
const dialog = ref<HTMLDialogElement>();
const approved = computed(
  () => props.mentor.publicationApproved && !props.mentor.demo,
);
const cv = computed(() => getPublicCvUrl(props.mentor));
let opener: HTMLElement | null = null;
function open() {
  opener =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  dialog.value?.showModal();
}
function closed() {
  opener?.focus({ preventScroll: true });
}
defineExpose({ open });
</script>

<template>
  <dialog
    ref="dialog"
    class="mentor-dialog"
    :class="mentor.marker"
    :aria-labelledby="`${mentor.id}-profile-title`"
    :aria-describedby="`${mentor.id}-profile-summary`"
    @close="closed"
    @click="$event.target === dialog && dialog?.close()"
  >
    <div class="profile-toolbar">
      <span class="eyebrow">Profil mentor VGA Class</span
      ><button
        class="icon-button"
        type="button"
        autofocus
        :aria-label="`Tutup profil ${mentor.name}`"
        @click="dialog?.close()"
      >
        <X :size="22" aria-hidden="true" />
      </button>
    </div>
    <div class="profile-layout">
      <div class="profile-sidebar">
        <img
          :src="mentor.photo"
          :alt="
            mentor.demo
              ? `Foto placeholder ${mentor.name}`
              : `Foto ${mentor.name}`
          "
          width="600"
          height="700"
        /><span v-if="mentor.demo" class="badge">Profil demo · placeholder</span
        ><span v-else class="badge badge-neutral">Mentor VGA Class</span>
      </div>
      <div class="profile-main">
        <h2 :id="`${mentor.id}-profile-title`">
          {{ approved ? mentor.fullName || mentor.name : mentor.name }}
        </h2>
        <p :id="`${mentor.id}-profile-summary`" class="profile-intro">
          {{
            approved
              ? mentor.introduction || mentor.bio
              : "Identitas lengkap dan CV mentor akan ditampilkan setelah data resmi serta izin publikasi tersedia."
          }}
        </p>
        <div v-if="mentor.demo" class="profile-demo-note">
          Ini contoh tampilan profil. Tidak ada nama, pendidikan, atau
          pengalaman rekaan.
        </div>
        <div class="profile-details">
          <section>
            <h3><GraduationCap :size="20" aria-hidden="true" />Pendidikan</h3>
            <ul v-if="approved && mentor.education?.length">
              <li
                v-for="item in mentor.education"
                :key="`${item.institution}-${item.program}`"
              >
                <strong>{{ item.institution }}</strong><span>{{
                  [item.degree, item.program].filter(Boolean).join(" · ")
                }}</span>
              </li>
            </ul>
            <p v-else class="profile-placeholder">
              Informasi pendidikan belum dipublikasikan.
            </p>
          </section>
          <section>
            <h3>
              <BookOpen :size="20" aria-hidden="true" />Kompetensi & pengalaman
            </h3>
            <div
              v-if="approved && mentor.competencies.length"
              class="profile-tags"
            >
              <span v-for="course in mentor.competencies" :key="course">{{
                course
              }}</span>
            </div>
            <p v-if="approved && mentor.experience">{{ mentor.experience }}</p>
            <p v-else class="profile-placeholder">
              Kompetensi dan pengalaman mengajar belum dipublikasikan.
            </p>
          </section>
        </div>
        <div class="profile-cv">
          <div>
            <h3><FileText :size="20" aria-hidden="true" />Curriculum vitae</h3>
            <p>Kenali latar belakang dan pengalaman mentor lebih jauh.</p>
          </div>
          <a
            v-if="cv"
            :href="cv"
            class="button"
            target="_blank"
            rel="noopener noreferrer"
            >Lihat CV<ExternalLink :size="17" aria-hidden="true" /><span
              class="sr-only"
            >
              (buka tab baru)</span
            ></a
          ><button v-else class="button button-outline" type="button" disabled>
            CV belum tersedia
          </button>
        </div>
        <RouterLink
          class="text-link profile-schedule"
          :to="{ path: '/schedule', query: { mentor: mentor.id } }"
          @click="dialog?.close()"
          >Lihat jadwal mentor<ExternalLink :size="16" aria-hidden="true"
        /></RouterLink>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.mentor-dialog {
  width: min(1000px, calc(100% - 32px));
  max-height: calc(100dvh - 32px);
  padding: 0;
  margin: auto;
  border: 0;
  border-top: 5px solid var(--mentor-color, var(--color-brand));
  background: var(--color-paper);
  color: var(--color-ink);
  box-shadow: var(--shadow);
}
.mentor-dialog::backdrop {
  background: color-mix(in srgb, var(--color-ink) 78%, transparent);
}
.profile-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 28px;
  border-bottom: 1px solid var(--color-line);
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--color-paper);
}
.profile-toolbar .eyebrow {
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
}
.profile-layout {
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  gap: 32px;
  padding: 32px;
}
.profile-sidebar img {
  width: 100%;
  aspect-ratio: 6/7;
  object-fit: cover;
  background: var(--mentor-soft, var(--color-warm));
}
.profile-sidebar .badge {
  margin-top: 16px;
  text-transform: none;
  letter-spacing: 0;
}
.profile-main h2 {
  color: var(--mentor-color, var(--color-brand));
  font-size: clamp(44px, 5vw, 64px);
  margin-bottom: 16px;
}
.profile-intro {
  font-size: var(--text-lead);
  line-height: 1.6;
}
.profile-demo-note {
  margin-top: 18px;
  padding: 14px 16px;
  border-left: 3px solid var(--color-brand);
  background: var(--color-warm);
  font-size: var(--text-small);
}
.profile-details {
  display: grid;
  gap: 24px;
  margin-top: 28px;
}
.profile-details section {
  border-top: 1px solid var(--color-line);
  padding-top: 20px;
}
.profile-main h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  font: 700 var(--text-body)/1.4 var(--font-body);
  margin-bottom: 12px;
}
.profile-main h3 svg {
  color: var(--mentor-color, var(--color-brand));
}
.profile-placeholder {
  color: var(--color-muted);
  font-size: var(--text-small);
}
.profile-details ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}
.profile-details li strong,
.profile-details li span {
  display: block;
}
.profile-details li span {
  color: var(--color-muted);
  margin-top: 4px;
}
.profile-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.profile-tags span {
  padding: 5px 10px;
  background: var(--mentor-soft, var(--color-warm));
  color: var(--mentor-color, var(--color-brand));
  font-size: var(--text-small);
}
.profile-cv {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid var(--color-line);
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
}
.profile-cv p {
  font-size: var(--text-small);
  color: var(--color-muted);
}
.profile-schedule {
  margin-top: 24px;
}
@media (max-width: 767px) {
  .profile-layout {
    grid-template-columns: minmax(0, 1fr);
    padding: 24px 20px;
    gap: 24px;
  }
  .profile-sidebar {
    display: flex;
    align-items: flex-end;
    gap: 16px;
  }
  .profile-sidebar img {
    width: 120px;
  }
  .profile-sidebar .badge {
    margin-bottom: 4px;
  }
  .profile-toolbar {
    padding: 16px 20px;
  }
  .profile-toolbar .eyebrow {
    font-size: 13px;
  }
  .profile-cv {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
