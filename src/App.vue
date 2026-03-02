<script setup>
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="master-layout">
    <nav class="global-nav">
      <div class="nav-brand">✨ ComfyUI Pro Studio</div>
      <div class="nav-links">
        <RouterLink to="/" class="nav-item" active-class="active">🎨 Text-to-Image</RouterLink>
        <RouterLink to="/upscaler" class="nav-item" active-class="active">🔍 Upscaler</RouterLink>
      </div>
    </nav>

    <div class="page-content">
      <RouterView />
    </div>
  </div>
</template>

<style>
/* Reset Global jika perlu */
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #0f1115;
}

.master-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

.global-nav {
  height: 50px;
  background-color: #181b21;
  border-bottom: 1px solid #2f333d;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 100;
}

.nav-brand {
  font-weight: bold;
  color: #e0e0e0;
  letter-spacing: 1px;
}

.nav-links {
  display: flex;
  gap: 15px;
}

.nav-item {
  color: #8a8d95;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
  transition: 0.2s;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.nav-item.active {
  background: rgba(39, 174, 96, 0.15);
  color: #27ae60;
}

/* Pastikan page-content mengambil sisa tinggi viewport */
.page-content {
  flex: 1;
  height: calc(100vh - 50px);
  position: relative;
}

/* Pertahankan CSS dari App.vue lama Anda secara global atau pindahkan ke file css tersendiri */
</style>
