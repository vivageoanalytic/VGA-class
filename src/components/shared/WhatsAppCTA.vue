<script setup lang="ts">
import { MessageCircle } from "lucide-vue-next";
import { brand } from "../../content/brand";
withDefaults(defineProps<{ label?: string; light?: boolean }>(), {
  label: "Diskusi via WhatsApp",
});
</script>

<template>
  <a
    v-if="brand.whatsappUrl"
    :href="brand.whatsappUrl"
    class="button"
    :class="{ 'button-light': light }"
    target="_blank"
    rel="noopener noreferrer"
  >
    <MessageCircle :size="17" aria-hidden="true" />{{ label
    }}<span class="sr-only"> (buka tab baru)</span>
  </a>
  <button
    v-else
    type="button"
    disabled
    class="button button-disabled"
    :class="{ 'button-light': light }"
    title="Nomor WhatsApp resmi belum tersedia"
  >
    <MessageCircle :size="17" aria-hidden="true" />Kontak segera tersedia
  </button>
</template>
