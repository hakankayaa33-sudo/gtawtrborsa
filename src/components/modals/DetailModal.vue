<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useMarket } from '../../composables/useMarket'
import { useFinance } from '../../composables/useFinance'
import { useAuth } from '../../composables/useAuth'
import { useChart } from '../../composables/useChart'
import { useTheme } from '../../composables/useTheme'

const props = defineProps(['stockId'])
const emit = defineEmits(['close'])

const { findStock, tickVersion } = useMarket()
const { buyStock, toggleWatchlist, isInWatchlist } = useFinance()
const { currentUser, postComment, getComments } = useAuth()
const { drawProfessionalChart } = useChart()
const { isLight } = useTheme()

const detailCanvasRef = ref(null)
const activeTimeframe = ref('LIVE')
const activeViewMode = ref('CHART')
const hoverIdx = ref(null)
const buyLotAmount = ref('')
const newCommentText = ref('')

const stock = computed(() => findStock(props.stockId))

const activeData = computed(() => {
  if (!stock.value) return []
  if (activeTimeframe.value === '1D') return stock.value.hist1D
  if (activeTimeframe.value === '1M') return stock.value.hist1M
  if (activeTimeframe.value === '1Y') return stock.value.hist1Y
  return stock.value.data
})

const displayPrice = computed(() => {
  const d = activeData.value
  if (!d || d.length === 0) return { price: '0.00', change: '0.00', up: true }
  const cur = hoverIdx.value !== null ? d[hoverIdx.value] : d[d.length - 1]
  const st = d[0]
  const chg = st === 0 ? 0 : ((cur - st) / st) * 100
  return {
    price: cur.toFixed(2),
    change: `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`,
    up: chg >= 0,
    hovered: hoverIdx.value !== null
  }
})

const signal = computed(() => {
  if (!stock.value) return { text: 'NÖTR', color: 'var(--text-muted)', pointer: 50 }
  const d = activeData.value
  const cur = d.length > 0 ? d[d.length - 1] : stock.value.basePrice
  const trendPct = ((cur - stock.value.basePrice) / stock.value.basePrice) * 100
  const gaugeVal = Math.max(-5, Math.min(5, trendPct))
  const pointerPos = ((gaugeVal + 5) / 10) * 100
  let text = 'NÖTR', color = 'var(--text-muted)'
  if (gaugeVal <= -2.5) { text = 'GÜÇLÜ SAT'; color = 'var(--down-color)' }
  else if (gaugeVal < -0.5) { text = 'SAT'; color = 'var(--down-color)' }
  else if (gaugeVal > 2.5) { text = 'GÜÇLÜ AL'; color = 'var(--up-color)' }
  else if (gaugeVal > 0.5) { text = 'AL'; color = 'var(--up-color)' }
  return { text, color, pointer: pointerPos }
})

const rangeStats = computed(() => {
  const d = activeData.value
  if (!d || d.length === 0) return { dayMin: 0, dayMax: 0, dayPos: 50, histMin: 0, histMax: 0, histPos: 50 }
  const cur = d[d.length - 1]
  const dayMin = Math.min(...d), dayMax = Math.max(...d)
  const dayPos = dayMax === dayMin ? 50 : ((cur - dayMin) / (dayMax - dayMin)) * 100
  const s = stock.value
  const histPos = s && s.high !== s.low ? ((cur - s.low) / (s.high - s.low)) * 100 : 50
  return {
    dayMin: dayMin.toFixed(2), dayMax: dayMax.toFixed(2), dayPos,
    histMin: s ? s.low.toFixed(2) : 0, histMax: s ? s.high.toFixed(2) : 0, histPos
  }
})

const tableRows = computed(() => {
  const d = activeData.value
  if (!d || d.length === 0) return []
  const rows = []
  for (let i = d.length - 1; i >= 0; i--) {
    const price = d[i]
    const prev = i > 0 ? d[i - 1] : d[0]
    const diff = price - prev
    const diffPct = prev === 0 ? 0 : (diff / prev) * 100
    rows.push({ i, price: price.toFixed(2), diffPct, up: diff >= 0 })
  }
  return rows
})

const comments = computed(() => getComments(props.stockId))
const inWatchlist = computed(() => isInWatchlist(props.stockId))

function drawChart() {
  if (!detailCanvasRef.value || !activeData.value || activeData.value.length < 2) return
  drawProfessionalChart(detailCanvasRef.value, [...activeData.value], false, hoverIdx.value, isLight.value, false)
}

function onCanvasMouseMove(e) {
  const canvas = detailCanvasRef.value
  if (!canvas || !activeData.value) return
  const r = canvas.getBoundingClientRect()
  let i = Math.round(((e.clientX - r.left) / r.width) * (activeData.value.length - 1))
  i = Math.max(0, Math.min(i, activeData.value.length - 1))
  if (hoverIdx.value !== i) {
    hoverIdx.value = i
    drawChart()
  }
}

function onCanvasMouseLeave() {
  hoverIdx.value = null
  drawChart()
}

function changeTimeframe(tf) {
  activeTimeframe.value = tf
  hoverIdx.value = null
  nextTick(drawChart)
}

function changeViewMode(mode) {
  activeViewMode.value = mode
  if (mode === 'CHART') nextTick(drawChart)
}

function handleBuy() {
  buyStock(props.stockId, parseInt(buyLotAmount.value))
  buyLotAmount.value = ''
}

function handlePostComment() {
  postComment(props.stockId, newCommentText.value)
  newCommentText.value = ''
}

onMounted(() => {
  nextTick(drawChart)
})

watch([activeTimeframe, tickVersion, isLight], () => {
  nextTick(drawChart)
})

function formatVol() {
  if (!stock.value) return '-'
  return ((stock.value.basePrice * 1354) / 1000).toFixed(1) + 'K'
}
function formatMcap() {
  if (!stock.value) return '-'
  return '$' + ((stock.value.basePrice * 1845672) / 1000000).toFixed(2) + 'M'
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content" v-if="stock">
      <button class="close-btn" @click="emit('close')">×</button>

      <div class="detail-header">
        <div class="detail-title">
          <h2>
            {{ stock.ticker }}
            <button
              v-if="currentUser"
              class="wl-btn"
              :class="{ active: inWatchlist }"
              @click="toggleWatchlist(stockId)"
            >{{ inWatchlist ? '⭐ İZLENİYOR' : '☆ İZLE' }}</button>
            <span v-if="stock.halted" class="halted-badge" style="font-size:14px; padding: 4px 8px;">⚠️ İŞLEMLER DURDURULDU</span>
          </h2>
          <p>{{ stock.name }}</p>
        </div>
        <div class="detail-current">
          <div class="d-price" :style="{ color: displayPrice.up ? 'var(--up-color)' : 'var(--down-color)' }">
            ${{ displayPrice.price }}{{ displayPrice.hovered ? ' (Seçili)' : '' }}
          </div>
          <div class="change" :class="displayPrice.up ? 'up' : 'down'">{{ displayPrice.change }}</div>
        </div>
      </div>

      <div class="detail-body">
        <div class="chart-section">
          <div class="chart-header-row">
            <div class="timeframe-controls">
              <button
                v-for="tf in ['LIVE', '1D', '1M', '1Y']"
                :key="tf"
                class="tf-btn"
                :class="{ active: activeTimeframe === tf }"
                @click="changeTimeframe(tf)"
              >{{ tf === 'LIVE' ? 'CANLI (1S)' : tf === '1D' ? '1G' : tf === '1M' ? '1A' : '1Y' }}</button>
            </div>
            <div class="view-controls">
              <button class="tf-btn" :class="{ active: activeViewMode === 'CHART' }" @click="changeViewMode('CHART')">GRAFİK 📉</button>
              <button class="tf-btn" :class="{ active: activeViewMode === 'TABLE' }" @click="changeViewMode('TABLE')">TABLO 📋</button>
            </div>
          </div>
          <canvas
            v-show="activeViewMode === 'CHART'"
            ref="detailCanvasRef"
            class="detail-canvas"
            @mousemove="onCanvasMouseMove"
            @mouseleave="onCanvasMouseLeave"
          ></canvas>
          <div v-show="activeViewMode === 'TABLE'" class="detail-table-container" style="display:block; height:300px; overflow-y:auto;">
            <table class="data-table">
              <thead><tr><th>#</th><th>Zaman Aralığı</th><th>Fiyat</th><th>Değişim (%)</th></tr></thead>
              <tbody>
                <tr v-for="row in tableRows" :key="row.i">
                  <td>{{ row.i }}</td>
                  <td>T-{{ tableRows.length - 1 - tableRows.indexOf(row) }}</td>
                  <td style="font-weight:bold;">${{ row.price }}</td>
                  <td :class="row.up ? 'up' : 'down'">{{ row.up ? '+' : '' }}{{ row.diffPct.toFixed(2) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="tv-panel">
          <h3>İSTATİSTİK & GÖSTERGELER</h3>
          <p class="d-desc" style="font-size:12px; margin:0 0 10px 0; color:var(--text-muted);">{{ stock.desc }}</p>

          <div class="tv-gauge-container">
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:5px;">SİNYAL (KISA VADE)</div>
            <div class="tv-signal" :style="{ color: signal.color }">{{ signal.text }}</div>
            <div class="tv-gauge">
              <span class="tv-pointer" :style="{ left: signal.pointer + '%', color: signal.color }">▼</span>
            </div>
            <div class="tv-labels"><span>GÜÇLÜ SAT</span><span>NÖTR</span><span>GÜÇLÜ AL</span></div>
          </div>

          <div class="tv-ranges">
            <div class="range-row">
              <div class="r-label"><span>Günlük Aralık</span></div>
              <div class="r-vals">
                <span>${{ rangeStats.dayMin }}</span>
                <div class="r-bar"><div class="r-fill" :style="{ left: 'calc(' + rangeStats.dayPos + '% - 2px)' }"></div></div>
                <span>${{ rangeStats.dayMax }}</span>
              </div>
            </div>
            <div class="range-row">
              <div class="r-label"><span>52 Haftalık Aralık (Rekorlar)</span></div>
              <div class="r-vals">
                <span>${{ rangeStats.histMin }}</span>
                <div class="r-bar"><div class="r-fill" :style="{ left: 'calc(' + rangeStats.histPos + '% - 2px)' }"></div></div>
                <span>${{ rangeStats.histMax }}</span>
              </div>
            </div>
          </div>

          <div class="tv-stats-grid">
            <div class="tv-stat"><span>Hacim (24S)</span><strong>{{ formatVol() }}</strong></div>
            <div class="tv-stat"><span>Piyasa Değeri</span><strong>{{ formatMcap() }}</strong></div>
            <div class="tv-stat"><span>Volatilite Endeksi</span><strong>{{ stock.vol.toFixed(2) }}</strong></div>
            <div class="tv-stat"><span>Arz Fiyatı (Baz)</span><strong>${{ stock.basePrice.toFixed(2) }}</strong></div>
          </div>

          <div class="buy-stock-box">
            <h3 style="margin-top:10px; margin-bottom:10px;">HİSSE SATIN AL</h3>
            <input v-model="buyLotAmount" type="number" placeholder="Kaç lot alınacak?" />
            <button class="submit-btn" style="width:100%;" @click="handleBuy">HİSSE SATIN AL</button>
          </div>
        </div>
      </div>

      <div class="comments-section">
        <h3>YATIRIMCI YORUMLARI</h3>
        <div class="comments-list">
          <div v-if="comments.length === 0" class="empty-news">Bu hisse için henüz yorum yapılmamış. İlk yorumu siz yapın!</div>
          <div v-for="(c, i) in comments" :key="i" class="comment-item">
            <div class="comment-header">
              <span class="comment-author">@{{ c.user }}</span>
              <span>{{ c.date }}</span>
            </div>
            <div class="comment-text">{{ c.text }}</div>
          </div>
        </div>
        <div v-if="currentUser" class="comment-input-area">
          <input
            v-model="newCommentText"
            type="text"
            :placeholder="currentUser + ' olarak yorum yapın...'"
            @keypress.enter="handlePostComment"
          />
          <button @click="handlePostComment">Gönder</button>
        </div>
        <div v-else class="auth-warning">
          Yorum yazabilmek için lütfen üst menüden sisteme <strong>Giriş Yapın</strong> veya <strong>Kayıt Olun</strong>.
        </div>
      </div>
    </div>
  </div>
</template>
