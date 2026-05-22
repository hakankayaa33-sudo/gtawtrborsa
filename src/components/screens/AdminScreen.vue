<script setup>
import { ref, computed } from 'vue'
import { useMarket } from '../../composables/useMarket'
import { useNews } from '../../composables/useNews'

const { marketData, getAllStocks, toggleCircuitBreaker, addNewStock } = useMarket()
const { blogNews, addNews, deleteNews } = useNews()

const breakerSelect = ref('')
const allStocks = computed(() => getAllStocks())

const newStockCat = ref('food')
const newStockTicker = ref('')
const newStockName = ref('')
const newStockPrice = ref('')
const newStockVol = ref('')
const newStockDesc = ref('')

const newsTitleInput = ref('')
const newsContentInput = ref('')

function handleAddStock() {
  const ticker = newStockTicker.value.trim().toUpperCase()
  const name = newStockName.value.trim()
  const price = parseFloat(newStockPrice.value)
  const vol = parseFloat(newStockVol.value)
  const desc = newStockDesc.value.trim()
  if (!ticker || !name || isNaN(price) || price <= 0 || isNaN(vol) || vol <= 0 || !desc) {
    alert('Lütfen tüm bilgileri eksiksiz doldurun.')
    return
  }
  addNewStock(newStockCat.value, ticker, name, price, vol, desc)
  newStockTicker.value = ''
  newStockName.value = ''
  newStockPrice.value = ''
  newStockVol.value = ''
  newStockDesc.value = ''
}

function handleAddNews() {
  addNews(newsTitleInput.value, newsContentInput.value)
  newsTitleInput.value = ''
  newsContentInput.value = ''
}

function handleCircuitBreaker() {
  if (breakerSelect.value) toggleCircuitBreaker(breakerSelect.value)
}
</script>

<template>
  <div class="screen">
    <div class="admin-panel" style="border-color: var(--down-color);">
      <h2 style="color: var(--down-color);">⚠️ DEVRE KESİCİ UYGULAMASI (TRADING HALT)</h2>
      <div class="form-group">
        <label>İşlemleri Durdurulacak / Başlatılacak Hisseyi Seçin</label>
        <select v-model="breakerSelect">
          <option v-for="s in allStocks" :key="s.id" :value="s.id">
            {{ s.ticker }} - {{ s.name }} {{ s.halted ? '(🛑 DURDURULDU)' : '(🟢 AKTİF)' }}
          </option>
        </select>
      </div>
      <button
        class="submit-btn"
        style="width: 100%; background: var(--down-color); color: #fff;"
        @click="handleCircuitBreaker"
      >SEÇİLİ HİSSEYE DEVRE KESİCİ UYGULA / KALDIR</button>
    </div>

    <div class="admin-panel">
      <h2>📈 YENİ HİSSE SENEDİ EKLE (HALKA ARZ)</h2>
      <div class="form-group">
        <label>Kategori Seçimi</label>
        <select v-model="newStockCat">
          <option value="food">🍔 Gıda, İçecek & Tütün</option>
          <option value="auto">🚗 Otomotiv & Lojistik</option>
          <option value="security">🔫 Güvenlik & Silah</option>
          <option value="tech">💻 Teknoloji, İletişim & Finans</option>
          <option value="retail">🛒 Perakende & Sağlık</option>
        </select>
      </div>
      <div class="flex-row">
        <div class="form-group flex-1">
          <label>Hisse Kodu (Ticker - Örn: APP)</label>
          <input v-model="newStockTicker" type="text" placeholder="Max 5 Harf" maxlength="5" />
        </div>
        <div class="form-group flex-1">
          <label>Şirket Tam Adı</label>
          <input v-model="newStockName" type="text" placeholder="Örn: Los Santos Motors" />
        </div>
      </div>
      <div class="flex-row">
        <div class="form-group flex-1">
          <label>Piyasaya Çıkış Fiyatı ($)</label>
          <input v-model="newStockPrice" type="number" placeholder="Örn: 150.00" step="0.01" />
        </div>
        <div class="form-group flex-1">
          <label>Volatilite (Oynaklık Hızı, 1-15)</label>
          <input v-model="newStockVol" type="number" placeholder="Örn: 3.5" step="0.1" />
        </div>
      </div>
      <div class="form-group">
        <label>Şirket Profili (Lore / Detaylı Bilgi)</label>
        <textarea v-model="newStockDesc" placeholder="Şirketin hikayesini ve ne iş yaptığını yazın..."></textarea>
      </div>
      <button class="submit-btn" style="width: 100%;" @click="handleAddStock">HİSSEYİ PİYASAYA SÜR</button>
    </div>

    <div class="admin-panel">
      <h2>📻 LCN DUYURU VE BLOG YÖNETİMİ</h2>
      <div class="form-group">
        <label>Haber Başlığı</label>
        <input v-model="newsTitleInput" type="text" placeholder="Örn: Vangelico Hisselerinde Büyük Düşüş Bekleniyor" />
      </div>
      <div class="form-group">
        <label>Haber İçeriği</label>
        <textarea v-model="newsContentInput" placeholder="Duyuru detaylarını buraya giriniz..."></textarea>
      </div>
      <button class="submit-btn" @click="handleAddNews">DUYURUYU YAYINLA</button>
      <div class="admin-news-list">
        <h3>YAYINDAKİ DUYURULAR</h3>
        <div v-if="blogNews.length === 0" class="empty-news">Duyuru eklemediniz.</div>
        <div v-for="news in blogNews" :key="news.id" class="admin-news-item">
          <div class="admin-news-info">
            <strong>{{ news.title }}</strong>
            <span>{{ news.date }}</span>
          </div>
          <button class="del-btn" @click="deleteNews(news.id)">Sil</button>
        </div>
      </div>
    </div>
  </div>
</template>
