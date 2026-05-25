<script setup>
import { ref, onMounted, computed } from 'vue'

const isAppLoading = ref(true)
const showLoadingLogo = ref(true)
const showSlogan = ref(false)

// Tab state
const activeTab = ref('tracking') // 'tracking', 'adminLogin', 'adminDashboard'

// Data
const shipments = ref([])
const apiKeyValue = ref(import.meta.env.VITE_API_KEY) // Reactive API Key
const trackingEvents = ref([])

// Computed property for API_HEADERS to react to apiKeyValue changes
const computedApiHeaders = computed(() => ({
  'Content-Type': 'application/json',
  'X-API-KEY': apiKeyValue.value
}))

// LÜTFEN AŞAĞIDAKİ LİNKİ RENDER.COM'DAN ALDIĞINIZ KENDİ API LİNKİNİZ İLE DEĞİŞTİRİN:
const API_BASE_URL = 'https://gopostal.onrender.com'

async function initDB() {
  try {
    // Tüm verileri C# backendinizden çeker
    const res = await fetch(`${API_BASE_URL}/api/Kargo/getAll`, { headers: computedApiHeaders.value })
    if (res.ok) {
      const data = await res.json()
      shipments.value = data.shipments || []
      trackingEvents.value = data.events || []
    }
  } catch (err) {
    console.error('API Bağlantı Hatası: Lütfen arka planda dotnet uygulamanızın çalıştığından emin olun.', err)
  }
}

let audioPlayed = false;

onMounted(() => {
  initDB()
  
  // Ses logoyla beraber gelsin (Sayfa yüklenir yüklenmez)
  if (!audioPlayed) {
    audioPlayed = true;
    try { new Audio('/ses.mp3').play().catch(e => console.warn('Tarayıcı etkileşimsiz otomatik sesi engelledi:', e)) } catch (err) {}
  }

  // 1. Adım: Logo 2 saniye ekranda kalır, sonra kaybolur
  setTimeout(() => {
    showLoadingLogo.value = false
    
    // 2. Adım: Logo TAMAMEN kaybolduktan SONRA (800ms) yazı belirir
    setTimeout(() => {
      showSlogan.value = true
      
      // 3. Adım: Slogan ekranda 3 saniye kalır, sonra o da solarak gider ve site açılır
      setTimeout(() => {
        showSlogan.value = false
        
        // 4. Adım: Tam ana sayfaya geçilirken (slogan kaybolduktan sonra)
        setTimeout(() => { 
          isAppLoading.value = false 
        }, 800)
      }, 3000)
    }, 800)
  }, 2000)
})

// --- TRACKING LOGIC ---
const trackInput = ref('')
const isTracking = ref(false)
const trackError = ref('')
const trackResult = ref(null)

function performTracking() {
  trackError.value = ''
  trackResult.value = null
  
  if (!trackInput.value.trim()) {
    trackError.value = 'Lütfen geçerli bir takip numarası girin.'
    return
  }
  
  isTracking.value = true
  
  setTimeout(() => {
    const val = trackInput.value.trim().toLowerCase()
    const shipment = shipments.value.find(s => s.trackingNumber.toLowerCase() === val)
    
    if (shipment) {
      const events = trackingEvents.value
        .filter(e => e.shipmentId === shipment.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        
      trackResult.value = {
        ...shipment,
        events
      }
    } else {
      trackError.value = 'Gönderi bulunamadı, lütfen GoPostal takip numaranızı kontrol edin.'
    }
    isTracking.value = false
  }, 800) // Animasyon hissiyatı için bekleme
}

function formatDate(isoString) {
  const d = new Date(isoString)
  return d.toLocaleString('tr-TR')
}

// --- ADMIN LOGIC ---
const adminUser = ref('')
const adminPass = ref('')
const adminError = ref('')

function handleAdminLogin() {
  if (adminUser.value === 'admin' && adminPass.value === 'admin') {
    activeTab.value = 'adminDashboard'
    adminUser.value = ''
    adminPass.value = ''
    adminError.value = ''
  } else {
    adminError.value = 'Hatalı kullanıcı adı veya şifre!'
  }
}

function logoutAdmin() {
  activeTab.value = 'tracking'
}

// Admin: Add Shipment
const newShipment = ref({ trackingNumber: '', senderName: '', receiverName: '', origin: '', destination: '', weight: 1, courierName: '', courierPhoto: '' })
async function addShipment() {
  if (!newShipment.value.trackingNumber || !newShipment.value.senderName) {
    alert('Lütfen zorunlu alanları doldurun.')
    return
  }
  try {
    await fetch(`${API_BASE_URL}/api/Kargo/add-shipment`, {
      method: 'POST', 
      headers: computedApiHeaders.value,
      body: JSON.stringify(newShipment.value)
    })
    alert('Kargo başarıyla veritabanına eklendi!')
    newShipment.value = { trackingNumber: '', senderName: '', receiverName: '', origin: '', destination: '', weight: 1, courierName: '', courierPhoto: '' }
    initDB()
  } catch(err) {
    alert('Sunucu hatası oluştu.')
  }
}

// Admin: Add Event
const selectedShipmentId = ref('')
const newEvent = ref({ status: 'Sipariş Alındı', location: '', description: '' })
async function addEvent() {
  if (!selectedShipmentId.value || !newEvent.value.location) {
    alert('Lütfen kargo seçin ve konumu girin.')
    return
  }
  try {
    await fetch(`${API_BASE_URL}/api/Kargo/add-event`, {
      method: 'POST', 
      headers: computedApiHeaders.value,
      body: JSON.stringify({
        shipmentId: selectedShipmentId.value,
        status: newEvent.value.status,
        location: newEvent.value.location,
        description: newEvent.value.description
      })
    })
    alert('Kargo hareketi veritabanına işlendi!')
    newEvent.value = { status: 'Sipariş Alındı', location: '', description: '' }
    initDB()
  } catch(err) {
    alert('Sunucu hatası oluştu.')
  }
}

// Admin: Quick Update
const selectedStatuses = ref({})

function getLatestStatus(shipmentId) {
  const events = trackingEvents.value.filter(e => e.shipmentId === shipmentId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  return events.length > 0 ? events[0].status : 'Bekliyor'
}

async function quickUpdateStatus(shipmentId) {
  const status = selectedStatuses.value[shipmentId]
  if (!status) {
    alert('Lütfen bir durum seçin.')
    return
  }
  try {
    await fetch(`${API_BASE_URL}/api/Kargo/add-event`, {
      method: 'POST', 
      headers: computedApiHeaders.value,
      body: JSON.stringify({ 
        shipmentId, status, location: 'Sistem Güncellemesi', description: `Kargo durumu ${status} olarak güncellendi.` 
      })
    })
    alert(`Kargo durumu "${status}" yapıldı.`)
    initDB()
  } catch(err) {
    alert('Güncelleme sırasında hata oluştu.')
  }
}
</script>

<template>
  <div class="gp-app-container">
    
    <!-- YÜKLEME EKRANI (LOADING) -->
    <transition name="fade">
      <div v-if="isAppLoading" class="gp-loading-screen">
        <transition name="fade">
          <img v-if="showLoadingLogo" src="/gtawtr-go.webp" alt="GoPostal" class="breathing-logo" style="width: 200px;" />
        </transition>
        <transition name="fade">
          <h2 v-if="showSlogan" class="slogan-text">"We aim not to lose it"</h2>
        </transition>
      </div>
    </transition>

    <div v-if="!isAppLoading" class="gp-content">
      
      <!-- Marka ve Hero Section: Sol Üst Logo -->
      <div class="gp-header">
        <img src="/gtawtr-go.webp" alt="GoPostal Logo" class="breathing-logo" style="width: 110px; cursor: pointer;" @click="activeTab = 'tracking'" />
        
        <button v-if="activeTab === 'tracking' || activeTab === 'adminLogin'" class="btn-gp-outline" @click="activeTab = 'adminLogin'">YETKİLİ GİRİŞİ</button>
        <button v-if="activeTab === 'adminDashboard'" class="btn-gp-outline" @click="logoutAdmin">ÇIKIŞ YAP</button>
      </div>

      <!-- MÜŞTERİ TAKİP EKRANI -->
      <div v-if="activeTab === 'tracking'" class="gp-container pb-5">
        <!-- Ortalanmış Dikkat Çekici Başlık -->
        <div class="text-center mb-4 mt-2">
          <h1 class="gp-title">GoPostal Gönderinizi Takip Edin</h1>
          <p class="gp-subtitle mt-2">Takip numaranızı girin ve kargonuzun her adımını canlı izleyin.</p>
        </div>

        <!-- Arama Çubuğu -->
        <div class="gp-search-wrapper mb-5">
          <div class="gp-input-group shadow-sm">
            <input type="text" v-model="trackInput" class="gp-input" placeholder="Takip Numaranızı Girin (Örn: GP-1001)" @keypress.enter="performTracking" />
            <button class="btn-gp-red" @click="performTracking">TAKİP ET</button>
          </div>
          <!-- Hata / Uyarı Mesajı -->
          <div v-if="trackError" class="gp-alert error mt-3 shadow-sm">{{ trackError }}</div>
        </div>

        <!-- Yükleniyor (Loading Spinner) Ekranı -->
        <div v-if="isTracking" class="text-center mb-4">
          <div class="gp-spinner"></div>
          <h5 class="mt-3" style="color: var(--gp-blue); font-weight: bold;">Sistem Sorgulanıyor...</h5>
        </div>

        <!-- Sonuç Ekranı (Dinamik Render ve Timeline) -->
        <div v-if="trackResult && !isTracking" class="gp-results-wrapper">
          <!-- Kurye Bilgileri (Sadece Dağıtımda ise gösterilir) -->
          <div v-if="trackResult.events.length > 0 && trackResult.events[0].status === 'Dağıtımda'" class="gp-card mb-4" style="border-top: 4px solid var(--gp-red); display: flex; align-items: center; gap: 20px;">
            <img :src="trackResult.courierPhoto || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'" alt="Kurye Fotoğrafı" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--gp-blue);" />
            <div>
              <h3 style="margin: 0 0 8px 0; color: var(--gp-blue);">Kurye Bilgileri</h3>
              <p style="margin: 0; font-size: 15px;"><strong>Ad Soyad:</strong> {{ trackResult.courierName || 'GoPostal Kuryesi' }}</p>
              <p style="margin: 5px 0 0 0; font-size: 15px;"><strong>Durum:</strong> Kargonuz dağıtıma çıkmıştır, kuryemiz yolda.</p>
            </div>
          </div>

          <!-- Gönderi Özet Kartı -->
          <div class="gp-card mb-4" style="border-top: 4px solid var(--gp-blue);">
            <h4 class="gp-card-title">Gönderi Detayları</h4>
            <div class="gp-grid-2">
              <div><p class="gp-label">Takip No</p><h6 class="gp-val" style="color: var(--gp-red);">{{ trackResult.trackingNumber }}</h6></div>
              <div><p class="gp-label">Ağırlık</p><h6 class="gp-val">{{ trackResult.weight }} kg</h6></div>
              <div><p class="gp-label">Gönderen</p><h6 class="gp-val">{{ trackResult.senderName }}</h6></div>
              <div><p class="gp-label">Alıcı</p><h6 class="gp-val">{{ trackResult.receiverName }}</h6></div>
              <div style="grid-column: span 2;"><p class="gp-label">Rota</p><h6 class="gp-val">{{ trackResult.origin }} ➔ {{ trackResult.destination }}</h6></div>
            </div>
          </div>

          <!-- Timeline (Zaman Çizelgesi) Kartı -->
          <div class="gp-card">
            <h4 class="gp-card-title mb-4">Kargo Hareketleri</h4>
            <div class="timeline">
              <div v-if="trackResult.events.length === 0" class="text-muted fst-italic">Bu gönderi için henüz bir hareket kaydı bulunmamaktadır.</div>
              
              <div v-for="(e, index) in trackResult.events" :key="e.id" class="timeline-item">
                <h5 class="timeline-status" :style="{ color: index === 0 ? 'var(--gp-blue)' : 'var(--gp-red)' }">{{ e.status }}</h5>
                <small class="timeline-date">{{ formatDate(e.timestamp) }} &nbsp;|&nbsp; {{ e.location }}</small>
                <p class="timeline-desc">{{ e.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- YÖNETİCİ GİRİŞ EKRANI -->
      <div v-if="activeTab === 'adminLogin'" class="gp-container pb-5" style="max-width: 400px; margin-top: 50px;">
        <div class="gp-card text-center">
          <h2 style="color: var(--gp-blue); margin-bottom: 20px;">Yetkili Girişi</h2>
          <div class="gp-form-group">
            <input type="text" v-model="adminUser" placeholder="Kullanıcı Adı (admin)" class="gp-input w-100" />
          </div>
          <div class="gp-form-group mt-2">
            <input type="password" v-model="adminPass" placeholder="Şifre (admin)" class="gp-input w-100" @keypress.enter="handleAdminLogin" />
          </div>
          <div v-if="adminError" class="gp-alert error mt-2">{{ adminError }}</div>
          <button class="btn-gp-blue w-100 mt-3" @click="handleAdminLogin">GİRİŞ YAP</button>
        </div>
      </div>

      <!-- YÖNETİCİ KONTROL PANELİ -->
      <div v-if="activeTab === 'adminDashboard'" class="gp-container pb-5">
        <h2 style="color: var(--gp-blue); margin-bottom: 20px;">Yönetici Paneli</h2>
        
        <div class="gp-dashboard-grid">
          <!-- Yeni Kargo Ekle -->
          <div class="gp-card">
            <h4 class="gp-card-title">Yeni Kargo Oluştur</h4>
            <div class="gp-form-group"><label>Takip Numarası</label><input v-model="newShipment.trackingNumber" class="gp-input w-100" placeholder="GP-1002" /></div>
            <div class="gp-form-group"><label>Gönderen</label><input v-model="newShipment.senderName" class="gp-input w-100" placeholder="Örn: Ahmet" /></div>
            <div class="gp-form-group"><label>Alıcı</label><input v-model="newShipment.receiverName" class="gp-input w-100" placeholder="Örn: Mehmet" /></div>
            <div class="gp-form-group"><label>Çıkış Yeri</label><input v-model="newShipment.origin" class="gp-input w-100" /></div>
            <div class="gp-form-group"><label>Varış Yeri</label><input v-model="newShipment.destination" class="gp-input w-100" /></div>
            <div class="gp-form-group"><label>Ağırlık (kg)</label><input v-model="newShipment.weight" type="number" class="gp-input w-100" /></div>
            <div class="gp-form-group"><label>Kurye Adı Soyadı</label><input v-model="newShipment.courierName" class="gp-input w-100" placeholder="Örn: John Doe" /></div>
            <div class="gp-form-group"><label>Kurye Profil Fotoğrafı (URL)</label><input v-model="newShipment.courierPhoto" class="gp-input w-100" placeholder="https://..." /></div>
            <button class="btn-gp-blue w-100 mt-2" @click="addShipment">KARGO OLUŞTUR</button>
          </div>

          <!-- API Key Yönetimi -->
          <div class="gp-card">
            <h4 class="gp-card-title">API Anahtarı Yönetimi</h4>
            <div class="gp-form-group">
              <label>X-API-KEY</label>
              <input type="text" v-model="apiKeyValue" class="gp-input w-100" placeholder="API Anahtarınızı girin..." />
            </div>
            <p class="text-muted small" style="font-size: 12px; color: #6c757d;">Bu anahtar, tüm API çağrılarında `X-API-KEY` başlığı olarak kullanılacaktır.</p>
          </div>

          <!-- Kargo Hareketi Ekle -->
          <div class="gp-card">
            <h4 class="gp-card-title">Kargo Hareketi (Timeline) Ekle</h4>
            <div class="gp-form-group">
              <label>Kargo Seçin</label>
              <select v-model="selectedShipmentId" class="gp-input w-100">
                <option value="" disabled>-- Seçiniz --</option>
                <option v-for="s in shipments" :key="s.id" :value="s.id">{{ s.trackingNumber }} - {{ s.receiverName }}</option>
              </select>
            </div>
            <div class="gp-form-group">
              <label>Durum</label>
              <select v-model="newEvent.status" class="gp-input w-100">
                <option value="Sipariş Alındı">Sipariş Alındı</option>
                <option value="Yola Çıktı">Yola Çıktı</option>
                <option value="Dağıtıma Çıktı">Dağıtıma Çıktı</option>
                <option value="Teslim Edildi">Teslim Edildi</option>
              </select>
            </div>
            <div class="gp-form-group"><label>Konum</label><input v-model="newEvent.location" class="gp-input w-100" placeholder="Örn: Merkez Şube" /></div>
            <div class="gp-form-group"><label>Açıklama</label><input v-model="newEvent.description" class="gp-input w-100" placeholder="Örn: Kargo araca yüklendi." /></div>
            <button class="btn-gp-red w-100 mt-2" @click="addEvent">HAREKET EKLE</button>
          </div>

          <!-- Mevcut Kargoları Yönetme Tablosu -->
          <div class="gp-card" style="grid-column: 1 / -1;">
            <h4 class="gp-card-title">Mevcut Kargoları Yönet</h4>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
                <thead>
                  <tr style="border-bottom: 2px solid var(--gp-blue);">
                    <th style="padding: 12px;">Takip No</th>
                    <th style="padding: 12px;">Alıcı</th>
                    <th style="padding: 12px;">Kurye</th>
                    <th style="padding: 12px;">Son Durum</th>
                    <th style="padding: 12px;">Hızlı Güncelle</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="shipments.length === 0"><td colspan="5" class="text-center" style="padding: 15px;">Sistemde kargo bulunmuyor.</td></tr>
                  <tr v-for="s in shipments" :key="s.id" style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 12px; font-weight: bold; color: var(--gp-red);">{{ s.trackingNumber }}</td>
                    <td style="padding: 12px;">{{ s.receiverName }}</td>
                    <td style="padding: 12px;">{{ s.courierName || '-' }}</td>
                    <td style="padding: 12px;">
                      <span class="gp-badge" :style="{ backgroundColor: getLatestStatus(s.id) === 'Teslim Edildi' ? 'var(--gp-blue)' : (getLatestStatus(s.id) === 'Dağıtımda' ? '#28A745' : 'var(--gp-red)') }">
                        {{ getLatestStatus(s.id) }}
                      </span>
                    </td>
                    <td style="padding: 12px;">
                      <div style="display: flex; gap: 5px; align-items: center;">
                        <select v-model="selectedStatuses[s.id]" class="gp-input" style="padding: 6px; font-size: 13px; min-width: 120px;">
                          <option :value="undefined" disabled>Durum Seç...</option>
                          <option value="Hazırlanıyor">Hazırlanıyor</option>
                          <option value="Yola Çıktı">Yola Çıktı</option>
                          <option value="Dağıtımda">Dağıtımda</option>
                          <option value="Teslim Edildi">Teslim Edildi</option>
                        </select>
                        <button class="btn-gp-blue" style="padding: 6px 12px; font-size: 12px; border-radius: 4px;" @click="quickUpdateStatus(s.id)">GÜNCELLE</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<style>
:root {
  --gp-blue: #1A365D;
  --gp-red: #E3242B;
  --gp-bg: #F4F6F9;
}

body {
  margin: 0; 
  padding: 0;
  background-color: var(--gp-bg);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.gp-app-container {
  width: 100%;
  min-height: 100vh;
}

/* Yükleme Ekranı */
.gp-loading-screen {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background-color: #ffffff;
  z-index: 9999;
  display: flex; justify-content: center; align-items: center;
}

.slogan-text {
  font-size: 36px;
  font-weight: 900;
  color: var(--gp-blue);
  font-style: italic;
  position: absolute;
}

.breathing-logo {
  animation: breathing 2.5s ease-in-out infinite;
}
@keyframes breathing {
  0% { transform: scale(0.9); opacity: 0.7; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.7; }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.8s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Header */
.gp-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 40px;
}

.btn-gp-outline {
  background: transparent; color: var(--gp-blue); border: 2px solid var(--gp-blue);
  padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer; transition: 0.2s;
}
.btn-gp-outline:hover { background: var(--gp-blue); color: #fff; }

.gp-container { max-width: 900px; margin: 0 auto; padding: 0 20px; }

.text-center { text-align: center; }
.mt-2 { margin-top: 10px; }
.mt-3 { margin-top: 15px; }
.mb-4 { margin-bottom: 25px; }
.mb-5 { margin-bottom: 40px; }
.pb-5 { padding-bottom: 50px; }
.w-100 { width: 100%; box-sizing: border-box; }

.gp-title { color: var(--gp-blue); font-weight: 900; text-transform: uppercase; font-size: 32px; margin-bottom: 5px; }
@media (min-width: 768px) { .gp-title { font-size: 42px; } }
.gp-subtitle { color: #6c757d; font-size: 18px; margin-top: 0; }

.gp-search-wrapper { max-width: 700px; margin: 0 auto; }
.gp-input-group { display: flex; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden; }
.gp-input { flex: 1; padding: 18px 20px; font-size: 18px; border: 2px solid #e9ecef; border-right: none; outline: none; border-radius: 8px 0 0 8px; }
.gp-input:focus { border-color: var(--gp-blue); }
.btn-gp-red { background-color: var(--gp-red); color: white; border: none; padding: 0 40px; font-size: 18px; font-weight: bold; cursor: pointer; transition: 0.2s; border-radius: 0 8px 8px 0; }
.btn-gp-red:hover { background-color: #b91d23; }

.btn-gp-blue { background-color: var(--gp-blue); color: white; border: none; padding: 15px; font-size: 16px; font-weight: bold; cursor: pointer; border-radius: 8px; transition: 0.2s; }
.btn-gp-blue:hover { background-color: #0d1e36; }

.gp-alert { padding: 15px; border-radius: 8px; font-weight: bold; text-align: center; }
.gp-alert.error { background-color: #FDEDEC; color: #E74C3C; border: 1px solid #FADBD8; }
.gp-badge { color: white; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; }

.gp-spinner {
  width: 50px; height: 50px; border: 5px solid rgba(227, 36, 43, 0.2); border-top-color: var(--gp-red);
  border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;
}
@keyframes spin { to { transform: rotate(360deg); } }

.gp-results-wrapper { max-width: 700px; margin: 0 auto; }

.gp-card { background: #fff; border-radius: 12px; padding: 30px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
.gp-card-title { color: var(--gp-blue); font-weight: bold; margin-top: 0; margin-bottom: 20px; font-size: 20px; }

.gp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.gp-label { margin: 0; font-size: 13px; color: #6c757d; }
.gp-val { margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: #212529; }

/* Timeline */
.timeline { border-left: 3px solid #e9ecef; padding-left: 20px; margin-left: 10px; }
.timeline-item { position: relative; padding-bottom: 1.5rem; }
.timeline-item:last-child { padding-bottom: 0; }
.timeline-item::before {
  content: ''; position: absolute; left: -28px; top: 4px; width: 14px; height: 14px;
  border-radius: 50%; background-color: var(--gp-red); border: 2px solid white; box-shadow: 0 0 0 2px var(--gp-red);
}
.timeline-item:first-child::before {
  background-color: var(--gp-blue); box-shadow: 0 0 0 3px var(--gp-blue);
  width: 18px; height: 18px; left: -30px; top: 2px;
}
.timeline-status { margin: 0 0 5px 0; font-weight: bold; font-size: 16px; }
.timeline-date { color: #6c757d; display: block; margin-bottom: 8px; font-weight: 600; font-size: 13px; }
.timeline-desc { margin: 0; color: #495057; font-size: 14px; }

/* Admin Dashboard */
.gp-dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 768px) { .gp-dashboard-grid { grid-template-columns: 1fr; } }
.gp-form-group { margin-bottom: 15px; text-align: left; }
.gp-form-group label { display: block; font-size: 13px; font-weight: bold; margin-bottom: 5px; color: var(--gp-blue); }
.gp-form-group .gp-input { padding: 12px; font-size: 14px; border: 1px solid #ced4da; border-radius: 4px; outline: none; }
.gp-form-group .gp-input:focus { border-color: var(--gp-blue); }
</style>
