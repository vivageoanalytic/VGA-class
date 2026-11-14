<script setup lang="ts">
import SiteHeader from "./components/layout/SiteHeader.vue";
import SiteFooter from "./components/layout/SiteFooter.vue";
</script>

<template>
  <a class="skip-link" href="#main">Lewati ke konten utama</a>
  <SiteHeader />
  <main id="main" tabindex="-1"><RouterView /></main>
  <SiteFooter />
</template>

<style scoped>
main {
  outline: none;
  min-height: 50vh;
}
</style>
