<template>
  <main class="page">
    <header class="topbar">
      <div>
        <h1 class="title">创意工具箱</h1>
        <p class="subtitle">14大生成器，高效创作</p>
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

        <DynamicFormInput
          v-for="inp in visibleInputs"
          :key="inp.key"
          :input-def="inp"
          v-model="params[inp.key]"
        />

        <div class="form-divider"></div>

        <!-- 模型选择 -->
        <ModelSelector
          v-model:provider="selectedProvider"
          v-model:model="selectedModel"
        />

        <van-field
          v-model="params.extraInstruction"
          label="附加指令"
          placeholder="额外的AI指令（可选）"
          type="textarea"
          rows="2"
          clearable
        />

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

      <!-- 大纲 - 专用组件 -->
      <template v-if="activeTool?.key === 'outline' && output.type === 'json'">
        <OutlineWorkspace
          v-if="isStructuredOutline"
          :outline-data="output.data"
          @select-chapter="onOutlineChapterSelect"
        >
          <template #editor="{ chapter, allChapters, activeIndex }">
            <DetailedOutlineEditor
              :data="chapter"
              :raw="output.raw"
              @refine="openWorkbench('refine', $event)"
              @split="openWorkbench('split', $event)"
            />
          </template>
        </OutlineWorkspace>
        <OutlineViewer v-else :data="output.data" />
      </template>

      <!-- 细纲 - 专用组件 -->
      <template v-else-if="activeTool?.key === 'detailed_outline' && output.type === 'json'">
        <OutlineWorkspace
          v-if="isStructuredOutline"
          :outline-data="output.data"
          @select-chapter="onOutlineChapterSelect"
        >
          <template #editor="{ chapter, allChapters, activeIndex }">
            <DetailedOutlineEditor
              :data="chapter"
              :raw="output.raw"
              @refine="openWorkbench('refine', $event)"
              @split="openWorkbench('split', $event)"
            />
          </template>
        </OutlineWorkspace>
        <DetailedOutlineEditor
          v-else
          :data="output.data"
          :raw="output.raw"
          @refine="openWorkbench('refine', $event)"
          @split="openWorkbench('split', $event)"
        />
      </template>

      <!-- 其他JSON类型结果 -->
      <template v-else-if="output.type === 'json'">
        <!-- 书名/标题仿写 -->
        <template v-if="activeTool?.key === 'book_title'">
          <div v-for="(item, i) in output.data" :key="i" class="result-card card-title">
            <div class="card-title-head">
              <strong>{{ item.title }}</strong>
              <div class="card-tags">
                <van-tag v-for="t in item.style_tags" :key="t" size="mini" plain type="warning">{{ t }}</van-tag>
                <van-tag v-for="k in item.keywords" :key="k" size="mini" plain>{{ k }}</van-tag>
              </div>
            </div>
            <p class="card-reason">{{ item.reason }}</p>
            <p v-if="item.market_appeal" class="card-meta">市场：{{ item.market_appeal }}</p>
            <template v-if="item.analysis">
              <p class="card-meta">风格分析：{{ item.analysis }}</p>
              <p class="card-meta">仿写手法：{{ item.technique }} · 结构相似度：{{ item.structure_similarity }}</p>
            </template>
          </div>
        </template>

        <!-- 简介/简介仿写 -->
        <template v-else-if="activeTool?.key === 'synopsis'">
          <div v-for="(item, i) in output.data" :key="i" class="result-card">
            <div class="card-head">
              <strong>{{ item.version_type }}</strong>
              <span class="card-strategy">{{ item.strategy || item.approach }}</span>
            </div>
            <div class="text-block">{{ item.content }}</div>
          </div>
        </template>

        <!-- 金手指 -->
        <template v-else-if="activeTool?.key === 'golden_finger'">
          <div v-for="(item, i) in output.data" :key="i" class="result-card">
            <strong>{{ item.name }}</strong>
            <p>触发：{{ item.mechanism }}</p>
            <p>能力：{{ item.ability }}</p>
            <p>成长：{{ item.growth }}</p>
            <p class="highlight">亮点：{{ item.highlight }}</p>
            <div v-if="item.limitations?.length" class="card-tags">
              <span class="tag-label">限制：</span>
              <van-tag v-for="l in item.limitations" :key="l" size="mini" type="danger" plain>{{ l }}</van-tag>
            </div>
            <div v-if="item.upgrade_path?.length" class="upgrade-section">
              <span class="tag-label">升级路径：</span>
              <van-steps :steps="item.upgrade_path.map(u => ({ text: `${u.level}: ${u.power}` }))" direction="vertical" />
            </div>
            <p v-if="item.weakness"><span class="tag-label">弱点：</span>{{ item.weakness }}</p>
            <p v-if="item.hidden_abilities?.length"><span class="tag-label">隐藏能力：</span>{{ item.hidden_abilities.join('、') }}</p>
          </div>
        </template>

        <!-- 名字生成器 -->
        <template v-else-if="activeTool?.key === 'name_generator'">
          <div v-for="(item, i) in output.data" :key="i" class="name-item">
            <strong>{{ item.name }}</strong>
            <van-tag size="mini" plain>{{ item.gender }}</van-tag>
            <van-tag size="mini" type="primary" plain>{{ item.style }}</van-tag>
            <span class="meaning">{{ item.meaning }}</span>
            <div class="name-extras">
              <span v-if="item.pronunciation" class="text-muted">{{ item.pronunciation }}</span>
              <span v-if="item.character_hint" class="text-muted">· {{ item.character_hint }}</span>
            </div>
          </div>
        </template>

        <!-- 人设 -->
        <template v-else-if="activeTool?.key === 'character_design'">
          <div v-for="(item, i) in output.data" :key="i" class="result-card card-character">
            <strong>{{ item.name }} · {{ item.gender }} · {{ item.age }}</strong>
            <van-collapse>
              <van-collapse-item title="基础信息">
                <p>外貌：{{ item.appearance }}</p>
                <p>说话风格：{{ item.speech_style }}</p>
                <p>习惯动作：{{ (item.quirks || []).join('、') }}</p>
              </van-collapse-item>
              <van-collapse-item title="性格与内心">
                <p>性格：{{ item.personality }}</p>
                <p>核心动机：{{ item.motivation }}</p>
                <p>内心冲突：{{ item.inner_conflict }}</p>
                <p>致命缺陷：{{ item.fatal_flaw }}</p>
              </van-collapse-item>
              <van-collapse-item title="背景与能力">
                <p>背景：{{ item.background }}</p>
                <p>能力：{{ (item.abilities || []).join('、') }}</p>
              </van-collapse-item>
              <van-collapse-item v-if="item.relationships?.length" title="人际关系">
                <p v-for="r in item.relationships" :key="r.target">{{ r.target }}（{{ r.type }}）：{{ r.description }}</p>
              </van-collapse-item>
              <van-collapse-item title="剧情定位">
                <p>定位：{{ item.role }}</p>
                <p>弧线：{{ item.arc }}</p>
              </van-collapse-item>
            </van-collapse>
          </div>
        </template>

        <!-- 世界观 -->
        <template v-else-if="activeTool?.key === 'world'">
          <div class="result-card">
            <van-tabs>
              <van-tab title="概览">
                <p><strong>时代：</strong>{{ output.data.basic_info?.era }}</p>
                <p><strong>主题：</strong>{{ output.data.basic_info?.theme }}</p>
                <p><strong>氛围：</strong>{{ output.data.basic_info?.tone }}</p>
              </van-tab>
              <van-tab v-if="output.data.power_system" title="力量体系">
                <p><strong>{{ output.data.power_system.name }}</strong></p>
                <p>等级：{{ (output.data.power_system.levels || []).join(' → ') }}</p>
                <p>能量来源：{{ output.data.power_system.energy_source }}</p>
                <p>代价：{{ output.data.power_system.cost }}</p>
                <p>天花板：{{ output.data.power_system.ceiling }}</p>
              </van-tab>
              <van-tab v-if="output.data.factions?.length" title="势力">
                <div v-for="f in output.data.factions" :key="f.name" class="faction-card">
                  <strong>{{ f.name }}</strong>
                  <p>目标：{{ f.goal }} | 地盘：{{ f.territory }}</p>
                  <p>{{ f.power }}</p>
                </div>
              </van-tab>
              <van-tab v-if="output.data.unique_rules?.length" title="独特法则">
                <p v-for="r in output.data.unique_rules" :key="r.rule"><strong>{{ r.rule }}</strong>：{{ r.impact }}</p>
              </van-tab>
              <van-tab v-if="output.data.hidden_secrets?.length" title="隐藏秘密">
                <p v-for="s in output.data.hidden_secrets" :key="s.secret">{{ s.secret }}（揭露时机：{{ s.reveal_stage }}）</p>
              </van-tab>
            </van-tabs>
          </div>
        </template>

        <!-- 脑洞/脑洞仿写 -->
        <template v-else-if="activeTool?.key === 'imagination'">
          <div v-for="(item, i) in output.data" :key="i" class="result-card">
            <strong>{{ item.name }}</strong>
            <p class="highlight hook-line-big">{{ item.hook || item.concept }}</p>
            <p>{{ item.setting }}</p>
            <p class="highlight">亮点：{{ item.highlight }}</p>
            <p v-if="item.conflict_engine"><span class="tag-label">冲突引擎：</span>{{ item.conflict_engine }}</p>
            <p v-if="item.twist_potential"><span class="tag-label">反转潜力：</span>{{ item.twist_potential }}</p>
            <p v-if="item.audience">目标读者：{{ item.audience }}</p>
            <div v-if="item.market_fit" class="market-fit">
              <p>优势：{{ item.market_fit.advantage }}</p>
              <p>风险：{{ item.market_fit.risk }}</p>
            </div>
            <p v-if="item.original_pattern"><span class="tag-label">创意模式：</span>{{ item.original_pattern }}</p>
            <p v-if="item.differentiation"><span class="tag-label">差异化：</span>{{ item.differentiation }}</p>
          </div>
        </template>

        <!-- 书籍分析 -->
        <template v-else-if="activeTool?.key === 'book_analysis'">
          <div class="result-card">
            <div class="rating-row">
              <span>综合评分</span>
              <strong class="rating-num">{{ output.data.rating }}/10</strong>
            </div>
            <p><strong>核心卖点：</strong>{{ output.data.selling_points }}</p>
            <div class="card-tags">
              <span class="tag-label">优势：</span>
              <van-tag v-for="s in output.data.strengths" :key="s" size="mini" type="success" plain>{{ s }}</van-tag>
            </div>
            <div class="card-tags">
              <span class="tag-label">不足：</span>
              <van-tag v-for="w in output.data.weaknesses" :key="w" size="mini" type="danger" plain>{{ w }}</van-tag>
            </div>
            <p>目标读者：{{ output.data.target_audience }}</p>
            <p>节奏：{{ output.data.pacing }}</p>
            <p>人物：{{ output.data.character_analysis }}</p>
            <p>世界观：{{ output.data.world_building }}</p>
            <p v-if="output.data.market_position">市场定位：{{ output.data.market_position }}</p>
            <p>商业建议：{{ output.data.commercial_advice }}</p>
            <p v-if="output.data.risk_rating">风险评级：{{ output.data.risk_rating }}/5</p>
            <div v-if="output.data.comparison_books?.length">
              <span class="tag-label">同类对比：</span>
              <p v-for="c in output.data.comparison_books" :key="c.title">{{ c.title }} — {{ c.similarity }}（优势：{{ c.advantage }}）</p>
            </div>
          </div>
        </template>

        <!-- 章节起名 -->
        <template v-else-if="activeTool?.key === 'chapter_title'">
          <div v-for="(item, i) in output.data" :key="i" class="result-card">
            <div class="card-head">
              <strong>{{ item.title }}</strong>
              <van-tag size="mini" type="primary" plain>{{ item.emotional_tone }}</van-tag>
              <van-tag size="mini" plain>{{ item.style }}</van-tag>
            </div>
            <p>{{ item.reason }}</p>
            <div v-if="item.keywords?.length" class="card-tags">
              <van-tag v-for="k in item.keywords" :key="k" size="mini" plain>{{ k }}</van-tag>
            </div>
            <p v-if="item.alternatives?.length"><span class="tag-label">备选：</span>{{ item.alternatives.join(' · ') }}</p>
          </div>
        </template>

        <!-- 封面提示词 -->
        <template v-else-if="activeTool?.key === 'cover_prompt'">
          <div class="result-card">
            <van-tabs>
              <van-tab title="中文">
                <div class="text-block">{{ output.data.cn_prompt }}</div>
              </van-tab>
              <van-tab title="English">
                <div class="text-block mono">{{ output.data.en_prompt }}</div>
              </van-tab>
            </van-tabs>
            <div class="card-tags">
              <van-tag v-for="k in output.data.style_keywords" :key="k" size="mini" type="warning" plain>{{ k }}</van-tag>
            </div>
            <p>色彩：{{ output.data.color_scheme }}</p>
            <p>构图：{{ output.data.composition }}</p>
            <p v-if="output.data.tool_recommendations">MJ: {{ output.data.tool_recommendations.midjourney }} | SD: {{ output.data.tool_recommendations.sd }}</p>
          </div>
        </template>

        <!-- 分卷概要 -->
        <template v-else-if="activeTool?.key === 'volume_summary'">
          <div v-for="(item, i) in output.data" :key="i" class="result-card card-volume">
            <strong>第{{ item.volume }}卷：{{ item.title }}</strong>
            <p class="highlight">{{ item.main_promise }}</p>
            <p>冲突：{{ item.conflict }}</p>
            <p>升级模式：{{ item.escalation_mode }}</p>
            <p>事件：{{ (item.events || []).join(' → ') }}</p>
            <p>角色成长：{{ item.character_growth }}</p>
            <p>卷末高潮：{{ item.climax }}</p>
            <p class="hook-line">钩子：{{ item.hook }}</p>
            <p v-if="item.reset_point">重置点：{{ item.reset_point }}</p>
            <div v-if="item.open_payoffs?.length" class="card-tags">
              <span class="tag-label">新伏笔：</span>
              <van-tag v-for="p in item.open_payoffs" :key="p" size="mini" plain type="warning">{{ p }}</van-tag>
            </div>
          </div>
        </template>

        <!-- 黄金开篇 -->
        <template v-else-if="activeTool?.key === 'opening'">
          <div class="result-card">
            <div class="text-block">{{ output.data.content }}</div>
            <van-collapse v-if="output.data.analysis">
              <van-collapse-item title="开篇分析">
                <p><strong>钩子类型：</strong>{{ output.data.analysis.hook_type }}</p>
                <p>{{ output.data.analysis.first_paragraph_hook }}</p>
                <div class="structure-list">
                  <span class="tag-label">结构：</span>
                  <span v-for="(s, si) in output.data.analysis.structure" :key="si" class="structure-chip">{{ s.section }}({{ s.word_count_estimate }}字) — {{ s.purpose }}</span>
                </div>
                <p v-if="output.data.analysis.character_intro?.length">
                  <span class="tag-label">角色出场：</span>
                  <span v-for="c in output.data.analysis.character_intro" :key="c.name">{{ c.name }}({{ c.method }}) </span>
                </p>
              </van-collapse-item>
            </van-collapse>
          </div>
        </template>

        <!-- 默认JSON渲染 -->
        <template v-else>
          <div v-for="(item, i) in (Array.isArray(output.data) ? output.data : [output.data])" :key="i" class="result-card">
            <pre class="json-dump">{{ JSON.stringify(item, null, 2) }}</pre>
          </div>
        </template>
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

    <!-- AI工作台弹窗 -->
    <AIWorkbenchDialog
      v-model:visible="workbenchVisible"
      v-model:mode="workbenchMode"
      :target="workbenchTarget"
      :tool-key="activeTool?.key"
      @confirm="handleWorkbenchConfirm"
    />
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { showToast, showSuccessToast } from 'vant';
import { fetchToolList, generateTool, refineOutline, splitOutline } from '../api/creativeTools.js';
import DynamicFormInput from '../components/DynamicFormInput.vue';
import OutlineViewer from '../components/OutlineViewer.vue';
import DetailedOutlineEditor from '../components/DetailedOutlineEditor.vue';
import OutlineWorkspace from '../components/OutlineWorkspace.vue';
import AIWorkbenchDialog from '../components/AIWorkbenchDialog.vue';
import ModelSelector from '../components/ModelSelector.vue';

const tools = ref([]);
const activeTool = ref(null);
const params = reactive({});
var selectedProvider = ref('');
var selectedModel = ref('');
const output = ref(null);

var isStructuredOutline = computed(function() {
  return output.value && output.value.data && output.value.data.volumes;
});

function onOutlineChapterSelect(payload) {
  console.log('[CreativeToolbox] chapter:', payload.chapter?.chapter);
}

const visibleInputs = computed(() => {
  const inputs = activeTool.value?.inputs || [];
  return inputs.filter(inp => {
    if (!inp.showWhen) return true;
    return Object.entries(inp.showWhen).every(([k, v]) => params[k] === v);
  });
});

const loading = ref(false);
const workbenchVisible = ref(false);
const workbenchMode = ref('refine');
const workbenchTarget = ref(null);

function initParams(tool) {
  for (const key in params) {
    delete params[key];
  }
  tool.inputs.forEach(inp => {
    if (inp.default !== undefined) {
      params[inp.key] = inp.default;
    } else if (inp.type === 'switch') {
      params[inp.key] = false;
    } else if (inp.type === 'stepper' || inp.type === 'number') {
      params[inp.key] = inp.min ?? 1;
    } else {
      params[inp.key] = '';
    }
  });
  params.extraInstruction = '';
}

function toolIcon(key) {
  const map = {
    book_title: 'bookmark-o', synopsis: 'notes-o', outline: 'orders-o',
    detailed_outline: 'description-o', opening: 'fire-o', golden_finger: 'gem-o',
    name_generator: 'user-o', character_design: 'manager-o',
    world: 'globe-o', imagination: 'bulb-o',
    book_analysis: 'chart-trending-o', chapter_title: 'flag-o',
    cover_prompt: 'photo-o', volume_summary: 'books-o',
  };
  return map[key] || 'star-o';
}

function selectTool(tool) {
  activeTool.value = tool;
  initParams(tool);
  output.value = null;
}

async function doGenerate() {
  // 动态验证必填字段
  for (const inp of activeTool.value.inputs) {
    if (inp.required === false) continue;
    const val = params[inp.key];
    if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
      showToast(`请输入${inp.label}`);
      return;
    }
  }
  loading.value = true;
  output.value = null;
  try {
    const payload = { tool_key: activeTool.value.key };
      if (selectedProvider.value) payload.provider = selectedProvider.value;
      if (selectedModel.value) payload.model = selectedModel.value;
    activeTool.value.inputs.forEach(inp => {
      const val = params[inp.key];
      if (val === undefined || val === null || val === '' || val === false) return;
      if (inp.type === 'stepper' || inp.type === 'number') {
        payload[inp.key] = parseInt(val) || inp.min || 1;
      } else if (inp.type === 'slider') {
        payload[inp.key] = Number(val);
      } else {
        payload[inp.key] = String(val).trim();
      }
    });
    if (params.extraInstruction?.trim()) {
      payload.extra_instruction = params.extraInstruction.trim();
    }
    output.value = await generateTool(payload);
  } catch (e) {
    showToast('生成失败: ' + (e.message || '未知错误'));
  } finally {
    loading.value = false;
  }
}

function openWorkbench(mode, target) {
  workbenchMode.value = mode;
  workbenchTarget.value = target;
  workbenchVisible.value = true;
}

async function handleWorkbenchConfirm(payload) {
  loading.value = true;
  try {
    const api = payload.mode === 'refine' ? refineOutline : splitOutline;
    const result = await api({
      ...payload,
      tool_key: activeTool.value.key,
      original_data: payload.target,
    });
    output.value = result;
    showSuccessToast('操作完成');
  } catch (e) {
    showToast('操作失败: ' + (e.message || '未知错误'));
  } finally {
    loading.value = false;
  }
  workbenchVisible.value = false;
}

async function copyOutput() {
  let text;
  if (output.value.type === 'json') {
    text = JSON.stringify(output.value.data, null, 2);
  } else {
    text = output.value.data || output.value.raw || '';
  }
  try {
    await navigator.clipboard.writeText(text);
    showSuccessToast('已复制');
  } catch { showToast('复制失败'); }
}

onMounted(async () => {  try {    tools.value = await fetchToolList();
  } catch {
    tools.value = [
      { key: 'book_title', name: '书名生成器', description: '生成书名，支持风格仿写' },
      { key: 'synopsis', name: '简介生成器', description: '生成简介，支持风格仿写' },
      { key: 'outline', name: '大纲生成器', description: '生成故事大纲' },
      { key: 'detailed_outline', name: '细纲生成器', description: '生成分章细纲' },
      { key: 'opening', name: '黄金开篇', description: '生成第一章开篇' },
      { key: 'golden_finger', name: '金手指生成器', description: '生成金手指设定' },
      { key: 'name_generator', name: '名字生成器', description: '生成角色名字' },
      { key: 'character_design', name: '人设生成器', description: '生成角色人设卡' },
      { key: 'world', name: '世界观生成器', description: '生成完整世界观' },
      { key: 'imagination', name: '脑洞生成器', description: '生成创意脑洞，支持风格仿写' },
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

.tool-card strong { font-size: 14px; display: block; }
.tool-card span { font-size: 12px; color: var(--muted); line-height: 1.4; display: block; }

.form-panel {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  display: grid;
  gap: 0;
  overflow-x: hidden;
}
.form-divider {
  height: 1px;
  background: #ebedf0;
  margin: 8px 0;
}

.tool-breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
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

.text-block {
  padding: 10px;
  line-height: 1.8;
  font-size: 14px;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-block.mono { font-family: 'Courier New', monospace; font-size: 13px; }

.card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.card-strategy { font-size: 12px; color: var(--muted); }
.card-tags { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin: 4px 0; }
.tag-label { font-size: 12px; color: var(--muted); margin-right: 2px; }
.card-meta { font-size: 12px; color: var(--muted); margin: 2px 0; }
.card-reason { color: var(--ink); margin: 4px 0; font-size: 13px; }
.card-title .card-title-head { display: flex; flex-direction: column; gap: 4px; }

.card-character .van-collapse { margin-top: 8px; }
.card-character .van-collapse p { font-size: 13px; margin: 4px 0; line-height: 1.6; }

.faction-card { padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.faction-card:last-child { border-bottom: none; }

.upgrade-section { margin: 6px 0; }

.name-extras { font-size: 12px; color: var(--muted); margin-top: 2px; }
.text-muted { color: var(--muted); }

.market-fit {
  background: #f8fafc; padding: 8px; border-radius: 4px;
  border-left: 3px solid var(--accent); margin: 6px 0;
}
.market-fit p { font-size: 12px; margin: 2px 0; }

.hook-line-big { font-size: 16px !important; line-height: 1.5; }

.rating-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.rating-num { font-size: 28px; color: var(--accent); }

.structure-list { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0; }
.structure-chip {
  font-size: 11px; background: #f0f4ff; padding: 2px 6px; border-radius: 4px; color: var(--accent);
}

.card-volume { border-left: 3px solid var(--accent); }

.json-dump {
  font-size: 12px; line-height: 1.6; margin: 0; white-space: pre-wrap;
  word-break: break-word; color: var(--muted); max-height: 400px; overflow: auto;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: var(--muted);
  font-size: 14px;
}

/* 全局样式补充 */
.section {
  padding: 0 12px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px;
  flex: 1;
}

.van-stepper { --van-stepper-input-width: 60px; }

/* 修复 van-field 标签过长换行 */
.form-panel :deep(.van-field__label) {
  max-width: none;
  word-break: keep-all;
  flex-shrink: 0;
}



</style>
