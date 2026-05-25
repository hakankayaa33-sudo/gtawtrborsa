<script setup>
import { ref } from 'vue'

const isMobileView = ref(false)
const targetUrl = ref('http://localhost:5177/')
</script>

<template>
  <div class="preview-container">
    <div class="toolbar">
      <h2>🌐 Site Önizleme Paneli</h2>
      <button class="toggle-btn" @click="isMobileView = !isMobileView">
        <span v-if="isMobileView">🖥️ Masaüstü Görünüme Geç</span>
        <span v-else>📱 Mobil Görünüme Geç</span>
      </button>
    </div>
    
    <div class="iframe-container" :class="{ 'mobile-view': isMobileView }">
      <iframe :src="targetUrl" title="Site Önizleme"></iframe>
    </div>
  </div>
</template>

<style scoped>
.preview-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: #121212;
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
  background-color: #1a1a1a;
  border-bottom: 1px solid #333;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.toolbar h2 {
  margin: 0;
  color: #fff;
  font-size: 1.2rem;
}

.toggle-btn {
  background-color: #3498db;
  color: #fff;
  border: none;
  padding: 10px 20px;
  font-size: 15px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
  font-weight: bold;
}

.toggle-btn:hover {
  background-color: #2980b9;
}

.iframe-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #0a0a0a;
  transition: all 0.3s ease;
  padding: 0;
}

.iframe-container iframe {
  width: 100%;
  height: 100%;
  border: none;
  background-color: #1a1a1a;
  transition: all 0.3s ease;
}

.iframe-container.mobile-view {
  padding: 20px;
}

.iframe-container.mobile-view iframe {
  width: 400px;
  height: 800px;
  border: 12px solid #2c3e50;
  border-radius: 40px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}
</style>
