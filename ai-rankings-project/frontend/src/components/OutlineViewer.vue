<template>
  <div class="outline-viewer">
    <!-- 故事宏观卡片 -->
    <div class="macro-card">
      <p class="logline">{{ data.macro?.logline || '大纲已生成' }}</p>
      <div class="macro-meta">
        <van-tag size="mini" type="primary" plain>{{ data.macro?.theme }}</van-tag>
        <van-tag size="mini" plain>{{ data.macro?.target_audience }}</van-tag>
      </div>
      <p class="core-appeal">{{ data.macro?.core_appeal }}</p>
    </div>

    <!-- 卷选择器 -->
    <div class="volume-tabs">
      <button
        v-for="(vol, vi) in data.volumes"
        :key="vi"
        class="volume-tab"
        :class="{ active: activeVolume === vi }"
        @click="activeVolume = vi; activeBeat = null"
      >
        <span class="vol-num">卷{{ vol.volume }}</span>
        <span class="vol-title">{{ vol.title }}</span>
      </button>
    </div>

    <!-- 选中卷的详情 -->
    <div v-if="currentVolume" class="volume-detail">
      <div class="vol-card">
        <h3>{{ currentVolume.title }}</h3>
        <p><strong>核心承诺：</strong>{{ currentVolume.main_promise }}</p>
        <p><strong>升级模式：</strong>{{ currentVolume.escalation_mode }}</p>
      </div>

      <!-- 节奏板 -->
      <div v-if="currentVolume.beats?.length" class="beats-section">
        <h4 class="section-label">节奏板</h4>
        <div
          v-for="(beat, bi) in currentVolume.beats"
          :key="bi"
          class="beat-card"
          :class="{ expanded: activeBeat === bi }"
        >
          <div class="beat-header" @click="activeBeat = activeBeat === bi ? null : bi">
            <van-tag size="mini" :type="beatTagType(beat.label)">{{ beat.label }}</van-tag>
            <span class="beat-chapters">{{ beat.chapter_span }}</span>
            <van-icon :name="activeBeat === bi ? 'arrow-up' : 'arrow-down'" size="14" />
          </div>
          <p class="beat-summary">{{ beat.summary }}</p>
          <div v-if="activeBeat === bi" class="beat-body">
            <div v-if="beat.deliverables?.length" class="beat-deliverables">
              <span class="mini-label">必须交付：</span>
              <span v-for="d in beat.deliverables" :key="d" class="deliverable-chip">{{ d }}</span>
            </div>
            <!-- 该Beat下的章节 -->
            <div v-if="getBeatChapters(bi).length" class="chapter-list">
              <div v-for="ch in getBeatChapters(bi)" :key="ch.chapter" class="chapter-item">
                <span class="ch-num">第{{ ch.chapter }}章</span>
                <div class="ch-info">
                  <strong>{{ ch.title }}</strong>
                  <p>{{ ch.summary }}</p>
                  <van-tag v-if="ch.conflict" size="mini" plain type="danger">{{ ch.conflict }}</van-tag>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 全部章节列表 -->
      <div v-if="currentVolume.chapters?.length" class="chapters-flat">
        <h4 class="section-label">全部章节</h4>
        <div v-for="ch in currentVolume.chapters" :key="ch.chapter" class="chapter-item">
          <span class="ch-num">第{{ ch.chapter }}章</span>
          <div class="ch-info">
            <strong>{{ ch.title }}</strong>
            <p>{{ ch.summary }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  data: { type: Object, required: true },
});

const activeVolume = ref(0);
const activeBeat = ref(null);

const currentVolume = computed(() => props.data.volumes?.[activeVolume.value]);

function beatTagType(label) {
  const map = { '铺垫': '', '爆发': 'danger', '转折': 'warning', '高潮': 'primary', '起': '', '承': 'warning', '转': 'danger', '合': 'primary' };
  return map[label] || '';
}

// 简单的按章节范围匹配beat (如果beat有chapter_span)
function getBeatChapters(beatIndex) {
  const beat = currentVolume.value?.beats?.[beatIndex];
  if (!beat?.chapter_span || !currentVolume.value?.chapters) return [];
  const match = beat.chapter_span.match(/(\d+)\s*[-–—]\s*(\d+)/);
  if (!match) return [];
  const start = parseInt(match[1]);
  const end = parseInt(match[2]);
  return currentVolume.value.chapters.filter(ch => ch.chapter >= start && ch.chapter <= end);
}
</script>

<style scoped>
.outline-viewer { display: grid; gap: 12px; }

.macro-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff; padding: 16px; border-radius: 10px;
}
.logline { font-size: 18px; font-weight: 700; margin: 0 0 8px; line-height: 1.4; }
.macro-meta { display: flex; gap: 6px; margin-bottom: 6px; }
.core-appeal { font-size: 13px; opacity: 0.9; margin: 6px 0 0; }

.volume-tabs { display: flex; gap: 0; overflow-x: auto; }
.volume-tab {
  flex: 1; min-width: 80px; padding: 10px 8px; border: 1px solid var(--line);
  background: #fff; text-align: center; cursor: pointer; border-radius: 0;
  display: flex; flex-direction: column; gap: 2px;
}
.volume-tab:first-child { border-radius: 6px 0 0 6px; }
.volume-tab:last-child { border-radius: 0 6px 6px 0; }
.volume-tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.vol-num { font-size: 11px; opacity: 0.7; }
.vol-title { font-size: 13px; font-weight: 600; }

.volume-detail { display: grid; gap: 10px; }
.vol-card {
  background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 12px;
}
.vol-card h3 { margin: 0 0 8px; font-size: 16px; }
.vol-card p { font-size: 13px; margin: 4px 0; color: var(--muted); }

.section-label { font-size: 14px; font-weight: 600; margin: 0 0 8px; color: var(--ink); }

.beats-section { display: grid; gap: 8px; }
.beat-card {
  background: #f8fafc; border: 1px solid var(--line); border-radius: 8px; padding: 10px;
}
.beat-card.expanded { border-color: var(--accent); }
.beat-header {
  display: flex; align-items: center; gap: 8px; cursor: pointer;
}
.beat-chapters { font-size: 12px; color: var(--muted); flex: 1; }
.beat-summary { font-size: 13px; color: var(--ink); margin: 6px 0 0; }
.beat-body { margin-top: 8px; padding-top: 8px; border-top: 1px solid #e8e8e8; }
.beat-deliverables { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.mini-label { font-size: 12px; color: var(--muted); }
.deliverable-chip {
  font-size: 11px; background: #e8f5e9; color: #2e7d32; padding: 2px 6px; border-radius: 4px;
}

.chapter-list { margin-top: 8px; display: grid; gap: 6px; }
.chapters-flat { display: grid; gap: 6px; }
.chapter-item {
  display: flex; gap: 10px; align-items: flex-start; padding: 8px;
  background: #fff; border: 1px solid #f0f0f0; border-radius: 6px;
}
.ch-num {
  flex: 0 0 56px; font-size: 12px; color: var(--accent); font-weight: 700; text-align: center;
  padding-top: 2px;
}
.ch-info strong { font-size: 14px; display: block; margin-bottom: 2px; }
.ch-info p { font-size: 12px; color: var(--muted); margin: 2px 0; }
</style>
