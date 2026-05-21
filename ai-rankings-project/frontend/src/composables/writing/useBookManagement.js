import { computed, ref, watch } from 'vue';
import { createProject as apiCreateBook, updateProject as apiUpdateBook, deleteProject as apiDeleteBook } from '../../api/books.js';
import { fetchOutlineJobs } from '../../api/novelOutline.js';

export function useBookManagement(showToast, showSuccessToast, showFailToast) {
  const books = ref([]);
  const activeBook = ref(null);
  const bookKeyword = ref('');
  const showNewBook = ref(false);
  const showBookSettings = ref(false);
  const bookOutlineDraft = ref('');
  const bookStyleProfileDraft = ref('');
  const creating = ref(false);
  const newBookTitle = ref('');
  const newBookDesc = ref('');
  const newBookStyle = ref('玄幻');
  const newBookOutlineJobId = ref(0);
  const savedOutlineJobs = ref([]);
  const loadingOutlineJobs = ref(false);

  const filteredBooks = computed(() => {
    const keyword = bookKeyword.value.trim().toLowerCase();
    if (!keyword) return books.value;
    return books.value.filter((book) => `${book.title || ''}${book.description || ''}`.toLowerCase().includes(keyword));
  });

  function formatWords(n) {
    const value = Number(n) || 0;
    if (value >= 10000) return (value / 10000).toFixed(1) + '万';
    return String(value);
  }

  function formatRelativeTime(value) {
    if (!value) return '刚刚';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '刚刚';
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  }

  function loadBookSettings() {
    bookOutlineDraft.value = activeBook.value?.outline || '';
    bookStyleProfileDraft.value = activeBook.value?.style_profile || '';
  }

  async function loadOutlineJobsForCreate() {
    loadingOutlineJobs.value = true;
    try {
      savedOutlineJobs.value = await fetchOutlineJobs();
    } catch { /* ignore */ }
    finally { loadingOutlineJobs.value = false; }
  }

  async function createBook() {
    if (!newBookTitle.value.trim()) {
      showToast('请输入书名');
      return;
    }
    creating.value = true;
    try {
      const payload = {
        title: newBookTitle.value.trim(),
        description: newBookDesc.value.trim(),
        style: newBookStyle.value,
      };
      if (newBookOutlineJobId.value) {
        payload.outline_job_id = newBookOutlineJobId.value;
      }
      const book = await apiCreateBook(payload);
      books.value.unshift(book);
      newBookTitle.value = '';
      newBookDesc.value = '';
      newBookOutlineJobId.value = 0;
      showNewBook.value = false;
      showSuccessToast('创建成功');
    } catch (error) {
      showToast('创建失败：' + error.message);
    } finally {
      creating.value = false;
    }
  }

  async function deleteBook(book) {
    try {
      await apiDeleteBook(book.id);
      books.value = books.value.filter(b => b.id !== book.id);
      if (activeBook.value?.id === book.id) {
        activeBook.value = null;
      }
      showSuccessToast('已删除');
    } catch (error) {
      showFailToast('删除失败：' + (error.message || '未知错误'));
    }
  }

  async function saveBookSettings() {
    if (activeBook.value) {
      try {
        const updated = await apiUpdateBook(activeBook.value.id, {
          outline: bookOutlineDraft.value,
          style_profile: bookStyleProfileDraft.value,
        });
        activeBook.value = updated;
        showSuccessToast('作品设定已保存');
      } catch (e) {
        showFailToast('保存失败: ' + (e.message || '未知错误'));
      }
    }
    showBookSettings.value = false;
  }

  watch(showNewBook, (val) => {
    if (val) {
      newBookOutlineJobId.value = 0;
      loadOutlineJobsForCreate();
    }
  });

  return {
    books,
    activeBook,
    bookKeyword,
    showNewBook,
    showBookSettings,
    bookOutlineDraft,
    bookStyleProfileDraft,
    creating,
    newBookTitle,
    newBookDesc,
    newBookStyle,
    newBookOutlineJobId,
    savedOutlineJobs,
    loadingOutlineJobs,
    filteredBooks,
    formatWords,
    formatRelativeTime,
    loadBookSettings,
    loadOutlineJobsForCreate,
    createBook,
    deleteBook,
    saveBookSettings,
  };
}
