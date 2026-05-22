<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import ToastContainer from './components/ToastContainer.vue'
import TopNav from './components/TopNav.vue'
import DashboardScreen from './components/screens/DashboardScreen.vue'
import PortfolioScreen from './components/screens/PortfolioScreen.vue'
import WatchlistScreen from './components/screens/WatchlistScreen.vue'
import HistoryScreen from './components/screens/HistoryScreen.vue'
import CompareScreen from './components/screens/CompareScreen.vue'
import AdminScreen from './components/screens/AdminScreen.vue'
import DetailModal from './components/modals/DetailModal.vue'
import AuthModal from './components/modals/AuthModal.vue'

import { useTheme } from './composables/useTheme'
import { useMarket } from './composables/useMarket'
import { useAuth } from './composables/useAuth'
import { useFinance } from './composables/useFinance'
import { useNews } from './composables/useNews'

const { loadTheme } = useTheme()
const { loadMemory, simulateTick, getAllStocks } = useMarket()
const { loadUserData, currentUser } = useAuth()
const { loadFinanceData, saveFinanceData, userWallets, userPortfolios, logTransaction, getBalance } = useFinance()
const { loadNews } = useNews()

const activeScreen = ref('dashboard')
const activeModalStockId = ref(null)
const showAuthModal = ref(false)

let tickInterval = null

function navigate(screen) {
  activeScreen.value = screen
}

function openModal(stockId) {
  activeModalStockId.value = stockId
}

function closeModal() {
  activeModalStockId.value = null
}

function openAuth() {
  showAuthModal.value = true
}

function tick() {
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  const isOpen = mins >= 390 && mins < 1080
  if (isOpen) {
    simulateTick({
      currentUser: currentUser.value,
      userPortfolios: userPortfolios.value,
      userWallets: userWallets.value,
      saveFinanceData,
      logTransaction
    })
  }
}

onMounted(() => {
  loadTheme()
  loadUserData()
  loadFinanceData()
  loadNews()
  loadMemory()
  tickInterval = setInterval(tick, 1000)
})

onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval)
})
</script>

<template>
  <ToastContainer />
  <TopNav
    :activeScreen="activeScreen"
    @navigate="navigate"
    @open-auth="openAuth"
  />

  <DashboardScreen v-show="activeScreen === 'dashboard'" @open-modal="openModal" />
  <PortfolioScreen v-show="activeScreen === 'portfolio'" />
  <WatchlistScreen v-show="activeScreen === 'watchlist'" @open-modal="openModal" />
  <HistoryScreen v-show="activeScreen === 'history'" />
  <CompareScreen v-show="activeScreen === 'compare'" />
  <AdminScreen v-show="activeScreen === 'admin'" />

  <DetailModal
    v-if="activeModalStockId"
    :stockId="activeModalStockId"
    @close="closeModal"
  />
  <AuthModal
    v-if="showAuthModal"
    @close="showAuthModal = false"
  />
</template>
