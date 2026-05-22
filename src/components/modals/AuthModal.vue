<script setup>
import { ref } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { useFinance } from '../../composables/useFinance'

const emit = defineEmits(['close'])
const { loginUser, registerUser } = useAuth()
const { ensureProfile } = useFinance()

const activeTab = ref('login')
const loginUsername = ref('')
const loginPassword = ref('')
const registerUsername = ref('')
const registerPassword = ref('')
const registerPasswordConfirm = ref('')

function handleLogin() {
  const ok = loginUser(loginUsername.value.trim(), loginPassword.value.trim())
  if (ok) {
    ensureProfile()
    emit('close')
  }
}

function handleRegister() {
  const ok = registerUser(registerUsername.value.trim(), registerPassword.value.trim(), registerPasswordConfirm.value.trim())
  if (ok) {
    loginUsername.value = registerUsername.value
    loginPassword.value = ''
    registerUsername.value = ''
    registerPassword.value = ''
    registerPasswordConfirm.value = ''
    activeTab.value = 'login'
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="auth-modal-box">
      <button class="close-btn" @click="emit('close')">×</button>
      <div class="auth-tabs">
        <button class="auth-tab-btn" :class="{ active: activeTab === 'login' }" @click="activeTab = 'login'">GİRİŞ YAP</button>
        <button class="auth-tab-btn" :class="{ active: activeTab === 'register' }" @click="activeTab = 'register'">KAYIT OL</button>
      </div>

      <div v-if="activeTab === 'login'" class="auth-form">
        <h2>Yatırımcı Terminaline Giriş</h2>
        <div class="form-group">
          <label>Kullanıcı Adı</label>
          <input v-model="loginUsername" type="text" placeholder="Kullanıcı Adınız..." />
        </div>
        <div class="form-group">
          <label>Şifre</label>
          <input v-model="loginPassword" type="password" placeholder="••••••••" @keypress.enter="handleLogin" />
        </div>
        <button class="submit-btn" @click="handleLogin">GİRİŞ YAP</button>
      </div>

      <div v-if="activeTab === 'register'" class="auth-form">
        <h2>Yeni Yatırımcı Hesabı Oluştur</h2>
        <div class="form-group">
          <label>Kullanıcı Adı</label>
          <input v-model="registerUsername" type="text" placeholder="En az 3 karakter..." />
        </div>
        <div class="form-group">
          <label>Şifre</label>
          <input v-model="registerPassword" type="password" placeholder="En az 3 karakter..." />
        </div>
        <div class="form-group">
          <label>Şifre Tekrar</label>
          <input v-model="registerPasswordConfirm" type="password" placeholder="Şifrenizi doğrulayın..." @keypress.enter="handleRegister" />
        </div>
        <button class="submit-btn" @click="handleRegister">HESAP OLUŞTUR</button>
      </div>
    </div>
  </div>
</template>
