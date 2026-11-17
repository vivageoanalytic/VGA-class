<script setup lang="ts">
import { faqs } from "../../content/faq";
</script>
<template>
  <div class="faq-list">
    <details v-for="(faq, index) in faqs" :key="faq.question">
      <summary>
        <span class="faq-number">0{{ index + 1 }}</span
        ><span>{{ faq.question }}</span
        ><span class="faq-plus" aria-hidden="true">+</span>
      </summary>
      <p>{{ faq.answer }}</p>
    </details>
  </div>
</template>
<style scoped>
.faq-list {
  border-top: 1px solid var(--color-line);
}
details {
  border-bottom: 1px solid var(--color-line);
}
summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 22px;
  padding: 24px 0;
  font-size: 16px;
  font-weight: 600;
}
summary::-webkit-details-marker {
  display: none;
}
.faq-number {
  color: var(--color-muted);
  font-size: 14px;
  font-weight: 400;
}
.faq-plus {
  margin-left: auto;
  font-size: 25px;
  font-weight: 400;
  color: var(--color-brand);
}
details[open] .faq-plus {
  transform: rotate(45deg);
}
details p {
  margin: 0 35px 24px;
  color: var(--color-muted);
  font-size: 16px;
}
@media (max-width: 639px) {
  summary {
    font-size: 16px;
    gap: 14px;
    padding: 20px 0;
  }
  details p {
    margin-left: 28px;
    margin-right: 15px;
  }
}
</style>
