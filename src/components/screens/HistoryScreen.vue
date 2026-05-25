<script setup>
import { computed } from 'vue'
import { useFinance } from '../../composables/useFinance'
import { useAuth } from '../../composables/useAuth'

const { userHistory } = useFinance()
const { currentUser } = useAuth()

const history = computed(() => {
  const u = currentUser.value
  return u ? (userHistory.value[u] || []) : []
})
</script>

<template>
  <div class="screen">
    <header><h1 class="main-title">📜 İŞLEM GEÇMİŞİ</h1></header>
    <div class="admin-panel">
      <table class="history-table">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>İşlem Tipi</th>
            <th>Hisse Kodu</th>
            <th>Miktar (Lot)</th>
            <th>Birim Fiyat</th>
            <th>Toplam Tutar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="history.length === 0">
            <td colspan="6" style="text-align:center; font-style:italic;">Henüz hiçbir işlem gerçekleştirmediniz.</td>
          </tr>
          <tr v-for="(h, i) in history" :key="i">
            <td>{{ h.date }}</td>
            <td :style="{ color: h.type === 'ALIŞ' ? 'var(--up-color)' : 'var(--down-color)', fontWeight: 'bold' }">{{ h.type }}</td>
            <td><strong>{{ h.ticker }}</strong></td>
            <td>{{ h.lot }}</td>
            <td>${{ h.price.toFixed(2) }}</td>
            <td>${{ h.total.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
