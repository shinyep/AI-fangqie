<template>
  <main class="page">
    <header class="topbar">
      <div>
        <h1 class="title">已保存小说</h1>
        <p class="subtitle">从AI扫榜保存的章节细纲，可导入为新作品</p>
      </div>
    </header>

    <section v-if="loading" class="loading-wrap">
      <van-loading size="24" color="#4f46e5" />
      <span>加载中...</span>
    </section>

    <section v-else-if="!jobs.length" class="empty-wrap">
      <van-icon name="notes-o" size="48" color="#ccc" />
      <p>暂无保存的细纲</p>
      <p class="hint">在 AI扫榜 → 章节细纲 中分析小说后会自动保存</p>
    </section>

    <section v-else class="section">
      <div class="job-list">
        <article
          v-for="job in jobs"
          :key="job.id"
          class="job-card"
          :class="{ expanded: expandedId === job.id }"
        >
          <div class="job-head" @click="toggleExpand(job)">
            <div class="job-info">
              <h3>{{ job.novel_title }}</h3>
              <p>
                <span>{{ job.chapter_count }}章细纲</span>
                <span v-if="job.source_url" class="source-tag">链接抓取</span>
                <span v-else class="source-tag paste-tag">文本分析</span>
              </p>
              <small>{{ job.created_at }}</small>
            </div>
            <div class="job-actions">
              <van-button size="small" type="primary" @click.stop="importToNewBook(job)">
                导入为新作品
              </van-button>
              <van-icon name="arrow-down" :class="{ rotated: expandedId === job.id }" />
              <van-icon name="delete-o" class="del-icon" @click.stop="handleDelete(job)" />
            </div>
          </div>

          <div v-if="expandedId === job.id && chapters[job.id]" class="job-chapters">
            <div
              v-for="ch in chapters[job.id]"
              :key="ch.id"
              class="mini-chapter"
            >
              <div class="mini-chapter-head">
                <span class="rank">#{{ ch.chapter_index }}</span>
                <strong>{{ ch.title }}</strong>
                <small v-if="ch.word_count">{{ ch.word_count }}字</small>
              </div>
              <p v-if="ch.brief" class="mini-brief">{{ ch.brief }}</p>
              <div v-if="ch.key_events && ch.key_events.length" class="mini-events">
                <span>关键事件：</span>
                {{ ch.key_events.join('；') }}
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>

    <van-overlay :show="showImport" @click="showImport = false">
      <div class="import-popup" @click.stop>
        <h3>导入为新作品</h3>
        <p class="import-novel-title">{{ importTarget?.novel_title }}</p>
        <van-field v-model="importTitle" label="书名" placeholder="输入作品名称" clearable />
        <van-field v-model="importDesc" label="简介" placeholder="一句话描述（可选）" clearable />
        <div class="field-row">
          <span class="field-label">风格</span>
          <select v-model="importStyle" class="popup-select">
            <option v-for="s in styleOptions" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <van-button type="primary" block :loading="importing" @click="doImport">确认导入</van-button>
        <van-button block @click="showImport = false">取消</van-button>
      </div>
    </van-overlay>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showSuccessToast, showFailToast, showConfirmDialog } from 'vant';
import { fetchOutlineJobs, fetchOutlineJob, deleteOutlineJob } from '../api/novelOutline.js';
import { createProject } from '../api/books.js';

const router = useRouter();

const jobs = ref([]);
const chapters = ref({});
const expandedId = ref(null);
const loading = ref(true);

const showImport = ref(false);
const importTarget = ref(null);
const importTitle = ref('');
const importDesc = ref('');
const importStyle = ref('玄幻');
const importing = ref(false);

const styleOptions = ['玄幻', '都市', '仙侠', '科幻', '历史', '悬疑', '言情', '游戏', '轻小说', '奇幻'];

async function loadJobs() {
  loading.value = true;
  try {
    jobs.value = await fetchOutlineJobs();
  } catch { /* ignore */ }
  finally { loading.value = false; }
}

async function toggleExpand(job) {
  if (expandedId.value === job.id) {
    expandedId.value = null;
    return;
  }
  expandedId.value = job.id;
  if (!chapters.value[job.id]) {
    try {
      const detail = await fetchOutlineJob(job.id);
      chapters.value[job.id] = detail.chapters || [];
    } catch {
      chapters.value[job.id] = [];
    }
  }
}

async function handleDelete(job) {
  try {
    await showConfirmDialog({ title: '删除确认', message: `确定删除「${job.novel_title}」的细纲吗？` });
  } catch {
    return;
  }
  try {
    await deleteOutlineJob(job.id);
    if (expandedId.value === job.id) expandedId.value = null;
    jobs.value = jobs.value.filter(j => j.id !== job.id);
    showSuccessToast('已删除');
  } catch (e) {
    showFailToast('删除失败');
  }
}

function importToNewBook(job) {
  importTarget.value = job;
  importTitle.value = job.novel_title || '';
  importDesc.value = '';
  importStyle.value = '玄幻';
  showImport.value = true;
}

async function doImport() {
  if (!importTitle.value.trim()) {
    showFailToast('请输入书名');
    return;
  }
  importing.value = true;
  try {
    await createProject({
      title: importTitle.value.trim(),
      description: importDesc.value.trim(),
      style: importStyle.value,
      outline_job_id: importTarget.value.id,
    });
    showImport.value = false;
    showSuccessToast('导入成功，前往写作页面查看');
    router.push('/writing');
  } catch (e) {
    showFailToast('导入失败: ' + (e.message || '未知错误'));
  } finally {
    importing.value = false;
  }
}

onMounted(loadJobs);
</script>

<style scoped>
.loading-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  padding: 48px 0;
  color: var(--muted);
  font-size: 14px;
}

.empty-wrap {
  text-align: center;
  padding: 48px 0;
  color: var(--muted);
  font-size: 14px;
}

.empty-wrap .hint {
  font-size: 12px;
  margin-top: 6px;
}

.job-list {
  display: grid;
  gap: 12px;
}

.job-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
}

.job-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  cursor: pointer;
}

.job-info h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.job-info p {
  margin: 4px 0 2px;
  font-size: 13px;
  color: var(--muted);
  display: flex;
  gap: 8px;
  align-items: center;
}

.source-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #eef2ff;
  color: #4f46e5;
}

.source-tag.paste-tag {
  background: #f0fdf4;
  color: #166534;
}

.job-info small {
  font-size: 11px;
  color: #999;
}

.job-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.job-actions .van-icon {
  font-size: 18px;
  color: #999;
  transition: transform 0.2s;
}

.job-actions .van-icon.rotated {
  transform: rotate(180deg);
}

.del-icon {
  color: #e74c3c !important;
  cursor: pointer;
}

.job-chapters {
  border-top: 1px solid var(--line);
  padding: 8px 12px 12px;
  max-height: 50vh;
  overflow-y: auto;
}

.mini-chapter {
  padding: 8px 0;
  border-bottom: 1px dashed #eee;
}

.mini-chapter:last-child {
  border-bottom: none;
}

.mini-chapter-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-chapter-head .rank {
  color: var(--accent);
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.mini-chapter-head strong {
  font-size: 14px;
  flex: 1;
}

.mini-chapter-head small {
  color: #999;
  font-size: 11px;
  flex-shrink: 0;
}

.mini-brief {
  margin: 4px 0 0 24px;
  font-size: 13px;
  color: var(--ink);
  line-height: 1.5;
}

.mini-events {
  margin: 4px 0 0 24px;
  font-size: 12px;
  color: var(--muted);
}

.mini-events span {
  font-weight: 600;
  color: #666;
}

.import-popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  width: 90vw;
  max-width: 380px;
  display: grid;
  gap: 12px;
}

.import-popup h3 {
  margin: 0;
  font-size: 18px;
}

.import-novel-title {
  font-size: 13px;
  color: var(--muted);
  margin: -6px 0 0;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-label {
  font-size: 14px;
  flex-shrink: 0;
}

.popup-select {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}
</style>
