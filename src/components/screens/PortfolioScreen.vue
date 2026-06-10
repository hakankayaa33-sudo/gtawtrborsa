<script setup>
import { computed } from 'vue'
import { useMarket } from '../../composables/useMarket'
import { useFinance } from '../../composables/useFinance'
import { useAuth } from '../../composables/useAuth'

const { getAllStocks, tickVersion } = useMarket()
const { userPortfolios, userWallets, sellStock } = useFinance()
const { currentUser } = useAuth()

const portfolioItems = computed(() => {
  const u = currentUser.value
  if (!u || !userPortfolios.value[u]) return []
  const items = []
  getAllStocks().forEach(stock => {
    const p = userPortfolios.value[u][stock.id]
    if (!p) return
    const lot = typeof p === 'number' ? p : p.lot
    const avgCost = typeof p === 'number' ? stock.basePrice : p.avgCost
    if (lot <= 0) return
    const currentPrice = stock.data[stock.data.length - 1]
    const totalValue = lot * currentPrice
    const totalCost = lot * avgCost
    const pl = totalValue - totalCost
    const plPct = totalCost > 0 ? (pl / totalCost) * 100 : 0
    items.push({ stock, lot, avgCost, currentPrice, totalValue, pl, plPct })
  })
  return items
})

const totals = computed(() => {
  let totalVal = 0, totalCost = 0
  portfolioItems.value.forEach(({ stock, lot, avgCost }) => {
    const cp = stock.data[stock.data.length - 1]
    totalVal += lot * cp
    totalCost += lot * avgCost
  })
  const pl = totalVal - totalCost
  const plPct = totalCost > 0 ? (pl / totalCost) * 100 : 0
  return { totalVal, pl, plPct }
})

const cashBalance = computed(() => {
  const u = currentUser.value
  return u ? (userWallets.value[u] || 0) : 0
})
</script>

<template>
  <div class="screen">
    <header>
      <h1 class="main-title">YATIRIMCI PORTFÖYÜ</h1>
    </header>

    <div class="market-panel">
      <div class="panel-section">
        <div class="panel-label">TOPLAM PORTFÖY DEĞERİ</div>
        <div class="panel-value">${{ totals.totalVal.toFixed(2) }}</div>
      </div>
      <div class="panel-section panel-center">
        <div class="panel-label">TOPLAM KÂR / ZARAR</div>
        <div class="panel-value" :class="totals.pl >= 0 ? 'up' : 'down'">
          {{ totals.pl >= 0 ? '+' : '' }}${{ totals.pl.toFixed(2) }} ({{ totals.plPct.toFixed(2) }}%)
        </div>
      </div>
      <div class="panel-section" style="text-align: right;">
        <div class="panel-label">NAKİT BAKİYE</div>
        <div class="panel-value">${{ cashBalance.toFixed(2) }}</div>
      </div>
    </div>

    <div class="category-title">SAHİP OLUNAN HİSSELER</div>
    <div v-if="portfolioItems.length === 0" class="empty-news" style="padding: 30px 0;">
      Henüz hiç hisse senedi almadınız.
    </div>
    <div class="grid">
      <div v-for="item in portfolioItems" :key="item.stock.id" class="card">
        <div class="card-header">
          <div class="ticker">{{ item.stock.ticker }}</div>
        </div>
        <div class="company-name">{{ item.stock.name }}</div>
        <div style="margin-bottom:10px; font-size:13px; color:var(--text-muted);">
          <div>Miktar: <strong style="color:var(--text-main)">{{ item.lot }} Lot</strong></div>
          <div>Ort. Maliyet: <strong style="color:var(--text-main)">${{ item.avgCost.toFixed(2) }}</strong></div>
          <div>Güncel Fiyat: <strong style="color:var(--text-main)">${{ item.currentPrice.toFixed(2) }}</strong></div>
        </div>
        <div class="price-info" style="border-top:1px dashed var(--border-color); padding-top:10px;">
          <div class="price">${{ item.totalValue.toFixed(2) }}</div>
          <div class="change" :class="item.pl >= 0 ? 'up' : 'down'">
            {{ item.pl >= 0 ? '+' : '' }}${{ item.pl.toFixed(2) }} ({{ item.plPct.toFixed(2) }}%)
          </div>
        </div>
        <button
          class="submit-btn"
          style="width:100%; margin-top:10px; background:var(--down-color); color:#fff;"
          @click="sellStock(item.stock.id)"
        >SATIŞ YAP</button>
      </div>
    </div>
  </div>
</template>
