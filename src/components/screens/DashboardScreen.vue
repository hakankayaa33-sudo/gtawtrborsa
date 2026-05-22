<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMarket } from '../../composables/useMarket'
import { useFinance } from '../../composables/useFinance'
import { useNews } from '../../composables/useNews'
import { useAuth } from '../../composables/useAuth'
import { useChart } from '../../composables/useChart'

const emit = defineEmits(['open-modal'])

const { marketData, masterIndexData, tickVersion, getAllStocks } = useMarket()
const { getBalance, getPortfolioValue, userWallets, userPortfolios } = useFinance()
const { blogNews } = useNews()
const { currentUser } = useAuth()
const { drawProfessionalChart } = useChart()

const currentTime = ref('')
const marketStatus = ref('AÇIK (06:30 - 18:00)')
const marketStatusClass = ref('panel-value text-up')

const depositAmount = ref('')
const selectedNewsDate = ref('') // Takvim Filtresi

const advisors = ref([])
const selectedAdvisor = ref(null)
function loadAdvisors() {
  let loadedAdvs = localStorage.getItem('gtawtr_advisors')
  if (!loadedAdvs) {
    const defaultAdv = [{ id: 1, name: 'Marcus Vance', phone: '555-0199', slogan: 'Kıdemli Portföy Yöneticisi', photo: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' }]
    localStorage.setItem('gtawtr_advisors', JSON.stringify(defaultAdv))
    advisors.value = defaultAdv
  } else {
    advisors.value = JSON.parse(loadedAdvs)
  }
}

const CATEGORIES = [
  { key: 'food', label: 'Gıda, İçecek & Tütün' },
  { key: 'auto', label: 'Otomotiv & Lojistik' },
  { key: 'security', label: 'Güvenlik & Silah' },
  { key: 'tech', label: 'Teknoloji, İletişim & Finans' },
  { key: 'retail', label: 'Perakende & Sağlık' }
]

function updateClock() {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = `${hh}:${mm}:${ss}`

  const mins = now.getHours() * 60 + now.getMinutes()
  if (mins >= 390 && mins < 1080) {
    marketStatus.value = 'AÇIK PİYASA'
    marketStatusClass.value = 'panel-value text-up'
  } else {
    marketStatus.value = 'KAPALI PİYASA'
    marketStatusClass.value = 'panel-value text-down'
  }
  loadAdvisors()
}

let clockInterval = null

function drawLocalMiniChart(canvas, data) {
  if (!canvas || !data || data.length === 0) return
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)
  
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = (max - min) || 1
  
  ctx.beginPath()
  ctx.lineWidth = 2
  const isUp = data[data.length - 1] >= data[data.length - 2]
  ctx.strokeStyle = isUp ? '#2ecc71' : '#e74c3c'
  
  const step = w / Math.max(data.length - 1, 1)
  for (let i = 0; i < data.length; i++) {
    const x = i * step
    const y = h - ((data[i] - min) / range) * (h - 4) - 2
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  
  // Hafif saydam dolgu efekti (Gradient)
  ctx.lineTo(w, h)
  ctx.lineTo(0, h)
  ctx.closePath()
  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, isUp ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)')
  gradient.addColorStop(1, isUp ? 'rgba(46, 204, 113, 0)' : 'rgba(231, 76, 60, 0)')
  ctx.fillStyle = gradient
  ctx.fill()
}

function drawAllMiniCharts() {
  setTimeout(() => {
    const allStocks = getAllStocks()
    for (const stock of allStocks) {
      const canvas = document.getElementById(`mini-chart-${stock.id}`)
      if (canvas) {
        drawLocalMiniChart(canvas, stock.data)
      }
    }
  }, 50)
}

function drawMasterChart() {
  setTimeout(() => {
    const canvas = document.getElementById('master-index-chart')
    if (canvas) {
      drawProfessionalChart(canvas, masterIndexData.value)
    }
  }, 50)
}

onMounted(() => {
  drawMasterChart()
  drawAllMiniCharts()
  updateClock()
  clockInterval = setInterval(updateClock, 1000)
})

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
})

watch(tickVersion, () => {
  drawMasterChart()
  drawAllMiniCharts()
})

function handleDeposit() {
  if (!currentUser.value) {
    alert('Para eklemek için önce sağ üstten sisteme giriş yapmalısınız.')
    return
  }
  
  if (window.playClickSound) window.playClickSound();
  
  const amount = parseFloat(depositAmount.value)
  if (isNaN(amount) || amount <= 0) {
    alert('Lütfen geçerli bir tutar giriniz.')
    return
  }
  
  const requests = JSON.parse(localStorage.getItem('gtawtr_deposit_requests') || '[]')
  requests.push({ id: Date.now(), user: currentUser.value, amount, date: new Date().toLocaleString(), status: 'pending' })
  localStorage.setItem('gtawtr_deposit_requests', JSON.stringify(requests))
  
  depositAmount.value = ''
  alert('Para ekleme talebiniz başarıyla yetkili onayına (danieladmin) gönderildi. Onaylandığında bakiyenize yansıyacaktır.')
}

const balance = computed(() => currentUser.value ? getBalance().toFixed(2) : '0.00')
const portfolioVal = computed(() => currentUser.value ? getPortfolioValue().toFixed(2) : '0.00')

const allStocksList = computed(() => getAllStocks())

const processedNews = computed(() => {
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000
  return blogNews.value.map(n => {
    // Haberin tarihini güvenli bir şekilde hesaplıyoruz
    let timestamp = typeof n.id === 'number' && n.id > 1000000000000 ? n.id : new Date(n.date).getTime()
    if (isNaN(timestamp)) timestamp = now
    
    const diff = Math.max(0, now - timestamp)
    const days = Math.floor(diff / oneDay)
    let timeLabel = 'BUGÜN'
    if (days > 0) timeLabel = `${days}G ÖNCE`
        
        // Tarih filtresi için YYYY-MM-DD formatını hazırlıyoruz
        const dObj = new Date(timestamp)
        const dateStr = `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`
        
        return { ...n, daysOld: days, timeLabel, dateStr, timestamp }
      }).filter(n => {
        if (selectedNewsDate.value) {
          // Eğer takvimden tarih seçildiyse SADECE o tarihteki (arşivdeki) haberleri göster
          return n.dateStr === selectedNewsDate.value
        }
        // Tarih seçilmediyse son 7 günü göster
        return n.daysOld <= 7
      }).sort((a, b) => b.timestamp - a.timestamp) // En yeni haber en üstte çıksın
})
</script>

<template>
  <div class="screen">
    <div class="flex-row">
      <div class="panel flex-1" style="border-radius: 4px;">
        <div class="panel-label" style="border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 10px; font-size: 12px; color: var(--text-muted); letter-spacing: 1px;">LCN 500 ENDEKSİ</div>
        <canvas id="master-index-chart" width="400" height="120"></canvas>
      </div>
      
      <div class="panel flex-1 wallet-panel" style="border-radius: 4px;">
        <h3 style="margin-top:0; border-bottom: 1px solid var(--border); padding-bottom: 10px; font-size: 13px; color: var(--text-muted); letter-spacing: 1px;">CÜZDAN BİLGİLERİ</h3>
        <div style="margin-bottom: 10px;">
          <div class="panel-label" style="font-size: 11px;">NAKİT BAKİYE</div>
          <div class="wallet-balance" style="font-family: 'Courier New', monospace; font-size: 24px; color: #2ecc71; font-weight: bold;">${{ balance }}</div>
        </div>
        <div style="margin-bottom: 15px;">
          <div class="panel-label" style="font-size: 11px;">PORTFÖY DEĞERİ</div>
          <div class="wallet-balance" style="font-family: 'Courier New', monospace; font-size: 20px; color: var(--text); font-weight: bold;">${{ portfolioVal }}</div>
        </div>
        <div class="wallet-actions" style="display: flex; gap: 10px;">
          <input v-model="depositAmount" type="number" placeholder="Miktar" style="flex: 1; background: #0a0a0a; border: 1px solid #333; color: #fff; padding: 8px 10px; border-radius: 2px; font-family: monospace;" />
          <button class="submit-btn" style="border-radius: 2px; font-family: monospace; font-weight: bold; letter-spacing: 1px; padding: 8px 20px;" @click="handleDeposit">EKLE</button>
        </div>
      </div>
    </div>

    <div class="panel flex-row" style="justify-content: space-between; border-radius: 4px; padding: 15px; border: 1px solid var(--border);">
      <div>
        <div class="panel-label">Los Santos Saati</div>
        <div class="panel-value">{{ currentTime }}</div>
      </div>
      <div>
        <div class="panel-label">Piyasa Durumu</div>
        <div :class="marketStatusClass">{{ marketStatus }}</div>
      </div>
      <div>
        <div class="panel-label">İşlem Saatleri (Açılış - Kapanış)</div>
        <div class="panel-value" style="color: var(--text-muted);">06:30 - 18:00</div>
      </div>
    </div>

    <!-- ANA DÜZEN: SOL (DANIŞMANLAR), SAĞ (HABERLER & HİSSELER) -->
    <div class="flex-row" style="align-items: flex-start; gap: 20px;">
      
      <!-- SOL PANEL: DANIŞMANLAR (Aşağı doğru kaydırılabilir Roll-up Panel) -->
      <div v-if="advisors.length > 0" style="width: 250px; flex-shrink: 0; background: var(--surface); padding: 15px; border-radius: 4px; border: 1px solid var(--border); max-height: 800px; overflow-y: auto;">
        <h2 class="category-title" style="font-size: 13px; text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid var(--border); color: var(--text-muted); letter-spacing: 1px;">DANIŞMANLAR</h2>
        <div style="display: flex; flex-direction: column; gap: 15px;">
          <div v-for="adv in advisors" :key="adv.id" class="card" @click="selectedAdvisor = adv" style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 15px; margin: 0; box-shadow: none; border: 1px solid var(--border); border-radius: 2px; cursor: pointer; background: var(--surface);">
            <img :src="adv.photo" alt="Profile" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border); margin-bottom: 12px; filter: grayscale(20%);">
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px; color: var(--text); font-family: 'Courier New', monospace;">{{ adv.name }}</div>
            <div style="font-size: 11px; color: var(--text-muted); font-style: italic; margin-bottom: 15px; line-height: 1.4;">"{{ adv.slogan }}"</div>
            <div style="background: rgba(46, 204, 113, 0.05); color: #2ecc71; border: 1px solid #2ecc71; padding: 6px 10px; border-radius: 2px; font-weight: normal; font-family: monospace; font-size: 13px; width: 100%; letter-spacing: 0.5px;">
              TEL: {{ adv.phone }}
            </div>
          </div>
        </div>
      </div>

      <!-- SAĞ PANEL: HABERLER VE KATEGORİLER -->
      <div class="flex-1" style="min-width: 0;">
        
        <div class="news-container" style="margin-bottom: 30px;">
          <div class="news-header" style="display: flex; justify-content: space-between; align-items: center;">
            <div class="news-title">DUYURULAR & HABERLER</div>
            <div style="display: flex; gap: 5px; align-items: center;">
              <input type="date" v-model="selectedNewsDate" style="background: var(--surface); color: var(--text); border: 1px solid var(--border); padding: 4px 8px; font-family: 'Courier New', monospace; border-radius: 2px; font-size: 12px; cursor: pointer; outline: none; color-scheme: dark;" />
              <button v-if="selectedNewsDate" @click="selectedNewsDate = ''" style="background: transparent; color: #e74c3c; border: 1px solid #e74c3c; padding: 4px 8px; border-radius: 2px; font-size: 11px; cursor: pointer; font-weight: bold;">X</button>
            </div>
          </div>
          <div class="news-list">
            <div v-if="processedNews.length === 0" class="empty-news">{{ selectedNewsDate ? 'Seçili tarihte arşivde duyuru bulunamadı.' : 'Son 7 güne ait yeni bir duyuru bulunmamaktadır.' }}</div>
            <div v-for="news in processedNews" :key="news.id" class="news-item">
              <div class="news-item-title">{{ news.title }}</div>
              <div class="news-item-date">{{ news.date }} <span style="background: var(--surface); padding: 2px 6px; border-radius: 2px; border: 1px solid var(--border); font-size: 10px; margin-left: 5px;">{{ news.timeLabel }}</span></div>
              <div class="news-item-content">{{ news.content }}</div>
            </div>
          </div>
        </div>

        <template v-for="cat in CATEGORIES" :key="cat.key">
          <h2 class="category-title">{{ cat.label }}</h2>
          <div class="grid">
            <div v-for="s in (marketData[cat.key] || [])" :key="s.id" class="card" @click="emit('open-modal', s.id)">
              <div class="card-header">
                <span class="ticker">{{ s.ticker }}</span>
                <span class="price">${{ s.data[s.data.length - 1].toFixed(2) }}</span>
              </div>
              <canvas :id="`mini-chart-${s.id}`" width="200" height="50" style="width: 100%; margin: 12px 0 8px 0; border-radius: 4px;"></canvas>
              <div class="card-name">{{ s.name }}</div>
              <div v-if="s.halted" style="color: var(--down-color); font-weight: bold; font-size: 12px; margin-top: 5px;">DEVRE KESİCİ</div>
              <div v-else class="card-change" :class="s.data[s.data.length - 1] >= s.data[s.data.length - 2] ? 'text-up' : 'text-down'">
                {{ s.data[s.data.length - 1] >= s.data[s.data.length - 2] ? '▲' : '▼' }} 
                ${{ Math.abs(s.data[s.data.length - 1] - s.data[s.data.length - 2]).toFixed(2) }}
              </div>
            </div>
          </div>
        </template>
        
      </div>

      <!-- SAĞ PANEL: TÜM HİSSELER PİYASA ÖZETİ (Roll-up Panel) -->
      <div style="width: 280px; flex-shrink: 0; background: var(--surface); padding: 15px; border-radius: 4px; border: 1px solid var(--border); max-height: 800px; overflow-y: auto;">
        <h2 class="category-title" style="font-size: 13px; text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid var(--border); color: var(--text-muted); letter-spacing: 1px;">PİYASA ÖZETİ</h2>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div v-for="s in allStocksList" :key="s.id" class="card" @click="emit('open-modal', s.id)" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin: 0; box-shadow: none; border: 1px solid var(--border); border-radius: 2px; cursor: pointer; background: #0a0a0a; font-family: 'Courier New', monospace;">
            <div>
              <div style="font-weight: bold; color: var(--text); font-size: 14px;">{{ s.ticker }}</div>
              <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">{{ s.halted ? 'DURDURULDU' : 'AKTİF' }}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: bold; font-size: 14px; color: var(--text);">${{ s.data[s.data.length - 1].toFixed(2) }}</div>
              <div v-if="!s.halted" :style="{ color: s.data[s.data.length - 1] >= s.data[s.data.length - 2] ? '#2ecc71' : '#e74c3c', fontSize: '11px', marginTop: '2px' }">
                {{ s.data[s.data.length - 1] >= s.data[s.data.length - 2] ? '▲' : '▼' }} {{ Math.abs(s.data[s.data.length - 1] - s.data[s.data.length - 2]).toFixed(2) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- DANIŞMAN DETAY MODALI -->
    <div v-if="selectedAdvisor" @click.self="selectedAdvisor = null" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(5px);">
      <div style="background: var(--surface); padding: 30px; border-radius: 4px; max-width: 400px; width: 90%; text-align: center; border: 1px solid var(--border); box-shadow: 0 10px 40px rgba(0,0,0,0.8); position: relative;">
        <button @click="selectedAdvisor = null" style="position: absolute; top: 10px; right: 15px; background: transparent; border: none; font-size: 24px; color: var(--text-muted); cursor: pointer; transition: color 0.2s;">&times;</button>
        <img :src="selectedAdvisor.photo" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border); margin-bottom: 20px; filter: grayscale(10%);">
        <h2 style="margin: 0 0 10px 0; color: var(--text); font-family: 'Courier New', monospace;">{{ selectedAdvisor.name }}</h2>
        <div style="font-size: 14px; color: var(--text-muted); font-style: italic; margin-bottom: 25px;">"{{ selectedAdvisor.slogan }}"</div>
        <div style="background: rgba(46, 204, 113, 0.05); color: #2ecc71; border: 1px solid #2ecc71; padding: 10px 20px; border-radius: 2px; font-weight: normal; font-family: monospace; font-size: 16px; letter-spacing: 1px; display: inline-block; cursor: default;">
          TEL: {{ selectedAdvisor.phone }}
        </div>
      </div>
    </div>

  </div>
</template>