import { ref } from 'vue'

const isLight = ref(false)

export function useTheme() {
  function loadTheme() {
    isLight.value = localStorage.getItem('lcn_theme') === 'light'
    document.body.classList.toggle('light-theme', isLight.value)
  }

  function toggleTheme() {
    isLight.value = !isLight.value
    localStorage.setItem('lcn_theme', isLight.value ? 'light' : 'dark')
    document.body.classList.toggle('light-theme', isLight.value)
  }

  return { isLight, loadTheme, toggleTheme }
}
