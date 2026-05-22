<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import StockCard from '../StockCard.vue'
import { useMarket } from '../../composables/useMarket'
import { useFinance } from '../../composables/useFinance'
import { useNews } from '../../composables/useNews'
import { useAuth } from '../../composables/useAuth'
import { useChart } from '../../composables/useChart'
import { useTheme } from '../../composables/useTheme'

const emit = defineEmits(['open-modal'])

const { marketData, masterIndexData, tickVersion, getAllStocks, resetMemory, saveMemory } = useMarket()
const { getBalance, getPortfolioValue, getLoanDebt, depositMoney, takeLoan, repayLoan, ensureProfile, userWallets, userPortfolios } = useFinance()
const { blogNews } = useNews()
const { currentUser } = useAuth()
const { drawProfessionalChart } = useChart()
const { isLight } = useTheme()

const masterCanvasRef = ref(null)
const masterHoverIdx = ref(null)
const masterIndexLabel = ref('')
const clock = ref('00:00:00')
const marketStatusText = ref('KONTROL EDİLİYOR...')
const marketStatusClass = ref('panel-value')

const depositAmount = ref('')
const loanAmount = ref('')

const CATEGORIES = [
  { key: 'food', label: '🍔 Gıda, İçecek & Tütün' },
  { key: 'auto', label: '🚗 Otomotiv & Lojistik' },
  { key: 'security', label: '🔫 Güvenlik & Silah' },
  { key: 'tech', label: '💻 Teknoloji, İletişim & Finans' },
  { key: 'retail', label: '🛒 Perakende & Sağlık' }
]

function drawMasterChart() {
  if (!masterCanvasRef.value || masterIndexData.value.length < 2) return
  drawProfessionalChart(masterCanvasRef.value, [...masterIndexData.value], false, masterHoverIdx.value, isLight.value, true)
  const d = masterIndexData.value
  const cur = d[d.length - 1]
  const st = d[0]
  const chg = st === 0 ? 0 : ((cur - st) / st) * 100
  if (masterHoverIdx.value !== null) {
    const hv = d[masterHoverIdx.value]
    const hchg = st === 0 ? 0 : ((hv - st) / st) * 100
    masterIndexLabel.value = `${hv.toFixed(2)} Puan (${hchg >= 0 ? '+' : ''}${hchg.toFixed(2)}%) [Seçili]`
  } else {
    masterIndexLabel.value = `${cur.toFixed(2)} Puan (${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%)`
  }
}

function onMasterMouseMove(e) {
  const canvas = masterCanvasRef.value
  if (!canvas || masterIndexData.value.length === 0) return
  const r = canvas.getBoundingClientRect()
  let i = Math.round(((e.clientX - r.left) / r.width) * (masterIndexData.value.length - 1))
  i = Math.max(0, Math.min(i, masterIndexData.value.length - 1))
  if (masterHoverIdx.value !== i) {
    masterHoverIdx.value = i
    drawMasterChart()
  }
}

function onMasterMouseLeave() {
  masterHoverIdx.value = null
  drawMasterChart()
}

const topByPrice = computed(() => {
  return [...getAllStocks()].sort((a, b) => b.data[b.data.length - 1] - a.data[a.data.length - 1]).slice(0, 5)
    .map(s => ({ ticker: s.ticker, value: s.data[s.data.length - 1].toFixed(2) }))
})
const topGainers = computed(() => {
  return [...getAllStocks()].sort((a, b) => {
    const ga = (a.data[a.data.length - 1] - a.data[0]) / a.data[0]
    const gb = (b.data[b.data.length - 1] - b.data[0]) / b.data[0]
    return gb - ga
  }).slice(0, 5).map(s => {
    const gain = ((s.data[s.data.length - 1] - s.data[0]) / s.data[0]) * 100
    return { ticker: s.ticker, gain }
  })
})
const topLosers = computed(() => {
  return [...getAllStocks()].sort((a, b) => {
    const ga = (a.data[a.data.length - 1] - a.data[0]) / a.data[0]
    const gb = (b.data[b.data.length - 1] - b.data[0]) / b.data[0]
    return ga - gb
  }).slice(0, 5).map(s => {
    const gain = ((s.data[s.data.length - 1] - s.data[0]) / s.data[0]) * 100
    return { ticker: s.ticker, gain }
  })
})

const masterIndexColor = computed(() => {
  const d = masterIndexData.value
  if (d.length < 2) return 'var(--accent)'
  const chg = (d[d.length - 1] - d[0]) / d[0]
  return chg >= 0 ? 'var(--up-color)' : 'var(--down-color)'
})

onMounted(() => {
  drawMasterChart()
  updateClock()
})
watch(tickVersion, () => {
  drawMasterChart()
  updateClock()
})
watch(isLight, drawMasterChart)

function updateClock() {
  const now = new Date()
  clock.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  const mins = now.getHours() * 60 + now.getMinutes()
  if (mins >= 390 && mins < 1080) {
    marketStatusText.value = 'AKTİF / AÇIK'
    marketStatusClass.value = 'panel-value up'
  } else {
    marketStatusText.value = 'KAPALI'
    marketStatusClass.value = 'panel-value down'
  }
}

function handleDeposit() {
  depositMoney(parseFloat(depositAmount.value))
  depositAmount.value = ''
}

function handleLoan() {
  const amount = parseFloat(prompt('Ne kadar kredi almak istiyorsunuz?') || '0')
  takeLoan(amount)
}

function handleRepay() {
  const amount = parseFloat(prompt('Ne kadar borç ödemek istiyorsunuz?') || '0')
  repayLoan(amount)
}

const balance = computed(() => currentUser.value ? getBalance().toFixed(2) : '0.00')
const portfolioVal = computed(() => currentUser.value ? getPortfolioValue().toFixed(2) : '0.00')
const loanDebt = computed(() => currentUser.value ? getLoanDebt().toFixed(2) : '0.00')
</script>

<template>
  <div class="screen">
    <header>
      <h1 class="main-title">LS-EXCHANGE</h1>
    </header>

    <div class="wallet-panel">
      <div>
        <div class="panel-label">YATIRIMCI BAKİYESİ</div>
        <div class="wallet-balance">${{ balance }}</div>
      </div>
      <div>
        <div class="panel-label">PORTFÖY DEĞERİ</div>
        <div class="wallet-balance">${{ portfolioVal }}</div>
      </div>
      <div>
        <div class="panel-label">KREDİ BORCU</div>
        <div class="wallet-balance" style="color: var(--down-color)">${{ loanDebt }}</div>
      </div>
      <div class="wallet-actions">
        <input v-model="depositAmount" type="number" placeholder="Yüklenecek Para" />
        <button class="submit-btn" @click="handleDeposit">PARA EKLE</button>
        <button class="submit-btn" style="background:var(--down-color); color:#fff;" @click="handleLoan">KREDİ ÇEK</button>
        <button class="submit-btn" style="background:#f39c12; color:#fff;" @click="handleRepay">BORÇ ÖDE</button>
      </div>
    </div>

    <div class="flex-row" style="margin-bottom: 30px; align-items: flex-start;">
      <div class="news-container flex-1">
        <div class="news-header">
          <span>📻 PİYASA HABERLERİ & DUYURULAR</span>
          <span style="font-size:12px; color:var(--text-muted);">Canlı Akış</span>
        </div>
        <div v-if="blogNews.length === 0" class="empty-news">Duyuru bulunmuyor.</div>
        <div v-for="news in blogNews" :key="news.id" class="news-item">
          <div class="news-title">{{ news.title }}</div>
          <div class="news-date">{{ news.date }}</div>
          <div class="news-content">{{ news.content }}</div>
        </div>
      </div>

      <div class="leaders-container flex-1">
        <div class="leaders-header">🏆 PİYASA LİDERLERİ</div>
        <div class="category-title" style="margin: 0 0 10px 0; font-size: 14px;">EN YÜKSEK FİYATLI HİSSELER</div>
        <ul class="leader-list">
          <li v-for="s in topByPrice" :key="s.ticker" class="leader-item">
            <span class="leader-ticker">{{ s.ticker }}</span>
            <span>${{ s.value }}</span>
          </li>
        </ul>
        <div class="category-title" style="margin: 20px 0 10px 0; font-size: 14px;">GÜNÜN YÜKSELENLERİ (%)</div>
        <ul class="leader-list">
          <li v-for="s in topGainers" :key="s.ticker" class="leader-item">
            <span class="leader-ticker">{{ s.ticker }}</span>
            <span class="up">+{{ s.gain.toFixed(2) }}%</span>
          </li>
        </ul>
        <div class="category-title" style="margin: 20px 0 10px 0; font-size: 14px;">GÜNÜN DÜŞENLERİ (%)</div>
        <ul class="leader-list">
          <li v-for="s in topLosers" :key="s.ticker" class="leader-item">
            <span class="leader-ticker">{{ s.ticker }}</span>
            <span :class="s.gain < 0 ? 'down' : ''">{{ s.gain > 0 ? '+' : '' }}{{ s.gain.toFixed(2) }}%</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="master-chart-container">
      <div class="master-chart-header">
        <div class="master-chart-title">LCN 500 GENEL ENDEKS (CANLI)</div>
        <div class="master-chart-index" :style="{ color: masterIndexColor }">{{ masterIndexLabel }}</div>
      </div>
      <canvas
        ref="masterCanvasRef"
        style="width:100%; height:250px; display:block; cursor:crosshair;"
        @mousemove="onMasterMouseMove"
        @mouseleave="onMasterMouseLeave"
      ></canvas>
    </div>

    <div class="market-panel">
      <div class="panel-section">
        <div class="panel-label">Piyasa Durumu</div>
        <div :class="marketStatusClass">{{ marketStatusText }}</div>
      </div>
      <div class="panel-section panel-center">
        <div class="panel-label">Yerel Saat</div>
        <div class="clock">{{ clock }}</div>
      </div>
      <div class="panel-section" style="text-align: right;">
        <div class="panel-label">İşlem Saatleri (Açılış - Kapanış)</div>
        <div class="panel-value" style="color: var(--text-muted);">06:30 - 18:00</div>
      </div>
      <button class="reset-btn" @click="resetMemory">Sistemi Sıfırla</button>
    </div>

    <template v-for="cat in CATEGORIES" :key="cat.key">
      <div class="category-title">{{ cat.label }}</div>
      <div class="grid">
        <StockCard
          v-for="stock in (marketData[cat.key] || [])"
          :key="stock.id"
          :stock="stock"
          @open-modal="emit('open-modal', $event)"
        />
      </div>
    </template>
  </div>
</template>
