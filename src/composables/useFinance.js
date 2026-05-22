import { ref, computed } from 'vue'
import { useMarket } from './useMarket'
import { useAuth } from './useAuth'
import { useToast } from './useToast'

const { getAllStocks, findStock, saveMemory } = useMarket()
const { currentUser } = useAuth()
const { showToast } = useToast()

const userWallets = ref({})
const userPortfolios = ref({})
const userHistory = ref({})
const userWatchlist = ref({})
const userLoans = ref({})

export function useFinance() {
  function loadFinanceData() {
    userWallets.value = JSON.parse(localStorage.getItem('lcn_wallets')) || {}
    userPortfolios.value = JSON.parse(localStorage.getItem('lcn_portfolios')) || {}
    userHistory.value = JSON.parse(localStorage.getItem('lcn_history')) || {}
    userWatchlist.value = JSON.parse(localStorage.getItem('lcn_watchlist')) || {}
    userLoans.value = JSON.parse(localStorage.getItem('lcn_loans')) || {}
  }

  function saveFinanceData() {
    localStorage.setItem('lcn_wallets', JSON.stringify(userWallets.value))
    localStorage.setItem('lcn_portfolios', JSON.stringify(userPortfolios.value))
    localStorage.setItem('lcn_loans', JSON.stringify(userLoans.value))
  }

  function ensureProfile() {
    const u = currentUser.value
    if (!u) return
    if (userWallets.value[u] === undefined) userWallets.value[u] = 0
    if (!userPortfolios.value[u]) userPortfolios.value[u] = {}
    if (!userHistory.value[u]) userHistory.value[u] = []
    if (!userWatchlist.value[u]) userWatchlist.value[u] = []
    if (!userLoans.value[u]) userLoans.value[u] = 0
    saveFinanceData()
  }

  function getBalance() {
    const u = currentUser.value
    return u ? (userWallets.value[u] || 0) : 0
  }

  function getLoanDebt() {
    const u = currentUser.value
    return u ? (userLoans.value[u] || 0) : 0
  }

  function getPortfolioValue() {
    const u = currentUser.value
    if (!u) return 0
    let total = 0
    getAllStocks().forEach(stock => {
      const p = userPortfolios.value[u]?.[stock.id]
      if (!p) return
      const lot = typeof p === 'number' ? p : p.lot
      const price = stock.data[stock.data.length - 1]
      total += lot * price
    })
    return total
  }

  function logTransaction(stockId, type, lot, price, total) {
    const u = currentUser.value
    if (!u) return
    if (!userHistory.value[u]) userHistory.value[u] = []
    const stock = findStock(stockId)
    userHistory.value[u].unshift({
      date: new Date().toLocaleString(),
      ticker: stock?.ticker || stockId,
      type,
      lot,
      price,
      total
    })
    localStorage.setItem('lcn_history', JSON.stringify(userHistory.value))
  }

  function depositMoney(amount) {
    const u = currentUser.value
    if (!u) { showToast('Para eklemek için önce giriş yapmalısın.', 'error'); return }
    if (isNaN(amount) || amount <= 0) { showToast('Geçerli bir miktar giriniz.', 'error'); return }
    ensureProfile()
    userWallets.value[u] += amount
    getAllStocks().forEach(stock => {
      stock.basePrice += amount * 0.0003
      stock.data.push(stock.basePrice)
    })
    saveFinanceData()
    saveMemory()
    showToast(`$${amount.toFixed(2)} yatırım hesabınıza aktarıldı.`, 'info')
  }

  function takeLoan(amount) {
    const u = currentUser.value
    if (!u) { showToast('Kredi almak için giriş yapmalısınız.', 'error'); return }
    if (isNaN(amount) || amount <= 0) { showToast('Geçerli bir miktar giriniz.', 'error'); return }
    ensureProfile()
    userWallets.value[u] += amount
    userLoans.value[u] = (userLoans.value[u] || 0) + amount
    saveFinanceData()
    showToast(`$${amount.toFixed(2)} kredi hesabınıza aktarıldı.`, 'success')
  }

  function repayLoan(amount) {
    const u = currentUser.value
    if (!u) { showToast('Borç ödemek için giriş yapmalısınız.', 'error'); return }
    const debt = userLoans.value[u] || 0
    if (debt <= 0) { showToast('Ödenmesi gereken borcunuz bulunmuyor.', 'info'); return }
    if (isNaN(amount) || amount <= 0) { showToast('Geçerli bir miktar giriniz.', 'error'); return }
    if (userWallets.value[u] < amount) { showToast('Yetersiz bakiye!', 'error'); return }
    const payAmount = Math.min(amount, debt)
    userWallets.value[u] -= payAmount
    userLoans.value[u] -= payAmount
    saveFinanceData()
    showToast(`$${payAmount.toFixed(2)} borç ödendi.`, 'success')
  }

  function buyStock(stockId, lot) {
    const u = currentUser.value
    if (!u || !stockId) { showToast('İşlem yapabilmek için sisteme giriş yapmalısınız.', 'error'); return }
    ensureProfile()
    const stock = findStock(stockId)
    if (!stock) return
    if (isNaN(lot) || lot <= 0) { showToast('Geçerli bir lot miktarı giriniz.', 'error'); return }
    if (stock.halted) { showToast('Bu hisse devre kesicide, işlem yapılamaz.', 'error'); return }
    const currentPrice = stock.data[stock.data.length - 1]
    const totalCost = currentPrice * lot
    if (userWallets.value[u] < totalCost) { showToast('Yetersiz bakiye! İşlem gerçekleşmedi.', 'error'); return }
    userWallets.value[u] -= totalCost
    if (!userPortfolios.value[u][stockId]) {
      userPortfolios.value[u][stockId] = { lot: 0, avgCost: 0 }
    } else if (typeof userPortfolios.value[u][stockId] === 'number') {
      userPortfolios.value[u][stockId] = { lot: userPortfolios.value[u][stockId], avgCost: currentPrice }
    }
    const p = userPortfolios.value[u][stockId]
    const totalCostBefore = p.lot * p.avgCost
    p.lot += lot
    p.avgCost = (totalCostBefore + totalCost) / p.lot
    stock.basePrice += lot * 0.08
    stock.data.push(stock.basePrice)
    saveFinanceData()
    saveMemory()
    logTransaction(stockId, 'ALIŞ', lot, currentPrice, totalCost)
    showToast(`${stock.ticker} hissesinden ${lot} lot satın alındı. Maliyet: $${totalCost.toFixed(2)}`, 'success')
  }

  function sellStock(stockId, lotCount) {
    const u = currentUser.value
    if (!u) return
    const stock = findStock(stockId)
    if (!stock) return
    let p = userPortfolios.value[u]?.[stockId]
    if (!p) return
    const currentLot = typeof p === 'number' ? p : p.lot
    if (currentLot <= 0) return
    const sellLot = lotCount || parseInt(prompt(`${stock.ticker} hissesinden kaç lot satmak istiyorsunuz? (Mevcut: ${currentLot} Lot)`))
    if (isNaN(sellLot) || sellLot <= 0 || sellLot > currentLot) { showToast('Geçersiz lot miktarı.', 'error'); return }
    if (stock.halted) { showToast('Bu hisse devre kesicide. İşlem yapılamaz.', 'error'); return }
    const currentPrice = stock.data[stock.data.length - 1]
    const totalRevenue = currentPrice * sellLot
    userWallets.value[u] += totalRevenue
    if (typeof p === 'number') {
      userPortfolios.value[u][stockId] -= sellLot
      if (userPortfolios.value[u][stockId] <= 0) delete userPortfolios.value[u][stockId]
    } else {
      p.lot -= sellLot
      if (p.lot <= 0) delete userPortfolios.value[u][stockId]
    }
    stock.basePrice -= sellLot * 0.08
    stock.data.push(stock.basePrice)
    saveFinanceData()
    saveMemory()
    logTransaction(stockId, 'SATIŞ', sellLot, currentPrice, totalRevenue)
    showToast(`${stock.ticker} hissesinden ${sellLot} lot satıldı. Gelir: $${totalRevenue.toFixed(2)}`, 'success')
  }

  function toggleWatchlist(stockId) {
    const u = currentUser.value
    if (!u || !stockId) { showToast('İzleme listesi için giriş yapın.', 'error'); return }
    ensureProfile()
    const wl = userWatchlist.value[u]
    const idx = wl.indexOf(stockId)
    if (idx > -1) {
      wl.splice(idx, 1)
      showToast('Hisse izleme listesinden çıkarıldı.', 'info')
    } else {
      wl.push(stockId)
      showToast('Hisse izleme listesine eklendi.', 'success')
    }
    localStorage.setItem('lcn_watchlist', JSON.stringify(userWatchlist.value))
  }

  function isInWatchlist(stockId) {
    const u = currentUser.value
    if (!u) return false
    return (userWatchlist.value[u] || []).includes(stockId)
  }

  return {
    userWallets,
    userPortfolios,
    userHistory,
    userWatchlist,
    userLoans,
    loadFinanceData,
    saveFinanceData,
    ensureProfile,
    getBalance,
    getLoanDebt,
    getPortfolioValue,
    logTransaction,
    depositMoney,
    takeLoan,
    repayLoan,
    buyStock,
    sellStock,
    toggleWatchlist,
    isInWatchlist
  }
}
