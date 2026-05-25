import { ref } from 'vue'
import { useToast } from './useToast.js'

const { showToast } = useToast()
const blogNews = ref([])

export function useNews() {
  function loadNews() {
    const saved = localStorage.getItem('lcn_news_data')
    if (saved) {
      blogNews.value = JSON.parse(saved)
    } else {
      blogNews.value = [{
        id: Date.now(),
        title: 'LCN Terminali Güncellendi v2.0',
        content: 'Yeni arayüzümüz, profesyonel grafik motorumuz, devre kesicilerimiz yayında.',
        date: new Date().toLocaleString()
      }]
      saveNews()
    }
  }

  function saveNews() {
    localStorage.setItem('lcn_news_data', JSON.stringify(blogNews.value))
  }

  function addNews(title, content) {
    if (!title.trim() || !content.trim()) { showToast('Boş bırakmayınız.', 'error'); return }
    blogNews.value.unshift({ id: Date.now(), title: title.trim(), content: content.trim(), date: new Date().toLocaleString() })
    saveNews()
    showToast('Duyuru yayınlandı!', 'success')
  }

  function deleteNews(id) {
    if (confirm('Silmek istediğinize emin misiniz?')) {
      blogNews.value = blogNews.value.filter(n => n.id !== id)
      saveNews()
    }
  }

  return { blogNews, loadNews, saveNews, addNews, deleteNews }
}
