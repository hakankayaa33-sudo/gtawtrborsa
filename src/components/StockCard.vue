<script setup>
import { ref, onMounted, watch } from 'vue'
import { useChart } from '../composables/useChart'
import { useTheme } from '../composables/useTheme'
import { useMarket } from '../composables/useMarket'

const props = defineProps(['stock'])
const emit = defineEmits(['open-modal'])

const { drawProfessionalChart } = useChart()
const { isLight } = useTheme()
const { tickVersion } = useMarket()

const canvasRef = ref(null)

function redraw() {
  if (canvasRef.value && props.stock.data.length > 1) {
    drawProfessionalChart(canvasRef.value, [...props.stock.data], true, null, isLight.value)
  }
}

onMounted(redraw)
watch(tickVersion, redraw)
watch(isLight, redraw)

function currentPrice() {
  const d = props.stock.data
  return d.length > 0 ? d[d.length - 1] : 0
}

function change() {
  const d = props.stock.data
  if (d.length < 2) return 0
  return ((d[d.length - 1] - d[0]) / d[0]) * 100
}
</script>

<template>
  <div class="card" @click="emit('open-modal', stock.id)">
    <div class="card-header">
      <div class="ticker">
        {{ stock.ticker }}
        <span v-if="stock.halted" class="halted-badge">⚠️ DEVRE KESİCİ</span>
      </div>
    </div>
    <div class="company-name">{{ stock.name }}</div>
    <canvas ref="canvasRef" class="mini-chart"></canvas>
    <div class="price-info">
      <div class="price">${{ currentPrice().toFixed(2) }}</div>
      <div class="change" :class="change() >= 0 ? 'up' : 'down'">
        {{ change() >= 0 ? '+' : '' }}{{ change().toFixed(2) }}%
      </div>
    </div>
  </div>
</template>
