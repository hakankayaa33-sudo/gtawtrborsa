import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useToast } from './useToast'

const { showToast } = useToast()

const currentUser = ref(null)   // kullanıcı adı (username)
const authLoading = ref(false)
const stockComments = ref({})

// username -> supabase email dönüşümü (kullanıcı email bilmez)
function toEmail(username) {
  return `${username.toLowerCase()}@lcnterminal.app`
}

export function useAuth() {
  async function loadUserData() {
    stockComments.value = JSON.parse(localStorage.getItem('lcn_comments')) || {}

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      currentUser.value = session.user.user_metadata?.username || session.user.email
    }

    // Oturum değişikliklerini dinle (sekme yenileme, token yenileme vb.)
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        currentUser.value = session.user.user_metadata?.username || session.user.email
      } else {
        currentUser.value = null
      }
    })
  }

  async function loginUser(username, password) {
    if (!username || !password) { showToast('Kullanıcı adı ve şifre boş bırakılamaz.', 'error'); return false }
    authLoading.value = true
    const { error } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password
    })
    authLoading.value = false
    if (error) {
      showToast('Hatalı kullanıcı adı veya şifre.', 'error')
      return false
    }
    currentUser.value = username
    showToast('Giriş başarılı, hoş geldiniz!', 'success')
    return true
  }

  async function registerUser(username, password, confirmPassword) {
    if (username.length < 3 || password.length < 3) { showToast('Kullanıcı adı ve şifre en az 3 karakter olmalıdır.', 'error'); return false }
    if (password !== confirmPassword) { showToast('Girdiğiniz şifreler uyuşmuyor.', 'error'); return false }
    authLoading.value = true
    const { error } = await supabase.auth.signUp({
      email: toEmail(username),
      password,
      options: { data: { username } }
    })
    authLoading.value = false
    if (error) {
      if (error.message.includes('already registered')) {
        showToast('Bu kullanıcı adı zaten alınmış.', 'error')
      } else {
        showToast(error.message, 'error')
      }
      return false
    }
    showToast('Hesabınız başarıyla oluşturuldu. Giriş yapabilirsiniz.', 'success')
    return true
  }

  async function logoutUser() {
    await supabase.auth.signOut()
    currentUser.value = null
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
