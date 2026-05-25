<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useMarket } from '../../composables/useMarket'
import { useChart } from '../../composables/useChart'
import { useTheme } from '../../composables/useTheme'

const { getAllStocks, marketData, tickVersion } = useMarket()
const { drawProfessionalChart } = useChart()
const { isLight } = useTheme()

const compare1Id = ref('')
const compare2Id = ref('')
const canvas1Ref = ref(null)
const canvas2Ref = ref(null)

const allStocks = computed(() => getAllStocks())

function getStock(id) {
  return id ? allStocks.value.find(s => s.id === id) : null
}

function getStats(stock) {
  if (!stock) return []
  const cur = stock.data[stock.data.length - 1]
  const st = stock.data[0]
  const pct = st === 0 ? 0 : ((cur - st) / st) * 100
  return [
    { label: 'Volatilite', value: stock.vol.toFixed(2) },
    { label: 'Rekor Tepe', value: `$${stock.high.toFixed(2)}` },
    { label: 'Arz Fiyatı', value: `$${stock.basePrice.toFixed(2)}` },
    { label: 'Durum', value: stock.halted ? '⚠️ KAPALI' : '🟢 AKTİF' }
  ]
}

function redrawCompare() {
  const s1 = getStock(compare1Id.value)
  const s2 = getStock(compare2Id.value)
  if (s1 && canvas1Ref.value) drawProfessionalChart(canvas1Ref.value, [...s1.data], false, null, isLight.value)
  if (s2 && canvas2Ref.value) drawProfessionalChart(canvas2Ref.value, [...s2.data], false, null, isLight.value)
}

watch([compare1Id, compare2Id, tickVersion, isLight], () => {
  setTimeout(redrawCompare, 50)
})

function priceLabel(stock) {
  if (!stock) return '$0.00'
  const cur = stock.data[stock.data.length - 1]
  const st = stock.data[0]
  const pct = st === 0 ? 0 : ((cur - st) / st) * 100
  return { price: cur.toFixed(2), pct, up: pct >= 0 }
}
</script>

<template>
  <div class="screen">
    <header><h1 class="main-title">HİSSE KARŞILAŞTIRMA (BETA)</h1></header>
    <div class="market-panel" style="gap: 15px;">
      <div class="form-group flex-1" style="margin-bottom:0;">
        <label>1. Hisse Senedi</label>
        <select v-model="compare1Id">
          <option value="">-- Hisse Seçin --</option>
          <option v-for="s in allStocks" :key="s.id" :value="s.id">{{ s.ticker }} - {{ s.name }}</option>
        </select>
      </div>
      <div class="form-group flex-1" style="margin-bottom:0;">
        <label>2. Hisse Senedi</label>
        <select v-model="compare2Id">
          <option value="">-- Hisse Seçin --</option>
          <option v-for="s in allStocks" :key="s.id" :value="s.id">{{ s.ticker }} - {{ s.name }}</option>
        </select>
      </div>
    </div>
    <div class="flex-row" style="margin-top: 20px;">
      <div class="flex-1" v-for="(cId, idx) in [compare1Id, compare2Id]" :key="idx">
        <div class="admin-panel" style="padding: 20px;">
          <template v-if="getStock(cId)">
            <h2 style="margin-bottom:5px;">{{ getStock(cId).ticker }} - {{ getStock(cId).name }}</h2>
            <div style="font-size:24px; font-weight:bold; margin-bottom:15px;">
              ${{ priceLabel(getStock(cId)).price }}
              <span :class="priceLabel(getStock(cId)).up ? 'up' : 'down'" style="font-size:14px;">
                {{ priceLabel(getStock(cId)).up ? '+' : '' }}{{ priceLabel(getStock(cId)).pct.toFixed(2) }}%
              </span>
            </div>
            <div style="margin-bottom:15px;">
              <canvas
                :ref="el => { if(idx===0) canvas1Ref = el; else canvas2Ref = el }"
                style="width:100%; height:200px; display:block;"
              ></canvas>
            </div>
            <div class="tv-stats-grid">
              <div v-for="stat in getStats(getStock(cId))" :key="stat.label" class="tv-stat">
                <span>{{ stat.label }}</span>
                <strong>{{ stat.value }}</strong>
              </div>
            </div>
          </template>
          <template v-else>
            <h2 style="margin-bottom:5px;">HİSSE SEÇİNİZ</h2>
            <div style="font-size:24px; font-weight:bold; margin-bottom:15px;">$0.00</div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
