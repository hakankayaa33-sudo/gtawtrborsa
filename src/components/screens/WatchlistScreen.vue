<script setup>
import { computed } from 'vue'
import { useMarket } from '../../composables/useMarket'
import { useFinance } from '../../composables/useFinance'
import { useAuth } from '../../composables/useAuth'
import StockCard from '../StockCard.vue'

const emit = defineEmits(['open-modal'])

const { getAllStocks } = useMarket()
const { userWatchlist } = useFinance()
const { currentUser } = useAuth()

const watchlistStocks = computed(() => {
  const u = currentUser.value
  if (!u) return []
  const wl = userWatchlist.value[u] || []
  return wl.map(id => getAllStocks().find(s => s.id === id)).filter(Boolean)
})
</script>

<template>
  <div class="screen">
    <header><h1 class="main-title">⭐ İZLEME LİSTESİ</h1></header>
    <div class="category-title">FAVORİ HİSSELERİM</div>
    <div v-if="watchlistStocks.length === 0" class="empty-news" style="padding: 30px 0;">
      İzleme listenizde hisse bulunmuyor.
    </div>
    <div class="grid">
      <StockCard
        v-for="stock in watchlistStocks"
        :key="stock.id"
        :stock="stock"
        @open-modal="emit('open-modal', $event)"
      />
    </div>
  </div>
</template>
