import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useToast } from './useToast'

const { showToast } = useToast()

const currentUser = ref(null)
const authLoading = ref(false)
const stockComments = ref({})

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function useAuth() {
  function loadUserData() {
    currentUser.value = localStorage.getItem('lcn_current_user') || null
    stockComments.value = JSON.parse(localStorage.getItem('lcn_comments')) || {}
  }

  async function loginUser(username, password) {
    if (!username || !password) { showToast('Kullanıcı adı ve şifre boş bırakılamaz.', 'error'); return false }
    authLoading.value = true

    const hash = await hashPassword(password)
    const { data, error } = await supabase
      .from('lcn_users')
      .select('username, password_hash')
      .eq('username', username)
      .single()

    authLoading.value = false

    if (error || !data) { showToast('Bu kullanıcı adına sahip bir hesap bulunamadı.', 'error'); return false }
    if (data.password_hash !== hash) { showToast('Hatalı şifre girdiniz!', 'error'); return false }

    currentUser.value = username
    localStorage.setItem('lcn_current_user', username)
    showToast('Giriş başarılı, hoş geldiniz!', 'success')
    return true
  }

  async function registerUser(username, password, confirmPassword) {
    if (username.length < 3 || password.length < 3) { showToast('Kullanıcı adı ve şifre en az 3 karakter olmalıdır.', 'error'); return false }
    if (password !== confirmPassword) { showToast('Girdiğiniz şifreler uyuşmuyor.', 'error'); return false }
    authLoading.value = true

    const { data: existing } = await supabase
      .from('lcn_users')
      .select('username')
      .eq('username', username)
      .single()

    if (existing) { authLoading.value = false; showToast('Bu kullanıcı adı zaten alınmış.', 'error'); return false }

    const hash = await hashPassword(password)
    const { error } = await supabase
      .from('lcn_users')
      .insert({ username, password_hash: hash })

    authLoading.value = false

    if (error) { showToast('Kayıt sırasında bir hata oluştu.', 'error'); return false }
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
    authLoading,
    stockComments,
    loadUserData,
    loginUser,
    registerUser,
    logoutUser,
    postComment,
    getComments
  }
}
