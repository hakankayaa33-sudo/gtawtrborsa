import { ref } from 'vue'
import { useToast } from './useToast'

const { showToast } = useToast()
const VISIBLE_TICKS = 80

const DEFAULT_STOCKS = {
  food: [
    { id: 'bll', ticker: 'CLK', name: "Cluckin' Bell", desc: "San Andreas merkezli dev fast-food tavuk zinciri.", basePrice: 45.20, vol: 1.5, data: [], hist1D: [], hist1M: [], hist1Y: [], high: 45.20, low: 45.20, halted: false },
    { id: 'bsq', ticker: 'BRG', name: "Burger Shot", desc: "Meşhur 'Bleeder' burgeriyle bilinen ikonik restoran.", basePrice: 32.10, vol: 1.2, data: [], hist1D: [], hist1M: [], hist1Y: [], high: 32.10, low: 32.10, halted: false },
    { id: 'upa', ticker: 'UPA', name: "Up-n-Atom", desc: "Los Santos'a özgü, uzay temalı nostaljik hamburger zinciri.", basePrice: 28.50, vol: 1.0, data: [], hist1D: [], hist1M: [], hist1Y: [], high: 28.50, low: 28.50, halted: false },
    { id: 'tbo', ticker: 'TBO', name: "Taco Bomb", desc: "Ucuz Meksika lezzetleri sunan fast-food devi.", basePrice: 22.40, vol: 1.8, data: [], hist1D: [], hist1M: [], hist1Y: [], high: 22.40, low: 22.40, halted: false },
    { id: 'ecl', ticker: 'ECL', name: "eCola", desc: "Dünyanın en popüler kafeinli soda markası.", basePrice: 65.00, vol: 2.2, data: [], hist1D: [], hist1M: [], hist1Y: [], high: 65.00, low: 65.00, halted: false }
  ],
  auto: [
    { id: 'lsc', ticker: 'LSC', name: "Los Santos Customs", desc: "Şehrin araç kültürünün kalbi.", basePrice: 115.00, vol: 3.5, data: [], hist1D: [], hist1M: [], hist1Y: [], high: 115.00, low: 115.00, halted: false },
    { id: 'vap', ticker: 'VAP', name: "Vapid Motor Co.", desc: "Büyük Amerikan otomotiv devi.", basePrice: 85.30, vol: 2.5, data: [], hist1D: [], hist1M: [], hist1Y: [], high: 85.30, low: 85.30, halted: false },
    { id: 'uma', ticker: 'UMA', name: "Ubermacht", desc: "Alman mühendisliğinin lüks ve performansla buluştuğu nokta.", basePrice: 245.00, vol: 5.5, data: [], hist1D: [], hist1M: [], hist1Y: [], high: 245.00, low: 245.00, halted: false }
  ],
  security: [
    { id: 'amu', ticker: 'AMU', name: "Ammu-Nation", desc: "Vatansever silah mağazası zinciri.", basePrice: 210.50, vol: 6.0, data: [], hist1D: [], hist1M: [], hist1Y: [], high: 210.50, low: 210.50, halted: false },
    { id: 'mer', ticker: 'MER', name: "Merryweather", desc: "Özel güvenlik ve askeri danışmanlık şirketi.", basePrice: 155.00, vol: 5.5, data: [], hist1D: [], hist1M: [], hist1Y: [], high: 155.00, low: 155.00, halted: false }
  ],
  tech: [
    { id: 'lfi', ticker: 'LFI', name: "Lifeinvader", desc: "Dünyanın en büyük sosyal ağı.", basePrice: 18.50, vol: 4.0, data: [], hist1D: [], hist1M: [], hist1Y: [], high: 18.50, low: 18.50, halted: false },
    { id: 'maz', ticker: 'MAZ', name: "Maze Bank", desc: "Los Santos ekonomisini tekeline almış finans devi.", basePrice: 450.00, vol: 10.0, data: [], hist1D: [], hist1M: [], hist1Y: [], high: 450.00, low: 450.00, halted: false },
    { id: 'frt', ticker: 'FRT', name: "Fruit Computers", desc: "iFruit akıllı telefonlarıyla dünyayı kasıp kavuran teknoloji devi.", basePrice: 280.00, vol: 7.5, data: [], hist1D: [], hist1M: [], hist1Y: [], high: 280.00, low: 280.00, halted: false }
  ],
  retail: [
    { id: 'bet', ticker: 'BET', name: "Betta Pharmaceuticals", desc: "Tartışmalı ilaçlar ve dev bütçesiyle bilinen ilaç devi.", basePrice: 310.00, vol: 8.0, data: [], hist1D: [], hist1M: [], hist1Y: [], high: 310.00, low: 310.00, halted: false },
    { id: 'vag', ticker: 'VAG', name: "Vangelico", desc: "Rockford Hills'te konumlanan ikonik ve prestijli mücevher mağazası.", basePrice: 520.00, vol: 12.0, data: [], hist1D: [], hist1M: [], hist1Y: [], high: 520.00, low: 520.00, halted: false }
  ]
}

const marketData = ref({})
const masterIndexData = ref([])
const tickVersion = ref(0)

function generateMockHistory(basePrice, vol, pts) {
  let arr = [basePrice]
  let current = basePrice
  for (let i = 0; i < pts; i++) {
    current = Math.max(1, current + ((Math.random() - 0.5) * vol * 2) + (Math.sin(i / (pts / 5)) * (vol * 0.5)))
    arr.push(current)
  }
  return arr
}

function saveMemory() {
  localStorage.setItem('lcn_market_state', JSON.stringify(marketData.value))
  localStorage.setItem('lcn_master_index', JSON.stringify(masterIndexData.value))
}

function loadMemory() {
  const savedData = localStorage.getItem('lcn_market_state')
  const savedIndex = localStorage.getItem('lcn_master_index')
  if (savedData) {
    marketData.value = JSON.parse(savedData)
    masterIndexData.value = savedIndex ? JSON.parse(savedIndex) : []
  } else {
    marketData.value = JSON.parse(JSON.stringify(DEFAULT_STOCKS))
    Object.values(marketData.value).flat().forEach(s => {
      s.data = [s.basePrice]
      s.hist1D = generateMockHistory(s.basePrice, s.vol * 0.5, 100)
      s.hist1M = generateMockHistory(s.hist1D[0], s.vol * 1.5, 150)
      s.hist1Y = generateMockHistory(s.hist1M[0], s.vol * 3.0, 200)
      if (s.halted === undefined) s.halted = false
    })
    saveMemory()
  }
}

function resetMemory() {
  if (confirm('Tüm borsa verilerini sıfırlamak istediğine emin misin?')) {
    localStorage.clear()
    location.reload()
  }
}

function getAllStocks() {
  return Object.values(marketData.value).flat()
}

function findStock(id) {
  return getAllStocks().find(x => x.id === id)
}

function simulateTick({ currentUser, userPortfolios, userWallets, saveFinanceData, updateWalletCb, logTransaction } = {}) {
  let totalIdx = 0
  let count = 0
  getAllStocks().forEach(s => {
    const last = s.data[s.data.length - 1]
    let next = last
    if (!s.halted) {
      next = Math.max(1, last + ((Math.random() - 0.5) * (s.vol * 0.5)) + (((s.basePrice - last) / s.basePrice) * (s.vol * 0.1)))
    }
    if (next > s.high) s.high = next
    if (next < s.low) s.low = next
    s.data.push(next)
    if (s.data.length > VISIBLE_TICKS) s.data.shift()
    totalIdx += next
    count++
  })
  masterIndexData.value.push((totalIdx / count) * 10)
  if (masterIndexData.value.length > VISIBLE_TICKS * 2) masterIndexData.value.shift()
  tickVersion.value++
  saveMemory()

  if (Math.random() < 0.015) {
    const allS = getAllStocks()
    const rndStock = allS[Math.floor(Math.random() * allS.length)]
    const eventType = Math.random()
    if (eventType < 0.3) {
      if (currentUser && userPortfolios && userPortfolios[currentUser] && userPortfolios[currentUser][rndStock.id]) {
        const p = userPortfolios[currentUser][rndStock.id]
        const lot = typeof p === 'number' ? p : p.lot
        if (lot > 0) {
          const curPrice = rndStock.data[rndStock.data.length - 1]
          const dividend = lot * curPrice * 0.02
          if (userWallets) userWallets[currentUser] += dividend
          if (saveFinanceData) saveFinanceData()
          if (updateWalletCb) updateWalletCb()
          if (logTransaction) logTransaction(rndStock.id, 'TEMETTÜ', lot, curPrice, dividend)
          showToast(`💰 TEMETTÜ: ${rndStock.ticker} hissedarlarına temettü dağıttı! $${dividend.toFixed(2)} kazandınız.`, 'success')
        }
      }
    } else if (eventType < 0.65) {
      rndStock.basePrice *= 1.05
      if (currentUser && userPortfolios && userPortfolios[currentUser] && userPortfolios[currentUser][rndStock.id]) {
        showToast(`📰 HABER: ${rndStock.ticker} şirketinden harika çeyrek raporu! Hisseler uçuşta.`, 'success')
      }
    } else {
      rndStock.basePrice *= 0.95
      if (currentUser && userPortfolios && userPortfolios[currentUser] && userPortfolios[currentUser][rndStock.id]) {
        showToast(`📰 HABER: ${rndStock.ticker} şirketinde skandal! Hisseler düşüyor.`, 'error')
      }
    }
  }
}

function addNewStock(cat, ticker, name, price, vol, desc) {
  const id = ticker.toLowerCase() + '_' + Date.now().toString().slice(-4)
  const newStock = { id, ticker, name, desc, basePrice: price, vol, data: [price], high: price, low: price, halted: false }
  newStock.hist1D = generateMockHistory(price, vol * 0.5, 100)
  newStock.hist1M = generateMockHistory(newStock.hist1D[0], vol * 1.5, 150)
  newStock.hist1Y = generateMockHistory(newStock.hist1M[0], vol * 3.0, 200)
  if (!marketData.value[cat]) marketData.value[cat] = []
  marketData.value[cat].push(newStock)
  saveMemory()
  tickVersion.value++
}

function toggleCircuitBreaker(stockId) {
  const stock = findStock(stockId)
  if (stock) {
    stock.halted = !stock.halted
    saveMemory()
    tickVersion.value++
    if (stock.halted) showToast(`${stock.ticker} hissesine DEVRE KESİCİ uygulandı.`, 'error')
    else showToast(`${stock.ticker} hissesindeki devre kesici kaldırıldı.`, 'success')
  }
}

export function useMarket() {
  return {
    marketData,
    masterIndexData,
    tickVersion,
    loadMemory,
    saveMemory,
    resetMemory,
    getAllStocks,
    findStock,
    simulateTick,
    addNewStock,
    toggleCircuitBreaker,
    generateMockHistory
  }
}
