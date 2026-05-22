<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMarket } from '../../composables/useMarket'
import { useNews } from '../../composables/useNews'
import { useFinance } from '../../composables/useFinance'

const { marketData, getAllStocks, toggleCircuitBreaker, addNewStock } = useMarket()
const { blogNews, addNews, deleteNews } = useNews()
const { userWallets, saveFinanceData } = useFinance()

const isMobileView = ref(false)

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

const advName = ref('')
const advPhoto = ref('')
const advSlogan = ref('')
const advPhone = ref('')
const advisors = ref([])
const editAdvId = ref(null)

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
  if (breakerSelect.value) {
    toggleCircuitBreaker(breakerSelect.value)
    const stock = allStocks.value.find(s => s.id === breakerSelect.value)
    if (stock) {
      if (stock.halted) {
        addNews(`DEVRE KESİCİ: ${stock.name} (${stock.ticker})`, `Sermaye Piyasası Kurulu (SPK) kararınca, ${stock.name} hissesinde yaşanan olağandışı fiyat hareketleri ve aşırı volatilite nedeniyle "Devre Kesici" uygulaması başlatılmış ve hisse işlemleri geçici olarak durdurulmuştur. Kamuoyuna saygıyla duyurulur.`)
      } else {
        addNews(`İŞLEMLER BAŞLADI: ${stock.name} (${stock.ticker})`, `${stock.name} hissesinde uygulanan Devre Kesici (Trading Halt) kaldırılmış olup, tahta yeniden işlemlere ve emirlere açılmıştır. Yatırımcılarımızın bilgisine sunarız.`)
      }
    }
  }
}

const depositRequests = ref([])
let reqInterval = null

function loadRequests() {
  depositRequests.value = JSON.parse(localStorage.getItem('gtawtr_deposit_requests') || '[]')
  
  let loadedAdvs = localStorage.getItem('gtawtr_advisors')
  if (!loadedAdvs) {
    const defaultAdv = [{ id: 1, name: 'Marcus Vance', phone: '555-0199', slogan: 'Kıdemli Portföy Yöneticisi', photo: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' }]
    localStorage.setItem('gtawtr_advisors', JSON.stringify(defaultAdv))
    advisors.value = defaultAdv
  } else {
    advisors.value = JSON.parse(loadedAdvs)
  }
}

onMounted(() => {
  loadRequests()
  // Talepleri her 2 saniyede bir otomatik yenile
  reqInterval = setInterval(loadRequests, 2000)
})

onUnmounted(() => {
  if (reqInterval) clearInterval(reqInterval)
})

function approveRequest(reqId) {
  const requests = JSON.parse(localStorage.getItem('gtawtr_deposit_requests') || '[]')
  const reqIndex = requests.findIndex(r => r.id === reqId)
  if (reqIndex > -1 && requests[reqIndex].status === 'pending') {
    const user = requests[reqIndex].user
    const amount = requests[reqIndex].amount
    
    // Kullanıcının bakiyesine parayı ekle
    if (userWallets.value[user] === undefined) userWallets.value[user] = 0
    userWallets.value[user] += amount
    saveFinanceData()
    
    requests[reqIndex].status = 'approved'
    localStorage.setItem('gtawtr_deposit_requests', JSON.stringify(requests))
    loadRequests()
  }
}

function rejectRequest(reqId) {
  const requests = JSON.parse(localStorage.getItem('gtawtr_deposit_requests') || '[]')
  const reqIndex = requests.findIndex(r => r.id === reqId)
  if (reqIndex > -1 && requests[reqIndex].status === 'pending') {
    requests[reqIndex].status = 'rejected'
    localStorage.setItem('gtawtr_deposit_requests', JSON.stringify(requests))
    loadRequests()
  }
}

function clearHistory() {
  if (!confirm('Onaylanmış ve reddedilmiş tüm geçmiş talepleri silmek istediğinize emin misiniz?')) return
  const requests = JSON.parse(localStorage.getItem('gtawtr_deposit_requests') || '[]')
  const pending = requests.filter(r => r.status === 'pending')
  localStorage.setItem('gtawtr_deposit_requests', JSON.stringify(pending))
  loadRequests()
}

function handleAddAdvisor() {
  const name = advName.value.trim()
  const phone = advPhone.value.trim()
  const slogan = advSlogan.value.trim()
  // Eğer resim girilmezse varsayılan boş bir profil fotoğrafı koyar
  const photo = advPhoto.value.trim() || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'

  if (!name || !phone || !slogan) {
    alert('Lütfen isim, slogan ve telefon numarası girin.')
    return
  }
  const list = JSON.parse(localStorage.getItem('gtawtr_advisors') || '[]')
  
  if (editAdvId.value) {
    const idx = list.findIndex(a => a.id === editAdvId.value)
    if (idx > -1) {
      list[idx] = { id: editAdvId.value, name, phone, slogan, photo }
    }
    editAdvId.value = null
  } else {
    list.push({ id: Date.now(), name, phone, slogan, photo })
  }
  
  localStorage.setItem('gtawtr_advisors', JSON.stringify(list))
  
  advName.value = ''
  advPhone.value = ''
  advSlogan.value = ''
  advPhoto.value = ''
  loadRequests()
}

function editAdvisor(adv) {
  editAdvId.value = adv.id
  advName.value = adv.name
  advPhoto.value = adv.photo
  advSlogan.value = adv.slogan
  advPhone.value = adv.phone
}

function deleteAdvisor(id) {
  if (!confirm('Bu danışmanı silmek istediğinize emin misiniz?')) return
  let list = JSON.parse(localStorage.getItem('gtawtr_advisors') || '[]')
  list = list.filter(a => a.id !== id)
  localStorage.setItem('gtawtr_advisors', JSON.stringify(list))
  loadRequests()
}
</script>

<template>
  <div class="admin-container">
    <div class="screen" :class="{ 'mobile-view': isMobileView }">
    <div class="admin-panel" style="border-color: var(--down-color);">
      <h2 style="color: var(--down-color);">DEVRE KESİCİ UYGULAMASI (TRADING HALT)</h2>
      <div class="form-group">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
          <label style="margin-bottom: 0;">İşlemleri Durdurulacak / Başlatılacak Hisseyi Seçin</label>
          <button class="submit-btn" style="padding: 5px 10px; font-size: 12px; margin: 0;" @click="isMobileView = !isMobileView">
            <span v-if="isMobileView">🖥️ Masaüstü</span>
            <span v-else>📱 Mobil</span>
          </button>
        </div>
        <select v-model="breakerSelect">
          <option v-for="s in allStocks" :key="s.id" :value="s.id">
            {{ s.ticker }} - {{ s.name }} {{ s.halted ? '(DURDURULDU)' : '(AKTİF)' }}
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
      <h2>YENİ HİSSE SENEDİ EKLE (HALKA ARZ)</h2>
      <div class="form-group">
        <label>Kategori Seçimi</label>
        <select v-model="newStockCat">
          <option value="food">Gıda, İçecek & Tütün</option>
          <option value="auto">Otomotiv & Lojistik</option>
          <option value="security">Güvenlik & Silah</option>
          <option value="tech">Teknoloji, İletişim & Finans</option>
          <option value="retail">Perakende & Sağlık</option>
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
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h2 style="margin:0;">PARA EKLEME TALEPLERİ</h2>
        <button class="submit-btn" style="font-size: 12px; padding: 5px 10px; margin:0;" @click="clearHistory">Geçmişi Temizle</button>
      </div>
      <table class="history-table">
        <thead>
          <tr>
            <th>Kullanıcı</th>
            <th>Miktar</th>
            <th>Tarih</th>
            <th>Durum</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="depositRequests.length === 0">
            <td colspan="5" style="text-align:center; font-style:italic;">Bekleyen talep yok.</td>
          </tr>
          <tr v-for="req in depositRequests" :key="req.id">
            <td>@{{ req.user }}</td>
            <td style="font-weight: bold; color: var(--up-color);">${{ req.amount.toFixed(2) }}</td>
            <td style="font-size: 13px;">{{ req.date }}</td>
            <td>
              <span v-if="req.status === 'pending'" style="color: #f39c12;">Bekliyor</span>
              <span v-else-if="req.status === 'approved'" style="color: var(--up-color);">Onaylandı</span>
              <span v-else style="color: var(--down-color);">Reddedildi</span>
            </td>
            <td>
              <template v-if="req.status === 'pending'">
                <button class="submit-btn" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;" @click="approveRequest(req.id)">Onayla</button>
                <button class="submit-btn" style="padding: 5px 10px; font-size: 12px; background: var(--down-color);" @click="rejectRequest(req.id)">Reddet</button>
              </template>
              <template v-else>
                -
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="admin-panel">
      <h2>LCN DUYURU VE BLOG YÖNETİMİ</h2>
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

    <div class="admin-panel">
      <h2>DANIŞMAN VE FİNANS UZMANI YÖNETİMİ</h2>
      <div class="flex-row">
        <div class="form-group flex-1">
          <label>Ad Soyad</label>
          <input v-model="advName" type="text" placeholder="Örn: John Doe" />
        </div>
        <div class="form-group flex-1">
          <label>Fotoğraf URL (İsteğe Bağlı)</label>
          <input v-model="advPhoto" type="text" placeholder="Resim linki..." />
        </div>
      </div>
      <div class="flex-row">
        <div class="form-group flex-1">
          <label>Slogan / Uzmanlık Alanı</label>
          <input v-model="advSlogan" type="text" placeholder="Örn: Kripto Analisti" />
        </div>
        <div class="form-group flex-1">
          <label>Telefon Numarası</label>
          <input v-model="advPhone" type="text" placeholder="Örn: 555-0199" />
        </div>
      </div>
      <button class="submit-btn" style="width: 100%;" @click="handleAddAdvisor">
        {{ editAdvId ? 'DANIŞMANI GÜNCELLE' : 'DANIŞMAN EKLE' }}
      </button>
      
      <div class="admin-news-list" style="margin-top: 20px;">
        <h3>KAYITLI DANIŞMANLAR</h3>
        <div v-if="advisors.length === 0" class="empty-news">Henüz danışman eklenmedi.</div>
        <div v-for="adv in advisors" :key="adv.id" class="admin-news-item" style="display:flex; align-items:center;">
          <img :src="adv.photo" style="width:40px; height:40px; border-radius:50%; margin-right:10px; object-fit: cover;" />
          <div class="admin-news-info" style="flex: 1;">
            <strong>{{ adv.name }}</strong> - TEL: {{ adv.phone }}
            <div style="font-size:12px; color:var(--text-muted);">{{ adv.slogan }}</div>
          </div>
          <div>
            <button class="submit-btn" style="padding: 5px 10px; margin-right: 5px; font-size: 12px;" @click="editAdvisor(adv)">Düzenle</button>
            <button class="del-btn" @click="deleteAdvisor(adv.id)">Sil</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<style scoped>
.mobile-view {
  max-width: 400px;
  margin: 0 auto;
  border: 8px solid #2c3e50;
  border-radius: 35px;
  height: 80vh;
  overflow-y: auto;
  padding: 20px 15px;
  box-shadow: 0px 10px 30px rgba(0,0,0,0.5);
  background-color: var(--bg-color, #121212);
}

.mobile-view .flex-row {
  flex-direction: column !important;
}

.mobile-view .history-table {
  display: block;
  overflow-x: auto;
  white-space: nowrap;
}

</style>
