<template>
  <main class="page">
    <!-- 内置提示词区域 -->
    <section v-if="!activeTool && !output" class="prompts-section">
      <h2 class="section-title">
        内置提示词
        <router-link to="/prompts" class="more-link">更多 →</router-link>
      </h2>
      <div class="category-strip">
        <button class="category-cell" :class="{ active: activePromptCategory === '' }" @click="activePromptCategory = ''">全部</button>
        <button v-for="cat in promptCategories" :key="cat" class="category-cell" :class="{ active: activePromptCategory === cat }" @click="activePromptCategory = cat">{{ cat }}</button>
      </div>
      <div class="prompt-cards">
        <div v-for="p in filteredPrompts" :key="p.id" class="prompt-card-full">
          <div class="prompt-card-header" @click="usePromptForTool(p)">
            <strong>{{ p.title }}</strong>
            <small>{{ p.usage_count || 0 }}次使用 | {{ p.category }}</small>
          </div>
          <div class="prompt-content-box">
            <pre>{{ p.content }}</pre>
          </div>
          <button class="prompt-use-btn" @click="usePromptForTool(p)">使用此提示词</button>
        </div>
        <div v-if="!filteredPrompts.length" class="empty">暂无提示词</div>
      </div>
    </section>

    <header class="topbar">
      <div>
        <h1 class="title">创意工具箱</h1>
        <p class="subtitle">17大生成器 + 内置提示词，高效创作</p>
      </div>
    </header>

    <!-- 工具选择 -->
    <section v-if="!activeTool" class="tool-grid">
      <button v-for="tool in tools" :key="tool.key" class="tool-card" @click="selectTool(tool)">
        <van-icon :name="toolIcon(tool.key)" size="28" />
        <div>
          <strong>{{ tool.name }}</strong>
          <span>{{ tool.description }}</span>
        </div>
      </button>
    </section>

    <!-- 工具参数表单 -->
    <template v-if="activeTool">
      <section class="form-panel">
        <div class="tool-breadcrumb">
          <van-button icon="arrow-left" size="small" @click="activeTool = null; output = null">返回</van-button>
          <strong>{{ activeTool.name }}</strong>
        </div>

        <van-field
          v-for="inp in activeTool.inputs"
          :key="inp.key"
          v-model="params[inp.key]"
          :label="inp.label"
          :placeholder="inp.placeholder"
          :type="inp.key === 'theme' ? 'textarea' : 'text'"
          :rows="inp.key === 'theme' ? 3 : 1"
          clearable
        />

        <div v-if="params.promptContent" class="selected-prompt">
          <strong>{{ params.promptTitle || '已选提示词' }}</strong>
          <p>{{ params.promptContent }}</p>
          <van-button size="mini" plain @click="params.promptContent = ''; params.promptTitle = ''">移除</van-button>
        </div>

        <van-button type="primary" block :loading="loading" @click="doGenerate">生成</van-button>
      </section>
    </template>

    <!-- 输出 -->
    <section v-if="output" class="output-section">
      <div class="output-header">
        <h2 class="section-title">生成结果</h2>
        <van-button size="mini" icon="replay" @click="doGenerate">重试</van-button>
        <van-button size="mini" icon="description-o" @click="copyOutput">复制</van-button>
      </div>

      <!-- JSON 类型结果 -->
      <template v-if="output.type === 'json'">
        <div v-for="(item, i) in output.data" :key="i" class="result-card">
          <template v-if="activeTool?.key === 'book_title'">
            <strong>{{ item.title }}</strong>
            <p>{{ item.reason }}</p>
          </template>
          <template v-else-if="activeTool?.key === 'golden_finger'">
            <strong>{{ item.name }}</strong>
            <p>触发：{{ item.mechanism }}</p>
            <p>能力：{{ item.ability }}</p>
            <p>成长：{{ item.growth }}</p>
            <p class="highlight">亮点：{{ item.highlight }}</p>
          </template>
          <template v-else-if="activeTool?.key === 'name_generator'">
            <div class="name-item">
              <strong>{{ item.name }}</strong>
              <van-tag size="mini" plain>{{ item.gender }}</van-tag>
              <van-tag size="mini" type="primary" plain>{{ item.style }}</van-tag>
              <span class="meaning">{{ item.meaning }}</span>
            </div>
          </template>
          <template v-else-if="activeTool?.key === 'character_design'">
            <strong>{{ item.name }} · {{ item.gender }} · {{ item.age }}</strong>
            <p>外貌：{{ item.appearance }}</p>
            <p>性格：{{ item.personality }}</p>
            <p>背景：{{ item.background }}</p>
            <p>能力：{{ (item.abilities || []).join('、') }}</p>
            <p>定位：{{ item.role }}</p>
            <p>弧线：{{ item.arc }}</p>
          </template>
          <template v-else-if="activeTool?.key === 'detailed_outline'">
            <div class="outline-chapter">
              <strong>第{{ item.chapter }}章：{{ item.title }}</strong>
              <p>事件：{{ (item.events || []).join('；') }}</p>
              <p>角色：{{ (item.characters || []).join('、') }}</p>
              <p>冲突：{{ item.conflict }}</p>
              <p class="hook-line">钩子：{{ item.hook }}</p>
            </div>
          </template>
        </div>
      </template>

      <!-- 文本类型结果 -->
      <template v-else>
        <div class="text-output">{{ output.data }}</div>
      </template>
    </section>

    <section v-if="!output && !loading && !activeTool" class="section empty-state">
      <van-icon name="bulb-o" size="48" color="#ccc" />
      <p>选择一个生成器，输入灵感关键词，AI为你创作</p>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { showToast, showSuccessToast } from 'vant';
import { fetchCategories, fetchPrompts } from '../api/prompts.js';
import { fetchToolList, generateTool } from '../api/creativeTools.js';

const promptCategories = ref([]);
const activePromptCategory = ref("");
const builtinPrompts = ref([]);

const tools = ref([]);
const activeTool = ref(null);
const params = reactive({ theme: '', style: '', count: '', chapters: '', promptContent: '', promptTitle: '' });
const output = ref(null);
const filteredPrompts = computed(() => {
  const all = builtinPrompts.value;
  if (activePromptCategory.value === '') return all.slice(0, 10);
  return all.filter(p => p.category === activePromptCategory.value).slice(0, 10);
});

const loading = ref(false);

function toolIcon(key) {
  const map = {
    book_title: 'bookmark-o', synopsis: 'notes-o', outline: 'orders-o',
    detailed_outline: 'description-o', opening: 'fire-o', golden_finger: 'gem-o',
    name_generator: 'user-o', character_design: 'manager-o',
    world: 'globe-o', imagination: 'bulb-o', title_rewrite: 'edit-o',
    summary_rewrite: 'description-o', imagination_rewrite: 'cluster-o',
    book_analysis: 'chart-trending-o', chapter_title: 'flag-o',
    cover_prompt: 'photo-o', volume_summary: 'books-o',
  };
  return map[key] || 'star-o';
}

function selectTool(tool) {
  activeTool.value = tool;
  params.theme = '';
  params.style = '';
  params.count = '';
  params.chapters = '';
  params.promptContent = '';
  params.promptTitle = '';
  output.value = null;
}

function usePromptForTool(p) {
  // Find matching tool by category
  const categoryToolMap = {
    '创意': 'book_title', '书名': 'book_title',
    '正文': 'opening', '开篇': 'opening',
    '人设': 'character_design', '角色': 'character_design',
    '设定': 'world', '世界观': 'world',
    '剧情': 'outline', '大纲': 'outline',
    '润色': 'synopsis', '简介': 'synopsis',
  };
  const toolKey = categoryToolMap[p.category] || 'book_title';
  const tool = tools.value.find(t => t.key === toolKey);
  if (tool) {
    selectTool(tool);
    params.theme = '';
    params.promptContent = p.content;
    params.promptTitle = p.title;
    showToast('已加载提示词到 ' + tool.name);
  } else {
    params.promptContent = p.content;
    params.promptTitle = p.title;
    showToast('已加载提示词');
  }
}

async function doGenerate() {
  if (!params.theme.trim() && !params.promptContent.trim()) {
    showToast('请输入主题/设定或选择内置提示词');
    return;
  }
  loading.value = true;
  output.value = null;
  try {
    const payload = {
      tool_key: activeTool.value.key,
      theme: params.theme.trim() || '请根据选用提示词生成内容',
    };
    if (params.style.trim()) payload.style = params.style.trim();
    if (params.count.trim()) payload.count = parseInt(params.count) || undefined;
    if (params.chapters.trim()) payload.chapters = parseInt(params.chapters) || undefined;
    if (params.promptContent.trim()) payload.prompt_content = params.promptContent.trim();
    if (params.promptTitle.trim()) payload.prompt_title = params.promptTitle.trim();
    output.value = await generateTool(payload);
  } catch (e) {
    showToast('生成失败: ' + (e.message || '未知错误'));
  } finally {
    loading.value = false;
  }
}

async function copyOutput() {
  const text = typeof output.value === 'string' ? output.value : JSON.stringify(output.value, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    showSuccessToast('已复制');
  } catch { showToast('复制失败'); }
}

onMounted(async () => {
  try {
    // Load categories and prompts
    const [cats, promptList] = await Promise.all([
      fetchCategories(),
      fetchPrompts({ limit: 100 })
    ]);
    promptCategories.value = cats;
    builtinPrompts.value = promptList;
  } catch { /* prompts加载失败不影响工具加载 */ }
  try {
    tools.value = await fetchToolList();
  } catch {
    tools.value = [
      { key: 'book_title', name: '书名生成器', description: '生成吸引人的书名' },
      { key: 'synopsis', name: '简介生成器', description: '生成小说简介' },
      { key: 'outline', name: '大纲生成器', description: '生成故事大纲' },
      { key: 'detailed_outline', name: '细纲生成器', description: '生成分章细纲' },
      { key: 'opening', name: '黄金开篇', description: '生成第一章开篇' },
      { key: 'golden_finger', name: '金手指生成器', description: '生成金手指设定' },
      { key: 'name_generator', name: '名字生成器', description: '生成角色名字' },
      { key: 'character_design', name: '人设生成器', description: '生成角色人设卡' },
      { key: 'world', name: '世界观生成器', description: '生成完整世界观' },
      { key: 'imagination', name: '脑洞生成器', description: '生成创意脑洞' },
      { key: 'title_rewrite', name: '标题仿写', description: '模仿风格生成书名' },
      { key: 'summary_rewrite', name: '简介仿写', description: '模仿风格生成简介' },
      { key: 'imagination_rewrite', name: '脑洞仿写', description: '模仿创意生成脑洞' },
      { key: 'book_analysis', name: '书籍分析', description: 'AI全面分析小说' },
      { key: 'chapter_title', name: '章节起名', description: '生成吸睛章节标题' },
      { key: 'cover_prompt', name: '封面提示词', description: '生成AI绘图提示词' },
      { key: 'volume_summary', name: '分卷概要', description: '生成分卷结构化概要' },
    ];
  }
});
</script>

<style scoped>
.tool-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.tool-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 10px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
}

.tool-card:hover, .tool-card:active {
  border-color: var(--accent);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.tool-card strong { font-size: 14px; }
.tool-card span { font-size: 12px; color: var(--muted); line-height: 1.4; }

.form-panel {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  display: grid;
  gap: 12px;
  overflow-x: hidden;
}

.tool-breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
}

.selected-prompt {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #f8fafc;
}

.selected-prompt strong {
  font-size: 14px;
}

.selected-prompt p {
  max-height: 120px;
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
  overflow: auto;
  white-space: pre-wrap;
}

.output-section { margin-top: 16px; }
.output-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.result-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  line-height: 1.6;
  font-size: 14px;
  word-break: break-word;
  overflow-wrap: break-word;
}

.result-card strong { display: block; font-size: 15px; margin-bottom: 4px; }
.result-card p { margin: 2px 0; color: var(--ink); }
.result-card .highlight { color: var(--accent); font-weight: 600; }

.name-item {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
}
.name-item:last-child { border-bottom: none; }
.meaning { font-size: 12px; color: var(--muted); }

.outline-chapter {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}
.outline-chapter:last-child { border-bottom: none; }
.hook-line { color: var(--accent); font-weight: 500; }

.text-output {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 14px;
  line-height: 1.8;
  font-size: 15px;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  color: var(--ink);
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: var(--muted);
  font-size: 14px;
}

/* ---- 内置提示词 ---- */
.prompts-section {
  margin-bottom: 20px;
}

.prompts-section .category-strip {
  margin-bottom: 10px;
  flex-wrap: nowrap;
}

.prompt-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0 8px;
}

.prompt-card-full {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.15s;
}

.prompt-card-full:hover {
  border-color: var(--accent);
  box-shadow: 0 2px 8px rgba(99,102,241,0.12);
}

.prompt-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  background: #f8fafc;
  border-bottom: 1px solid var(--line);
}

.prompt-card-header strong {
  font-size: 14px;
  color: var(--ink);
  line-height: 1.3;
}

.prompt-card-header small {
  font-size: 11px;
  color: #9ca3af;
  white-space: nowrap;
}

.prompt-content-box {
  padding: 10px 12px;
  max-height: 200px;
  overflow-y: auto;
  background: #fafafa;
}

.prompt-content-box pre {
  margin: 0;
  font-size: 12px;
  color: var(--ink);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
}

.prompt-use-btn {
  padding: 8px 12px;
  border: none;
  border-top: 1px solid var(--line);
  background: #fff;
  color: var(--accent);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.prompt-use-btn:hover {
  background: #f0f4ff;
}

.more-link {
  font-size: 13px;
  font-weight: 400;
  color: var(--accent);
  text-decoration: none;
}

.more-link:hover { text-decoration: underline; }
</style>
