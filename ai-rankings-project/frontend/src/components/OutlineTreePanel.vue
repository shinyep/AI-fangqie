<template>
  <div class="otp-root">
    <div class="otp-header">
      <span class="otp-title">大纲目录</span>
      <span class="otp-actions">
        <button class="otp-act-btn" @click="expandAll">展开</button>
        <button class="otp-act-btn" @click="collapseAll">折叠</button>
      </span>
    </div>
    <div class="otp-body">
      <div v-if="!flatNodes.length" class="otp-empty">暂无大纲数据</div>
      <div class="otp-node otp-node--all" :class="{ 'is-selected': selectedId === '__all__' }" @click="$emit('select', { id: '__all__', type: 'all', title: '全部章节', rawData: null })">
        <span class="otp-arrow otp-arrow--spacer"></span>
        <span class="otp-icon">📋</span>
        <span class="otp-label">全部章节</span>
        <span class="otp-count">{{ totalChapterCount }}</span>
      </div>
      <template v-for="node in visibleNodes" :key="node.id">
        <div class="otp-node" :class="{ 'is-selected': selectedId === node.id, 'otp-node--volume': node.type === 'volume', 'otp-node--beat': node.type === 'beat', 'otp-node--chapter': node.type === 'chapter' }" :style="{ paddingLeft: (node.depth * 20 + 10) + 'px' }" @click="$emit('select', node)">
          <span v-if="node.hasChildren" class="otp-arrow" :class="{ 'is-expanded': expandedIds.has(node.id) }" @click.stop="toggleNode(node.id)">▶</span>
          <span v-else class="otp-arrow otp-arrow--spacer"></span>
          <span class="otp-icon">{{ node.type === 'volume' ? '📁' : node.type === 'beat' ? '📊' : '📄' }}</span>
          <span class="otp-label" :title="node.title">
            <template v-if="node.type === 'volume'"><b class="otp-badge otp-badge--vol">卷{{ node.volumeNumber }}</b>{{ node.title || '未命名卷' }}</template>
            <template v-else-if="node.type === 'beat'"><b class="otp-badge otp-badge--beat">{{ node.beatLabel || '节拍' }}</b>{{ node.title || node.chapterSpan }}</template>
            <template v-else><b class="otp-badge otp-badge--ch">#{{ node.chapterNumber }}</b>{{ node.title || '未命名' }}</template>
          </span>
          <span v-if="node.childCount > 0" class="otp-count">{{ node.childCount }}</span>
        </div>
      </template>
    </div>
  </div>
</template>


<script setup>
import { ref, computed, watch } from 'vue';

function buildFlatNodes(data) {
  if (!data || !data.volumes || !data.volumes.length) return [];
  const nodes = [];
  data.volumes.forEach(function(vol) {
    var vId = 'vol-' + vol.volume;
    var chs = vol.chapters || [];
    nodes.push({
      id: vId, type: 'volume', volumeNumber: vol.volume,
      title: vol.title || '', depth: 0,
      hasChildren: !!(vol.beats && vol.beats.length || chs.length),
      childCount: chs.length, rawData: vol
    });
    if (vol.beats && vol.beats.length) {
      vol.beats.forEach(function(beat, bi) {
        var bId = 'beat-' + vol.volume + '-' + bi;
        var bChs = getBeatChapters(vol, beat);
        nodes.push({
          id: bId, type: 'beat', beatLabel: beat.label,
          title: (beat.summary || '').slice(0, 48), chapterSpan: beat.chapter_span,
          depth: 1, hasChildren: bChs.length > 0, childCount: bChs.length,
          rawData: beat
        });
        bChs.forEach(function(ch) {
          nodes.push({
            id: 'ch-' + vol.volume + '-' + ch.chapter, type: 'chapter',
            chapterNumber: ch.chapter, title: ch.title || '',
            depth: 2, hasChildren: false, childCount: 0,
            rawData: ch, volumeNumber: vol.volume
          });
        });
      });
    } else {
      chs.forEach(function(ch) {
        nodes.push({
          id: 'ch-' + vol.volume + '-' + ch.chapter, type: 'chapter',
          chapterNumber: ch.chapter, title: ch.title || '',
          depth: 1, hasChildren: false, childCount: 0,
          rawData: ch, volumeNumber: vol.volume
        });
      });
    }
  });
  return nodes;
}

function getBeatChapters(volume, beat) {
  if (!volume.chapters || !volume.chapters.length || !beat.chapter_span) return [];
  var m = beat.chapter_span.match(/^(\d+)(?:-(\d+))?$/);
  if (!m) return [];
  var s = +m[1], e = m[2] ? +m[2] : s;
  return volume.chapters.filter(function(c) { return c.chapter >= s && c.chapter <= e; });
}

var props = defineProps({ data: { type: Object, required: true }, selectedId: { type: String, default: '' } });
defineEmits(['select']);

var flatNodes = ref([]);
watch(function() { return props.data; }, function(v) { flatNodes.value = buildFlatNodes(v); }, { immediate: true, deep: true });

var totalChapterCount = computed(function() {
  var n = 0;
  (props.data && props.data.volumes || []).forEach(function(v) { n += (v.chapters || []).length; });
  return n;
});

var expandedIds = ref(new Set());
watch(flatNodes, function(nodes) {
  var s = new Set();
  nodes.forEach(function(n) { if (n.hasChildren) s.add(n.id); });
  expandedIds.value = s;
}, { immediate: true });

var visibleNodes = computed(function() {
  var out = [];
  var exp = expandedIds.value;
  var d0open = true, d1open = false;
  for (var i = 0; i < flatNodes.value.length; i++) {
    var n = flatNodes.value[i];
    if (n.depth === 0) { out.push(n); d0open = exp.has(n.id); d1open = false; }
    else if (n.depth === 1) { if (d0open) { out.push(n); d1open = n.hasChildren ? exp.has(n.id) : false; } }
    else if (n.depth === 2) { if (d1open) out.push(n); }
  }
  return out;
});

function toggleNode(id) {
  var s = new Set(expandedIds.value);
  s.has(id) ? s.delete(id) : s.add(id);
  expandedIds.value = s;
}
function expandAll() {
  var s = new Set();
  flatNodes.value.forEach(function(n) { if (n.hasChildren) s.add(n.id); });
  expandedIds.value = s;
}
function collapseAll() { expandedIds.value = new Set(); }

defineExpose({ expandAll, collapseAll });
</script>


<style scoped>
.otp-root {
  display: flex; flex-direction: column;
  height: 100%; min-height: 300px;
  background: #fafbfc;
  border: 1px solid #ebedf0; border-radius: 8px;
  overflow: hidden;
}
.otp-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border-bottom: 1px solid #ebedf0;
  flex-shrink: 0;
}
.otp-title { font-size: 14px; font-weight: 600; color: #323233; }
.otp-act-btn {
  border: none; background: #f0f2f5; color: #646566;
  font-size: 11px; padding: 3px 8px; border-radius: 4px;
  cursor: pointer; margin-left: 4px;
}
.otp-act-btn:hover { background: #e0e2e5; color: #323233; }
.otp-body { flex: 1; overflow-y: auto; padding: 4px 0; }
.otp-empty { text-align: center; padding: 30px 0; color: #c8c9cc; font-size: 13px; }

.otp-node {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 10px; cursor: pointer;
  border-left: 3px solid transparent;
  transition: background .12s; user-select: none;
  min-height: 32px;
}
.otp-node:hover { background: #e8f0fe; }
.otp-node.is-selected { background: #e8f0fe; border-left-color: #4f46e5; }
.otp-node.is-selected .otp-label { color: #4f46e5; font-weight: 600; }
.otp-node--all { border-bottom: 1px solid #ebedf0; margin-bottom: 2px; }
.otp-node--volume .otp-label { font-weight: 600; }

.otp-arrow {
  flex-shrink: 0; width: 14px; font-size: 8px; color: #969799;
  text-align: center; transition: transform .15s;
}
.otp-arrow.is-expanded { transform: rotate(90deg); }
.otp-arrow--spacer { visibility: hidden; }

.otp-icon { flex-shrink: 0; font-size: 12px; width: 16px; text-align: center; }

.otp-label {
  flex: 1; font-size: 12px; color: #323233;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
}

.otp-badge {
  display: inline-block; font-size: 9px; font-weight: 700;
  padding: 1px 5px; border-radius: 6px; margin-right: 3px; vertical-align: 1px;
}
.otp-badge--vol { background: #e8f0fe; color: #4f46e5; }
.otp-badge--beat { background: #fff3e0; color: #e65100; }
.otp-badge--ch { background: #e8f5e9; color: #2e7d32; }

.otp-count {
  flex-shrink: 0; font-size: 10px; color: #969799;
  background: #f0f2f5; padding: 1px 5px; border-radius: 8px;
  min-width: 16px; text-align: center;
}
</style>
