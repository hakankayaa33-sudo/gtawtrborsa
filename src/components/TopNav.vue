<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useTheme } from '../composables/useTheme'
import { useMarket } from '../composables/useMarket'

const props = defineProps(['activeScreen'])
const emit = defineEmits(['navigate', 'open-auth', 'open-admin'])

const { currentUser, logoutUser } = useAuth()
const { isLight, toggleTheme } = useTheme()
const { getAllStocks } = useMarket()

const searchQuery = ref('')

function searchStocks(query) {
  searchQuery.value = query.toLowerCase()
  document.querySelectorAll('.grid .card').forEach(card => {
    const text = card.innerText.toLowerCase()
    card.style.display = text.includes(searchQuery.value) ? '' : 'none'
  })
}

function checkAdminAccess() {
  // Eğer halihazırda danieladmin hesabıyla giriş yapılmışsa direkt yönlendir:
  if (currentUser.value === 'danieladmin') {
    emit('navigate', 'admin')
    return
  }
  // Giriş yapılmamışsa prompt ile sor:
  const user = prompt('Güvenli Bölge. Lütfen yetkili kullanıcı adınızı girin:')
  if (user === null) return
  const pass = prompt('Lütfen yetkili şifrenizi girin:')
  if (pass === null) return
  
  if (user === 'danieladmin' && pass === 'danieladmin') emit('navigate', 'admin')
  else alert('Hatalı kullanıcı adı veya şifre! Sadece yetkililer girebilir.')
}

function handleLogout() {
  logoutUser()
  if (['portfolio', 'watchlist', 'history'].includes(props.activeScreen)) {
    emit('navigate', 'dashboard')
  }
}
</script>

<template>
  <div class="top-nav">
    <input
      type="text"
      class="search-box"
      placeholder="Hisse Ara (Örn: LSC)..."
      @input="searchStocks($event.target.value)"
    />
    <span v-if="currentUser" class="user-info-text">Yatırımcı: @{{ currentUser }}</span>
    <button class="nav-btn" @click="toggleTheme">TEMA</button>
    <button v-if="currentUser" class="nav-btn" :class="{ active: activeScreen === 'portfolio' }" @click="emit('navigate', 'portfolio')">PORTFÖYÜM</button>
    <button v-if="currentUser" class="nav-btn" :class="{ active: activeScreen === 'watchlist' }" @click="emit('navigate', 'watchlist')">İZLEME LİSTESİ</button>
    <button v-if="currentUser" class="nav-btn" :class="{ active: activeScreen === 'history' }" @click="emit('navigate', 'history')">İŞLEM GEÇMİŞİ</button>
    <button class="nav-btn" :class="{ active: activeScreen === 'compare' }" @click="emit('navigate', 'compare')">KARŞILAŞTIR</button>
    <button class="nav-btn" :class="{ active: activeScreen === 'dashboard' }" @click="emit('navigate', 'dashboard')">TERMINAL EKRANI</button>
    <button v-if="!currentUser" class="nav-btn" @click="emit('open-auth')">ÜYE GİRİŞİ / KAYIT</button>
    <button v-if="currentUser" class="nav-btn" @click="handleLogout">ÇIKIŞ YAP</button>
    <button class="nav-btn" @click="checkAdminAccess">YETKİLİ GİRİŞİ</button>
  </div>
</template>
