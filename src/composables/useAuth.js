import { ref } from 'vue'
import { useToast } from './useToast'

const { showToast } = useToast()

const currentUser = ref(null)
const allUsers = ref({})
const stockComments = ref({})

export function useAuth() {
  function loadUserData() {
    currentUser.value = localStorage.getItem('lcn_current_user') || null
    allUsers.value = JSON.parse(localStorage.getItem('lcn_users')) || {}
    stockComments.value = JSON.parse(localStorage.getItem('lcn_comments')) || {}
  }

  function loginUser(username, password) {
    if (!username || !password) { showToast('Kullanıcı adı ve şifre boş bırakılamaz.', 'error'); return false }
    if (!allUsers.value[username]) { showToast('Bu kullanıcı adına sahip bir hesap bulunamadı.', 'error'); return false }
    if (allUsers.value[username] !== password) { showToast('Hatalı şifre girdiniz!', 'error'); return false }
    currentUser.value = username
    localStorage.setItem('lcn_current_user', username)
    showToast('Giriş başarılı, hoş geldiniz!', 'success')
    return true
  }

  function registerUser(username, password, confirmPassword) {
    if (username.length < 3 || password.length < 3) { showToast('Kullanıcı adı ve şifre en az 3 karakter olmalıdır.', 'error'); return false }
    if (password !== confirmPassword) { showToast('Girdiğiniz şifreler uyuşmuyor.', 'error'); return false }
    if (allUsers.value[username]) { showToast('Bu kullanıcı adı zaten alınmış.', 'error'); return false }
    allUsers.value[username] = password
    localStorage.setItem('lcn_users', JSON.stringify(allUsers.value))
    showToast('Hesabınız başarıyla oluşturuldu. Giriş yapabilirsiniz.', 'success')
    return true
  }

  function logoutUser() {
    currentUser.value = null
    localStorage.removeItem('lcn_current_user')
    showToast('Oturum kapatıldı.', 'info')
  }

  function postComment(stockId, text) {
    if (!currentUser.value || !stockId || !text.trim()) return
    if (!stockComments.value[stockId]) stockComments.value[stockId] = []
    const now = new Date()
    const dateStr = `${now.toLocaleDateString()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    stockComments.value[stockId].push({ user: currentUser.value, text: text.trim(), date: dateStr })
    localStorage.setItem('lcn_comments', JSON.stringify(stockComments.value))
  }

  function getComments(stockId) {
    return stockComments.value[stockId] || []
  }

  return {
    currentUser,
    allUsers,
    stockComments,
    loadUserData,
    loginUser,
    registerUser,
    logoutUser,
    postComment,
    getComments
  }
}
