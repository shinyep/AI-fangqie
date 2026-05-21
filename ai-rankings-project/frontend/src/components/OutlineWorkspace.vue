<template>
  <div class="ows-root" :class="{ 'ows--mobile': isNarrow }">
    <!-- 宏信息条 -->
    <div v-if="macroTitle" class="ows-macro">
      <span class="ows-macro-title">{{ macroTitle }}</span>
      <span v-if="volCount" class="ows-macro-stat">{{ volCount }}卷 · {{ totalChs }}章</span>
    </div>

    <!-- 主区域：树 + 编辑 -->
    <div class="ows-main">
      <!-- 左：大纲树 -->
      <div class="ows-left" :class="{ 'ows-left--hidden': isNarrow && !showTree }">
        <OutlineTreePanel
          ref="treeRef"
          :data="outlineData"
          :selected-id="selectedId"
          @select="onNodeSelect"
        />
      </div>

      <!-- 右：编辑器 -->
      <div class="ows-right">
        <!-- 窄屏工具条 -->
        <div v-if="isNarrow" class="ows-mobile-bar">
          <button class="ows-mobile-btn" @click="showTree = !showTree">
            {{ showTree ? '隐藏' : '目录' }}
          </button>
          <span class="ows-mobile-title">{{ currentTitle }}</span>
        </div>

        <!-- 选中状态展示 -->
        <template v-if="selectedNode">
          <!-- 卷详情 -->
          <div v-if="selectedNode.type === 'volume'" class="ows-volume-detail">
            <div class="ows-card">
              <h3 class="ows-card-title">{{ selectedNode.rawData?.title || '未命名卷' }}</h3>
              <div v-if="selectedNode.rawData?.main_promise" class="ows-card-body">
                <div class="ows-field"><span class="ows-field-label">核心承诺</span>{{ selectedNode.rawData.main_promise }}</div>
              </div>
              <div v-if="selectedNode.rawData?.escalation_mode" class="ows-card-body">
                <div class="ows-field"><span class="ows-field-label">升级模式</span>{{ selectedNode.rawData.escalation_mode }}</div>
              </div>
              <div class="ows-card-body">
                <div class="ows-field"><span class="ows-field-label">章节数</span>{{ selectedNode.childCount || 0 }}</div>
              </div>
              <div v-if="selectedNode.rawData?.beats?.length" class="ows-card-footer">
                <span class="ows-tag" v-for="b in selectedNode.rawData.beats" :key="b.label">{{ b.label }}</span>
              </div>
            </div>

            <!-- 该卷下全部章节平铺 -->
            <div class="ows-chapters">
              <div class="ows-chapters-head">该卷全部章节</div>
              <div
                v-for="ch in selectedNode.rawData?.chapters || []"
                :key="'ch-' + ch.chapter"
                class="ows-chapter-item"
                :class="{ 'is-active': activeChapter && activeChapter.chapter === ch.chapter }"
                @click="focusChapter(ch)"
              >
                <span class="ows-ch-num">#{{ ch.chapter }}</span>
                <span class="ows-ch-title">{{ ch.title || '未命名' }}</span>
                <span v-if="ch.emotional_beat" class="ows-ch-tag">{{ ch.emotional_beat }}</span>
              </div>
            </div>
          </div>

          <!-- 节拍详情 -->
          <div v-else-if="selectedNode.type === 'beat'" class="ows-beat-detail">
            <div class="ows-card">
              <h3 class="ows-card-title">
                <b class="otp-badge otp-badge--beat">{{ selectedNode.beatLabel }}</b>
                {{ selectedNode.chapterSpan || '' }}
              </h3>
              <div class="ows-card-body">
                <div class="ows-field"><span class="ows-field-label">摘要</span>{{ selectedNode.rawData?.summary || '暂无' }}</div>
              </div>
              <div v-if="selectedNode.deliverables?.length" class="ows-card-body">
                <span class="ows-field-label">必须交付</span>
                <ol class="ows-deliverables">
                  <li v-for="(d, i) in selectedNode.deliverables" :key="i">{{ d }}</li>
                </ol>
              </div>
              <div class="ows-card-body">
                <span class="ows-field-label">章节数</span>
                <span>{{ selectedNode.childCount || 0 }}</span>
              </div>
            </div>

            <!-- 节拍下的章节列表 -->
            <div class="ows-chapters">
              <div class="ows-chapters-head">该节拍下章节</div>
              <div v-if="!beatChapters.length" class="ows-empty-small">暂无章节</div>
              <div
                v-for="ch in beatChapters"
                :key="'ch-' + ch.chapter"
                class="ows-chapter-item"
                :class="{ 'is-active': activeChapter && activeChapter.chapter === ch.chapter }"
                @click="focusChapter(ch)"
              >
                <span class="ows-ch-num">#{{ ch.chapter }}</span>
                <span class="ows-ch-title">{{ ch.title || '未命名' }}</span>
                <span v-if="ch.emotional_beat" class="ows-ch-tag">{{ ch.emotional_beat }}</span>
              </div>
            </div>
          </div>

          <!-- 全部章节视图 -->
          <div v-else-if="selectedNode.type === 'all'" class="ows-chapters">
            <div class="ows-chapters-head">全部章节 ({{ totalChs }})</div>
            <div v-if="!allChapters.length" class="ows-empty-small">暂无章节</div>
            <div
              v-for="ch in allChapters"
              :key="'ch-' + (ch.volumeNumber || 0) + '-' + ch.chapter"
              class="ows-chapter-item"
              :class="{ 'is-active': activeChapter && activeChapter.chapter === ch.chapter }"
              @click="focusChapter(ch)"
            >
              <span class="ows-ch-num">#{{ ch.chapter }}</span>
              <span class="ows-ch-title">{{ ch.title || '未命名' }}</span>
              <span v-if="ch.volumeNumber" class="ows-ch-badge-vol">卷{{ ch.volumeNumber }}</span>
              <span v-if="ch.emotional_beat" class="ows-ch-tag">{{ ch.emotional_beat }}</span>
            </div>
          </div>

          <!-- 章节选中 → 七段式编辑器 -->
          <div v-if="activeChapter" class="ows-editor-section">
            <slot name="editor" :chapter="activeChapter" :all-chapters="allChapters" :active-index="activeChapterIndex" />
          </div>
        </template>

        <!-- 未选中 -->
        <div v-else class="ows-placeholder">
          <p>👈 从左侧目录选择一个节点</p>
          <p class="ows-placeholder-hint">点击卷查看概览，点击章节进行深度编辑</p>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, computed, watch } from 'vue';
import OutlineTreePanel from './OutlineTreePanel.vue';

const props = defineProps({
  outlineData: { type: Object, required: true },
  modelValue: { type: Object, default: null },  // 当前选中章节
});

var emit = defineEmits(['update:modelValue', 'select-chapter', 'select-node']);

var isNarrow = ref(false);
var showTree = ref(true);
var selectedNode = ref(null);
var selectedId = ref('__all__');
var treeRef = ref(null);

function checkNarrow() {
  isNarrow.value = window.innerWidth < 768;
  if (!isNarrow.value) showTree.value = true;
}
if (typeof window !== 'undefined') {
  checkNarrow();
  window.addEventListener('resize', checkNarrow);
}

var macroTitle = computed(function() {
  return props.outlineData && props.outlineData.macro && props.outlineData.macro.logline || '';
});

var volCount = computed(function() {
  return (props.outlineData && props.outlineData.volumes || []).length;
});

var totalChs = computed(function() {
  var n = 0;
  (props.outlineData && props.outlineData.volumes || []).forEach(function(v) { n += (v.chapters || []).length; });
  return n;
});

var allChapters = computed(function() {
  var out = [];
  (props.outlineData && props.outlineData.volumes || []).forEach(function(v) {
    (v.chapters || []).forEach(function(ch) {
      out.push(Object.assign({}, ch, { volumeNumber: v.volume }));
    });
  });
  return out;
});

var activeChapter = ref(null);
var activeChapterIndex = ref(-1);

var currentTitle = computed(function() {
  if (activeChapter.value) return '#' + activeChapter.value.chapter + ' ' + (activeChapter.value.title || '未命名');
  if (selectedNode.value && selectedNode.value.title) return selectedNode.value.title;
  return '大纲工作区';
});

var beatChapters = computed(function() {
  if (!selectedNode.value || selectedNode.value.type !== 'beat') return [];
  var vol = props.outlineData && props.outlineData.volumes && props.outlineData.volumes.find(function(v) {
    return v.volume === (selectedNode.value.rawData && selectedNode.value.rawData._volNum);
  });
  if (!vol) return [];
  var span = selectedNode.value.chapterSpan;
  if (!span) return [];
  var m = span.match(/^(d+)(?:-(d+))?$/);
  if (!m) return [];
  var s = +m[1], e = m[2] ? +m[2] : s;
  return (vol.chapters || []).filter(function(c) { return c.chapter >= s && c.chapter <= e; });
});

function onNodeSelect(node) {
  selectedNode.value = node;
  selectedId.value = node.id;
  if (node.type === 'chapter' && node.rawData) {
    focusChapter(node.rawData);
  } else {
    activeChapter.value = null;
    activeChapterIndex.value = -1;
  }
  emit('select-node', node);
  if (isNarrow.value) showTree.value = false;
}

function focusChapter(ch) {
  activeChapter.value = ch;
  activeChapterIndex.value = allChapters.value.findIndex(function(c) { return c.chapter === ch.chapter && c.volumeNumber === ch.volumeNumber; });
  emit('update:modelValue', ch);
  emit('select-chapter', { chapter: ch, index: activeChapterIndex.value, allChapters: allChapters.value });
  if (isNarrow.value) showTree.value = false;
}
</script>


<style scoped>
.ows-root { max-width: 100%; }
.ows--mobile .ows-main { flex-direction: column; }

/* 宏信息条 */
.ows-macro {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 12px; margin-bottom: 8px;
  background: #fff; border: 1px solid #ebedf0; border-radius: 8px;
}
.ows-macro-title { font-size: 13px; font-weight: 600; color: #323233; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ows-macro-stat { font-size: 11px; color: #969799; flex-shrink: 0; }

/* 主区域三栏 */
.ows-main {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 10px;
  min-height: 420px;
  align-items: start;
}
.ows-left { min-height: 300px; }
.ows-left--hidden { display: none; }
.ows-right { min-height: 300px; }

/* 窄屏 */
.ows-mobile-bar {
  display: flex; align-items: center; gap: 8px; padding: 8px 0; margin-bottom: 8px;
}
.ows-mobile-btn {
  border: 1px solid #ebedf0; background: #fff; border-radius: 6px;
  padding: 4px 12px; font-size: 12px; color: #4f46e5; cursor: pointer;
  flex-shrink: 0;
}
.ows-mobile-btn:hover { background: #f0f2ff; }
.ows-mobile-title { font-size: 13px; font-weight: 600; color: #323233; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 卡片 */
.ows-card {
  background: #fff; border: 1px solid #ebedf0; border-radius: 8px; overflow: hidden; margin-bottom: 10px;
}
.ows-card-title { font-size: 15px; font-weight: 600; padding: 10px 12px; margin: 0; border-bottom: 1px solid #f5f5f5; }
.ows-card-body { padding: 8px 12px; border-bottom: 1px solid #f5f5f5; }
.ows-card-body:last-child { border-bottom: none; }
.ows-card-footer { padding: 8px 12px; display: flex; flex-wrap: wrap; gap: 4px; }
.ows-field { font-size: 13px; line-height: 1.6; color: #323233; }
.ows-field-label { font-size: 11px; color: #969799; display: block; margin-bottom: 2px; font-weight: 600; }
.ows-tag { font-size: 10px; background: #e8f0fe; color: #4f46e5; padding: 2px 6px; border-radius: 6px; }

/* 必须交付列表 */
.ows-deliverables { margin: 4px 0 0; padding-left: 18px; font-size: 13px; color: #323233; line-height: 1.6; }

/* 章节列表 */
.ows-chapters { background: #fff; border: 1px solid #ebedf0; border-radius: 8px; overflow: hidden; margin-bottom: 10px; }
.ows-chapters-head { padding: 8px 12px; font-size: 12px; font-weight: 600; color: #646566; border-bottom: 1px solid #f5f5f5; background: #fafbfc; }
.ows-empty-small { padding: 16px; text-align: center; font-size: 12px; color: #c8c9cc; }

.ows-chapter-item {
  display: flex; align-items: center; gap: 6px; padding: 7px 12px;
  border-bottom: 1px solid #f5f5f5; cursor: pointer; transition: background .12s;
}
.ows-chapter-item:last-child { border-bottom: none; }
.ows-chapter-item:hover { background: #e8f0fe; }
.ows-chapter-item.is-active { background: #e8f0fe; border-left: 3px solid #4f46e5; }
.ows-ch-num { font-size: 11px; color: #4f46e5; font-weight: 600; flex-shrink: 0; }
.ows-ch-title { font-size: 13px; color: #323233; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ows-ch-tag { font-size: 10px; color: #969799; background: #f0f2f5; padding: 1px 5px; border-radius: 4px; }
.ows-ch-badge-vol { font-size: 9px; background: #e8f0fe; color: #4f46e5; padding: 1px 4px; border-radius: 4px; }

/* 编辑器区 */
.ows-editor-section { margin-top: 10px; }

/* 占位 */
.ows-placeholder { padding: 40px 20px; text-align: center; color: #969799; }
.ows-placeholder p { margin: 4px 0; font-size: 14px; }
.ows-placeholder-hint { font-size: 12px !important; color: #c8c9cc; }

/* 引入树面板的徽章样式（用于节拍标题） */
.otp-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px; margin-right: 4px; vertical-align: 1px; }
.otp-badge--beat { background: #fff3e0; color: #e65100; }

/* 响应式 */
@media (min-width: 1024px) {
  .ows-main { grid-template-columns: 240px 1fr; }
}
@media (max-width: 767px) {
  .ows-main { grid-template-columns: 1fr; }
  .ows-left { position: fixed; z-index: 100; left: 0; top: 0; width: 260px; height: 100vh; box-shadow: 2px 0 12px rgba(0,0,0,.08); }
  .ows-left--hidden { display: none; }
}


/* 卷详情增强 */
.ows-vol-hero {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border-radius: 8px 8px 0 0;
  color: #fff;
}
.ows-vol-badge {
  font-size: 11px; font-weight: 700;
  background: rgba(255,255,255,.2);
  padding: 3px 10px; border-radius: 8px;
  flex-shrink: 0;
}
.ows-vol-title { border-bottom: none !important; padding: 0 !important; font-size: 16px !important; color: #fff !important; flex: 1; }
.ows-card-body--highlight {
  background: #fffdf0;
  border-left: 3px solid #f59e0b;
  margin: 4px 0;
}
</style>
