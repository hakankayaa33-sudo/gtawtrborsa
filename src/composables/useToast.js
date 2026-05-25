import { ref } from 'vue'

const toasts = ref([])
let nextId = 0

export function useToast() {
  function showToast(msg, type = 'success') {
    const id = nextId++
    toasts.value.push({ id, msg, type })
    setTimeout(() => {
      const idx = toasts.value.findIndex(t => t.id === id)
      if (idx !== -1) toasts.value.splice(idx, 1)
    }, 3500)
  }
  return { toasts, showToast }
}
