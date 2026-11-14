<template>
  <section class="container section not-found">
    <span class="eyebrow">404 / Di luar domain</span
    ><span class="error-equation" aria-hidden="true">lim f(x) = ?</span>
    <h1>HALAMAN INI<br />BELUM TERDEFINISI.</h1>
    <p class="muted">
      Alamat yang kamu cari tidak ditemukan. Yuk, kembali ke halaman yang sudah
      pasti.
    </p>
    <RouterLink to="/" class="button">Kembali ke beranda ↗</RouterLink>
  </section>
</template>
<style scoped>
.not-found {
  position: relative;
  overflow: hidden;
}
.not-found h1 {
  font-size: clamp(52px, 8vw, 100px);
  color: var(--color-brand);
  margin: 32px 0 24px;
}
.not-found p {
  max-width: 450px;
  margin-bottom: 32px;
}
.error-equation {
  position: absolute;
  right: 0;
  top: 30%;
  font-family: Georgia, serif;
  font-size: 100px;
  color: var(--color-line);
  z-index: -1;
}
</style>
