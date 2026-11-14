<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  link?: string;
  linkLabel?: string;
}>();
</script>
<template>
  <div class="split-heading">
    <div>
      <span class="eyebrow">{{ eyebrow }}</span>
      <h2 class="section-title">
        {{ title }}<span class="heading-symbol" aria-hidden="true">↗</span>
      </h2>
    </div>
    <RouterLink v-if="link" :to="link" class="text-link"
      >{{ linkLabel || "Lihat selengkapnya"
      }}<span aria-hidden="true">↗</span></RouterLink
    ><slot />
  </div>
</template>
<style scoped>
.heading-symbol {
  display: inline-block;
  font-family: var(--font-body);
  font-weight: 400;
  color: var(--color-line);
  font-size: 0.7em;
  margin-left: 18px;
}
</style>
