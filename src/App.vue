<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
const { loadMemory, simulateTick, getAllStocks, saveMemory, tickVersion } = useMarket()
const { loadUserData, currentUser } = useAuth()
const { loadFinanceData, saveFinanceData, userWallets, userPortfolios, logTransaction, getBalance } = useFinance()
const { loadNews, addNews } = useNews()

const activeScreen = ref('dashboard')
const activeModalStockId = ref(null)
const showAuthModal = ref(false)

let tickInterval = null

const exchangeRates = ref(null)
async function fetchRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (!res.ok) return
    const data = await res.json()
    exchangeRates.value = data.rates
  } catch (e) {
    console.error('Kur verisi çekilemedi:', e)
  }
}

const tickerStocks = computed(() => {
  // Borsadaki her fiyat değişiminde (tick) şeridin güncellenmesini sağlıyoruz
  tickVersion.value
  return getAllStocks().map(s => {
    const current = s.data[s.data.length - 1]
    const start = s.data[0]
    const chg = start === 0 ? 0 : ((current - start) / start) * 100
    return {
      ticker: s.ticker,
      price: current.toFixed(2),
      chg: chg.toFixed(2),
      isUp: chg >= 0
    }
  })
})

function navigate(screen) {
  activeScreen.value = screen
}

function openModal(stockId) {
  if (window.playClickSound) window.playClickSound();
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
      logTransaction,
      addNews
    })
    saveMemory()
  }
}

onMounted(() => {
  loadTheme()
  loadUserData()
  loadFinanceData()
  loadNews()
  loadMemory()
  tickInterval = setInterval(tick, 1000)
  fetchRates()
})

onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval)
})
</script>

<template>
  <div style="background-color: #050505; color: #a0a0a0; text-align: center; padding: 8px; font-size: 11px; font-family: 'Courier New', monospace; letter-spacing: 1px; position: relative; z-index: 9999; width: 100%; border-bottom: 1px solid #222;">
    GTA WORLD TÜRKİYE İÇİN HAZIRLANMIŞTIR. CREDITS: <a href="https://forum-tr.gta.world/index.php?/profile/1162-saint-vor/" target="_blank" style="color: #2ecc71; text-decoration: none;">VOR*</a>
  </div>

  <!-- Canlı Borsa Kayan Şeridi (Ticker) -->
  <marquee class="stock-ticker" scrollamount="6" onmouseover="this.stop();" onmouseout="this.start();" style="background-color: #0a0a0a; color: #e0e0e0; padding: 8px 0; border-bottom: 1px solid #333; font-family: 'Courier New', monospace; font-size: 13px; display: block; margin: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
    <span v-for="stock in tickerStocks" :key="stock.ticker" style="margin-right: 40px;">
      <strong>{{ stock.ticker }}</strong> ${{ stock.price }}
      <span :style="{ color: stock.isUp ? '#2ecc71' : '#e74c3c' }">
        {{ stock.isUp ? '▲ +' : '▼ ' }}{{ stock.chg }}%
      </span>
    </span>
  </marquee>

  <!-- Küresel Döviz Kurları Şeridi -->
  <marquee v-if="exchangeRates" class="stock-ticker" scrollamount="5" onmouseover="this.stop();" onmouseout="this.start();" style="background-color: #0a0a0a; color: #d4d4d4; padding: 8px 0; border-bottom: 1px solid #333; font-family: 'Courier New', monospace; font-size: 13px; display: block; margin: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
    <span style="margin-right: 30px; font-weight: bold; color: #888;">KÜRESEL DÖVİZ (1 USD):</span>
    <span style="margin-right: 30px;">EUR: <span style="color: #e74c3c;">▼ €{{ exchangeRates.EUR.toFixed(2) }}</span></span>
    <span style="margin-right: 30px;">GBP: <span style="color: #2ecc71;">▲ £{{ exchangeRates.GBP.toFixed(2) }}</span></span>
    <span style="margin-right: 30px;">CAD: <span style="color: #e74c3c;">▼ C${{ exchangeRates.CAD.toFixed(2) }}</span></span>
    <span style="margin-right: 30px;">JPY: <span style="color: #2ecc71;">▲ ¥{{ exchangeRates.JPY.toFixed(2) }}</span></span>
    <span style="margin-right: 30px;">AUD: <span style="color: #e74c3c;">▼ A${{ exchangeRates.AUD.toFixed(2) }}</span></span>
    <span style="margin-right: 30px;">CHF: <span style="color: #2ecc71;">▲ ₣{{ exchangeRates.CHF.toFixed(2) }}</span></span>
    <span style="margin-right: 30px;">CNY: <span style="color: #e74c3c;">▼ ¥{{ exchangeRates.CNY.toFixed(2) }}</span></span>
    <span style="margin-right: 30px;">MXN: <span style="color: #2ecc71;">▲ ${{ exchangeRates.MXN.toFixed(2) }}</span></span>
  </marquee>

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
