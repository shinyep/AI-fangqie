<template>
  <div class="doe-root">
    <!-- 批量模式 -->
    <template v-if="isBatchMode">
      <div class="doe-toolbar">
        <van-button size="mini" icon="add-o" @click="addChapter">添加章节</van-button>
        <van-button size="mini" icon="gem-o" type="warning" @click="onRefine">完善</van-button>
        <van-button size="mini" icon="cluster-o" type="primary" @click="onSplit">拆分</van-button>
      </div>
      <div class="doe-chapters">
        <div v-for="(ch, ci) in localData" :key="ci" class="doe-chapter">
          <div class="doe-ch-header" @click="toggleChapter(ci)">
            <span class="ch-num">#{{ ch.chapter }}</span>
            <strong>{{ ch.title }}</strong>
            <span v-if="ch.word_count_estimate" class="wc">{{ ch.word_count_estimate }}字</span>
            <van-tag v-if="ch.emotional_beat" size="mini" plain>{{ ch.emotional_beat }}</van-tag>
            <van-icon :name="expandedChapter === ci ? 'arrow-up' : 'arrow-down'" size="14" class="expand-icon" />
          </div>
          <p class="doe-quick">{{ (ch.events || []).join(' → ') }}</p>
          <div v-if="expandedChapter === ci" class="doe-seven">
            <div class="seg"><span class="seg-label">1. 当前任务</span><p>{{ ch.seven_part?.current_task || '暂无' }}</p></div>
            <div class="seg"><span class="seg-label">2. 读者期待</span><p>{{ ch.seven_part?.reader_expectation || '暂无' }}</p></div>
            <div class="seg"><span class="seg-label">3. 钩子兑现</span><p v-if="ch.seven_part?.hook_payoff?.from_chapter">来自第{{ ch.seven_part.hook_payoff.from_chapter }}章：{{ ch.seven_part.hook_payoff.description }}</p><p v-else class="muted">新开</p></div>
            <div class="seg"><span class="seg-label">4. 日常过渡</span><p>{{ ch.seven_part?.daily_transition || '无' }}</p></div>
            <div class="seg seg-choice" v-if="ch.seven_part?.key_choice?.conflict"><span class="seg-label">5. 关键抑择</span><p><strong>冲突：</strong>{{ ch.seven_part.key_choice.conflict }}</p><p><strong>选项：</strong>{{ (ch.seven_part.key_choice.options || []).join(' / ') }}</p><p><strong>代价：</strong>{{ ch.seven_part.key_choice.cost }}</p></div>
            <div class="seg" v-else><span class="seg-label">5. 关键抑择</span><p class="muted">暂无</p></div>
            <div class="seg"><span class="seg-label">6. 章尾改变</span><p>{{ ch.seven_part?.chapter_change || '暂无' }}</p></div>
            <div class="seg" v-if="ch.seven_part?.hook_ledger?.length"><span class="seg-label">7. Hook账本</span><div class="hook-list"><div v-for="(h, hi) in ch.seven_part.hook_ledger" :key="hi" class="hook-item"><van-tag size="mini" :type="hookTagType(h.type)">{{ hookLabel(h.type) }}</van-tag><span class="hook-text">{{ h.hook }}</span><span v-if="h.expected_chapter" class="hook-ch">→ 第{{ h.expected_chapter }}章</span></div></div></div>
            <div class="seg" v-else><span class="seg-label">7. Hook账本</span><p class="muted">暂无新钩子</p></div>
            <div class="seg-meta"><span v-if="ch.characters?.length"><strong>出场：</strong>{{ ch.characters.join('、') }}</span><span v-if="ch.conflict"><strong>冲突：</strong>{{ ch.conflict }}</span></div>
          </div>
        </div>
      </div>
    </template>
    <!-- 单章深度模式 - see part2 -->
    <template v-else>
      <div class="ch-nav">
        <van-button size="small" icon="arrow-left" :disabled="activeIndex <= 0" @click="prevChapter">上章</van-button>
        <span class="nav-label">第{{ currentChapter.chapter || activeIndex + 1 }}章 / 共{{ localData.length }}章</span>
        <van-button size="small" icon="arrow" :disabled="activeIndex >= localData.length - 1" @click="nextChapter">下章</van-button>
        <div class="nav-actions">
          <van-button size="small" icon="add-o" @click="addChapter">添加</van-button>
          <van-button size="small" icon="delete-o" type="danger" :disabled="localData.length <= 1" @click="removeChapter">删除</van-button>
        </div>
      </div>
      <!-- 章节基本信息 -->
      <div class="section-card">
        <div class="section-head" @click="toggleSection('basic')">
          <span class="section-icon">📋</span><strong>章节基本信息</strong>
          <van-icon :name="sections.basic ? 'arrow-up' : 'arrow-down'" size="14" class="expand-icon" />
        </div>
        <div v-if="sections.basic" class="section-body">
          <van-field v-model="currentChapter.title" label="章节标题" placeholder="输入章节标题" clearable @update:model-value="emitUpdate" />
          <van-field v-model="currentChapter.emotional_beat" label="情感基调" placeholder="如：紧张/轻松/悲伤/热血" clearable @update:model-value="emitUpdate" />
          <van-field v-model="currentChapter.word_count_estimate" label="预估字数" type="number" placeholder="2500" clearable @update:model-value="emitUpdate" />
          <van-field v-model="currentChapter.conflict" label="冲突概述" type="textarea" rows="2" placeholder="本章冲突概述" autosize clearable @update:model-value="emitUpdate" />
          <div class="field-row"><label class="row-label">出场角色</label><div class="chip-input"><van-tag v-for="(c, i) in (currentChapter.characters || [])" :key="i" size="medium" closeable @close="removeCharacter(i)">{{ c }}</van-tag><input v-model="newCharacter" class="chip-add" placeholder="添加角色..." @keyup.enter="addCharacter" /></div></div>
          <div class="field-row"><label class="row-label">核心事件</label><div class="chip-input"><van-tag v-for="(e, i) in (currentChapter.events || [])" :key="i" size="medium" type="primary" closeable @close="removeEvent(i)">{{ e }}</van-tag><input v-model="newEvent" class="chip-add" placeholder="添加事件..." @keyup.enter="addEvent" /></div></div>
        </div>
      </div>
      <!-- 7段式细纲 -->
      <div class="section-card">
        <div class="section-head" @click="toggleSection('sevenPart')">
          <span class="section-icon">📖</span><strong>7段式细纲</strong>
          <van-button size="mini" type="warning" class="section-ai-btn" @click.stop="onRefineSingle">AI完善</van-button>
          <van-icon :name="sections.sevenPart ? 'arrow-up' : 'arrow-down'" size="14" class="expand-icon" />
        </div>
        <div v-if="sections.sevenPart" class="section-body">
          <div class="seven-card"><span class="seg-num">1. 当前任务</span><textarea v-model="currentChapter.seven_part.current_task" class="seg-input" rows="2" placeholder="本章核心叙事任务（一句话说清）" @input="emitUpdate"></textarea></div>
          <div class="seven-card"><span class="seg-num">2. 读者期待</span><textarea v-model="currentChapter.seven_part.reader_expectation" class="seg-input" rows="2" placeholder="读者此刻最想知道什么？" @input="emitUpdate"></textarea></div>
          <div class="seven-card"><span class="seg-num">3. 钩子兑现</span><div class="seg-hook-payoff"><van-field v-model="currentChapter.seven_part.hook_payoff.from_chapter" label="来自章节" type="number" placeholder="0=新开" @update:model-value="emitUpdate" /><van-field v-model="currentChapter.seven_part.hook_payoff.description" label="兑现描述" placeholder="说明兑现方式" @update:model-value="emitUpdate" /></div></div>
          <div class="seven-card"><span class="seg-num">4. 日常过渡</span><textarea v-model="currentChapter.seven_part.daily_transition" class="seg-input" rows="2" placeholder="日常段落的叙事功能（如无则填无）" @input="emitUpdate"></textarea></div>
          <div class="seven-card seven-choice"><span class="seg-num">5. 关键抑择</span><van-field v-model="currentChapter.seven_part.key_choice.conflict" label="冲突" placeholder="核心冲突是什么？" @update:model-value="emitUpdate" /><div class="field-row"><label class="row-label">可选路径</label><div class="chip-input"><van-tag v-for="(opt, i) in (currentChapter.seven_part.key_choice.options || [])" :key="i" size="medium" type="warning" closeable @close="removeOption(i)">{{ opt }}</van-tag><input v-model="newOption" class="chip-add" placeholder="添加选项..." @keyup.enter="addOption" /></div></div><van-field v-model="currentChapter.seven_part.key_choice.cost" label="代价" placeholder="每种选择的代价" @update:model-value="emitUpdate" /></div>
          <div class="seven-card"><span class="seg-num">6. 章尾改变</span><textarea v-model="currentChapter.seven_part.chapter_change" class="seg-input" rows="2" placeholder="不可逆的改变（信息/关系/物理/权力）" @input="emitUpdate"></textarea></div>
          <div class="seven-card"><div class="hook-ledger-head"><span class="seg-num">7. Hook账本</span><van-button size="mini" icon="add-o" @click="addHook">添加钩子</van-button></div><div v-for="(hook, hi) in (currentChapter.seven_part.hook_ledger || [])" :key="hi" class="hook-edit-row"><van-dropdown-menu active-color="var(--accent)"><van-dropdown-item v-model="hook.type" :options="hookTypeOptions" @change="emitUpdate" /></van-dropdown-menu><input v-model="hook.hook" class="hook-edit-input" placeholder="钩子描述" @input="emitUpdate" /><input v-model="hook.expected_chapter" class="hook-edit-num" type="number" placeholder="章号" @input="emitUpdate" /><van-button size="mini" icon="delete-o" type="danger" @click="removeHook(hi)" /></div><p v-if="!currentChapter.seven_part.hook_ledger?.length" class="muted">暂无钩子</p></div>
        </div>
      </div>
      <!-- 章节边界合同 -->
      <div class="section-card">
        <div class="section-head" @click="toggleSection('boundary')">
          <span class="section-icon">📐</span><strong>章节边界合同</strong>
          <van-button size="mini" type="primary" class="section-ai-btn" :loading="loadingBoundary" @click.stop="aiGenerateBoundary">AI生成</van-button>
          <van-icon :name="sections.boundary ? 'arrow-up' : 'arrow-down'" size="14" class="expand-icon" />
        </div>
        <div v-if="sections.boundary" class="section-body">
          <template v-if="currentChapter.boundary">
            <van-field v-model="currentChapter.boundary.purpose" label="章节目标" type="textarea" rows="2" placeholder="本章要交付什么？" autosize @update:model-value="emitUpdate" />
            <van-field v-model="currentChapter.boundary.exclusive_event" label="独占事件" type="textarea" rows="2" placeholder="只有本章发生的事件" autosize @update:model-value="emitUpdate" />
            <van-field v-model="currentChapter.boundary.ending_state" label="结束状态" type="textarea" rows="2" placeholder="本章结束时角色/故事状态" autosize @update:model-value="emitUpdate" />
            <van-field v-model="currentChapter.boundary.next_chapter_entry_state" label="下章入口状态" type="textarea" rows="2" placeholder="为下一章留的入口动机" autosize @update:model-value="emitUpdate" />
          </template>
          <p v-else class="muted">暂无边界合同数据，点击"AI生成"或从单章深度编排生成。</p>
        </div>
      </div>
      <!-- 高级设置 -->
      <div class="section-card">
        <div class="section-head" @click="toggleSection('advanced')">
          <span class="section-icon">⚙</span><strong>高级设置</strong>
          <van-icon :name="sections.advanced ? 'arrow-up' : 'arrow-down'" size="14" class="expand-icon" />
        </div>
        <div v-if="sections.advanced" class="section-body">
          <div class="slider-row"><span class="slider-label">冲突等级</span><span class="slider-val">{{ currentChapter.boundary?.conflict_level ?? 0 }}</span><input type="range" class="range-slider" min="0" max="100" :value="currentChapter.boundary?.conflict_level ?? 0" @input="onSliderChange('conflict_level', $event)" /></div>
          <div class="slider-row"><span class="slider-label">揭露等级</span><span class="slider-val">{{ currentChapter.boundary?.reveal_level ?? 0 }}</span><input type="range" class="range-slider" min="0" max="100" :value="currentChapter.boundary?.reveal_level ?? 0" @input="onSliderChange('reveal_level', $event)" /></div>
          <van-field v-model="currentChapter.boundary.target_word_count" label="目标字数" type="number" placeholder="3000" @update:model-value="emitUpdate" />
          <van-field v-model="currentChapter.boundary.must_avoid" label="禁止事项" type="textarea" rows="2" placeholder="本章绝对不能做的事" autosize @update:model-value="emitUpdate" />
          <div class="field-row"><label class="row-label">兑现关联（每行一个）</label><textarea v-model="payoffRefsText" class="seg-input" rows="3" placeholder="前文钩子ID或描述" @input="onPayoffRefsChange"></textarea></div>
        </div>
      </div>
      <!-- 场景卡拆解 -->
      <div class="section-card">
        <div class="section-head" @click="toggleSection('sceneCards')">
          <span class="section-icon">🎬</span><strong>场景卡拆解</strong>
          <span v-if="sceneCardsCount > 0" class="badge">{{ sceneCardsCount }}</span>
          <van-button size="mini" type="primary" class="section-ai-btn" :loading="loadingScenes" @click.stop="aiGenerateSceneCards">AI生成</van-button>
          <van-icon :name="sections.sceneCards ? 'arrow-up' : 'arrow-down'" size="14" class="expand-icon" />
        </div>
        <div v-if="sections.sceneCards" class="section-body">
          <template v-if="currentChapter.scene_cards?.length">
            <div v-for="(sc, si) in currentChapter.scene_cards" :key="si" class="scene-card-item">
              <div class="scene-card-head">
                <span class="scene-key">{{ sc.scene_key || ('SC' + String(si + 1).padStart(2, '0')) }}</span>
                <input v-model="sc.title" class="scene-title-input" placeholder="场景标题" @input="emitUpdate" />
                <van-stepper v-model="sc.target_word_count" :min="100" :max="3000" :step="100" integer @change="emitUpdate" />
                <van-button size="mini" icon="delete-o" @click="removeSceneCard(si)" />
              </div>
              <div class="scene-card-body">
                <van-field v-model="sc.purpose" label="场景目标" placeholder="该场景完成什么叙事任务" @update:model-value="emitUpdate" />
                <van-field v-model="sc.entry_state" label="入场状态" placeholder="角色/情绪/环境" @update:model-value="emitUpdate" />
                <van-field v-model="sc.exit_state" label="离场状态" placeholder="角色/情绪/环境" @update:model-value="emitUpdate" />
                <div class="field-row"><label class="row-label">必须推进</label><div class="chip-input"><van-tag v-for="(a, ai) in (sc.must_advance || [])" :key="ai" size="medium" type="primary" closeable @close="removeMustAdvance(si, ai)">{{ a }}</van-tag><input v-model="newMustAdvance" class="chip-add" placeholder="添加..." @keyup.enter="addMustAdvance(si)" /></div></div>
                <div class="field-row"><label class="row-label">必须保持</label><div class="chip-input"><van-tag v-for="(p, pi) in (sc.must_preserve || [])" :key="pi" size="medium" type="warning" closeable @close="removeMustPreserve(si, pi)">{{ p }}</van-tag><input v-model="newMustPreserve" class="chip-add" placeholder="添加..." @keyup.enter="addMustPreserve(si)" /></div></div>
              </div>
            </div>
            <van-button size="small" icon="add-o" block @click="addSceneCard">添加场景卡</van-button>
          </template>
          <p v-else class="muted">暂无场景卡，点击"AI生成"根据章节信息自动拆解场景。</p>
        </div>
      </div>
      <!-- 任务单 -->
      <div class="section-card">
        <div class="section-head" @click="toggleSection('taskSheet')">
          <span class="section-icon">📝</span><strong>任务单</strong>
          <van-button size="mini" type="primary" class="section-ai-btn" :loading="loadingTask" @click.stop="aiGenerateTaskSheet">AI生成</van-button>
          <van-icon :name="sections.taskSheet ? 'arrow-up' : 'arrow-down'" size="14" class="expand-icon" />
        </div>
        <div v-if="sections.taskSheet" class="section-body">
          <template v-if="currentChapter.task_sheet">
            <van-field v-model="currentChapter.task_sheet.writing_focus" label="写作重心" type="textarea" rows="2" autosize @update:model-value="emitUpdate" />
            <van-field v-model="currentChapter.task_sheet.conflict_delivery" label="冲突呈现" type="textarea" rows="2" autosize @update:model-value="emitUpdate" />
            <van-field v-model="currentChapter.task_sheet.emotion_curve" label="情绪曲线" placeholder="如：紧张→释然→高潮→留白" @update:model-value="emitUpdate" />
            <div class="field-row"><label class="row-label">禁止事项</label><div class="chip-input"><van-tag v-for="(a, ai) in (currentChapter.task_sheet.avoid_list || [])" :key="ai" size="medium" type="danger" closeable @close="removeAvoidItem(ai)">{{ a }}</van-tag><input v-model="newAvoidItem" class="chip-add" placeholder="添加..." @keyup.enter="addAvoidItem" /></div></div>
            <div class="field-row"><label class="row-label">质量自查清单</label><div class="chip-input"><van-tag v-for="(q, qi) in (currentChapter.task_sheet.quality_checklist || [])" :key="qi" size="medium" type="success" closeable @close="removeCheckItem(qi)">{{ q }}</van-tag><input v-model="newCheckItem" class="chip-add" placeholder="添加..." @keyup.enter="addCheckItem" /></div></div>
          </template>
          <p v-else class="muted">暂无任务单，点击"AI生成"生成可执行的写作任务单。</p>
        </div>
      </div>
      <!-- 质量评估 -->
      <div class="section-card">
        <div class="section-head" @click="toggleSection('assess')">
          <span class="section-icon">🔍</span><strong>质量评估</strong>
          <van-button size="mini" type="info" class="section-ai-btn" :loading="loadingAssess" @click.stop="aiAssessQuality">AI评估</van-button>
          <van-icon :name="sections.assess ? 'arrow-up' : 'arrow-down'" size="14" class="expand-icon" />
        </div>
        <div v-if="sections.assess" class="section-body">
          <template v-if="assessment">
            <div class="assess-verdict">
              <van-tag size="large" :type="verdictTagType(assessment.verdict)">{{ verdictLabel(assessment.verdict) }}</van-tag>
              <span class="assess-score">{{ assessment.completeness_score ?? '--' }}/100</span>
            </div>
            <p class="assess-summary">{{ assessment.summary }}</p>
            <div v-if="assessment.issues?.length" class="assess-issues">
              <div v-for="(issue, ii) in assessment.issues" :key="ii" class="issue-item">
                <van-tag size="mini" :type="severityTagType(issue.severity)">{{ issue.severity }}</van-tag>
                <div class="issue-body"><p class="issue-summary">{{ issue.summary }}</p><p v-if="issue.repair_hint" class="issue-hint">💡 {{ issue.repair_hint }}</p></div>
              </div>
            </div>
          </template>
          <p v-else class="muted">点击"AI评估"对当前章节创作蓝图进行完整性检查。</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue';
import { showToast } from 'vant';
import { refineOutline, generateSceneCards, generateTaskSheet, assessQuality } from '../api/creativeTools.js';

const props = defineProps({ data: { type: [Array, Object], required: true }, raw: { type: String, default: '' } });
const emit = defineEmits(['update:data', 'refine', 'split']);

const isBatchMode = computed(() => Array.isArray(props.data));

const localData = ref([]);
watch(() => props.data, (val) => {
  if (Array.isArray(val)) localData.value = JSON.parse(JSON.stringify(val));
  else if (val && typeof val === 'object') localData.value = [JSON.parse(JSON.stringify(val))];
  else localData.value = [];
}, { immediate: true, deep: true });

// 批量模式
const expandedChapter = ref(null);
function toggleChapter(idx) { expandedChapter.value = expandedChapter.value === idx ? null : idx; }
function getSelected() { if (expandedChapter.value !== null && localData.value[expandedChapter.value]) return localData.value[expandedChapter.value]; return localData.value?.[0] || null; }
function onRefine() { const ch = getSelected(); if (ch) emit('refine', ch); }
function onSplit() { const ch = getSelected(); if (ch) emit('split', ch); }

// 单章模式
const activeIndex = ref(0);
const currentChapter = computed(() => { if (!localData.value.length) return createEmptyChapter(); if (!localData.value[activeIndex.value]) activeIndex.value = 0; return localData.value[activeIndex.value] || createEmptyChapter(); });
function createEmptyChapter(num) { return { chapter: num || 1, title: '', seven_part: { current_task: '', reader_expectation: '', hook_payoff: { from_chapter: 0, description: '' }, daily_transition: '', key_choice: { conflict: '', options: [], cost: '' }, chapter_change: '', hook_ledger: [] }, events: [], characters: [], conflict: '', emotional_beat: '', word_count_estimate: 2500, boundary: null, scene_cards: [], task_sheet: null }; }
function prevChapter() { if (activeIndex.value > 0) activeIndex.value--; }
function nextChapter() { if (activeIndex.value < localData.value.length - 1) activeIndex.value++; }
function addChapter() { localData.value.push(createEmptyChapter(localData.value.length + 1)); activeIndex.value = localData.value.length - 1; emitUpdate(); }
function removeChapter() { if (localData.value.length <= 1) return; localData.value.splice(activeIndex.value, 1); if (activeIndex.value >= localData.value.length) activeIndex.value = localData.value.length - 1; emitUpdate(); }
function emitUpdate() { emit('update:data', localData.value); }

// 角色/事件
const newCharacter = ref(''); const newEvent = ref('');
function addCharacter() { if (!newCharacter.value.trim()) return; if (!currentChapter.value.characters) currentChapter.value.characters = []; currentChapter.value.characters.push(newCharacter.value.trim()); newCharacter.value = ''; emitUpdate(); }
function removeCharacter(i) { currentChapter.value.characters.splice(i, 1); emitUpdate(); }
function addEvent() { if (!newEvent.value.trim()) return; if (!currentChapter.value.events) currentChapter.value.events = []; currentChapter.value.events.push(newEvent.value.trim()); newEvent.value = ''; emitUpdate(); }
function removeEvent(i) { currentChapter.value.events.splice(i, 1); emitUpdate(); }

// 选项
const newOption = ref('');
function addOption() { if (!newOption.value.trim()) return; if (!currentChapter.value.seven_part.key_choice.options) currentChapter.value.seven_part.key_choice.options = []; currentChapter.value.seven_part.key_choice.options.push(newOption.value.trim()); newOption.value = ''; emitUpdate(); }
function removeOption(i) { currentChapter.value.seven_part.key_choice.options.splice(i, 1); emitUpdate(); }

// Hook
const hookTypeOptions = [{ text: '新开', value: 'open' },{ text: '推进', value: 'advance' },{ text: '解决', value: 'resolve' },{ text: '暂缓', value: 'defer' }];
function addHook() { if (!currentChapter.value.seven_part.hook_ledger) currentChapter.value.seven_part.hook_ledger = []; currentChapter.value.seven_part.hook_ledger.push({ type: 'open', hook: '', expected_chapter: null }); emitUpdate(); }
function removeHook(i) { currentChapter.value.seven_part.hook_ledger.splice(i, 1); emitUpdate(); }

// 兑现关联
const payoffRefsText = ref('');
watch(currentChapter, (ch) => { if (ch?.boundary?.payoff_refs) payoffRefsText.value = ch.boundary.payoff_refs.join('\n'); else payoffRefsText.value = ''; }, { immediate: true });
function onPayoffRefsChange(e) { if (!currentChapter.value.boundary) currentChapter.value.boundary = {}; currentChapter.value.boundary.payoff_refs = e.target.value.split('\n').filter(Boolean); emitUpdate(); }

// 场景卡
const sceneCardsCount = computed(() => currentChapter.value.scene_cards?.length || 0);
const newMustAdvance = ref(''); const newMustPreserve = ref('');
function addSceneCard() { if (!currentChapter.value.scene_cards) currentChapter.value.scene_cards = []; const num = currentChapter.value.scene_cards.length + 1; currentChapter.value.scene_cards.push({ scene_key: 'SC' + String(num).padStart(2, '0'), title: '', purpose: '', entry_state: '', exit_state: '', must_advance: [], must_preserve: [], target_word_count: 500 }); emitUpdate(); }
function removeSceneCard(i) { currentChapter.value.scene_cards.splice(i, 1); emitUpdate(); }
function addMustAdvance(si) { if (!newMustAdvance.value.trim()) return; if (!currentChapter.value.scene_cards[si].must_advance) currentChapter.value.scene_cards[si].must_advance = []; currentChapter.value.scene_cards[si].must_advance.push(newMustAdvance.value.trim()); newMustAdvance.value = ''; emitUpdate(); }
function removeMustAdvance(si, ai) { currentChapter.value.scene_cards[si].must_advance.splice(ai, 1); emitUpdate(); }
function addMustPreserve(si) { if (!newMustPreserve.value.trim()) return; if (!currentChapter.value.scene_cards[si].must_preserve) currentChapter.value.scene_cards[si].must_preserve = []; currentChapter.value.scene_cards[si].must_preserve.push(newMustPreserve.value.trim()); newMustPreserve.value = ''; emitUpdate(); }
function removeMustPreserve(si, pi) { currentChapter.value.scene_cards[si].must_preserve.splice(pi, 1); emitUpdate(); }

// 任务单
const newAvoidItem = ref(''); const newCheckItem = ref('');
function addAvoidItem() { if (!newAvoidItem.value.trim()) return; if (!currentChapter.value.task_sheet) currentChapter.value.task_sheet = { avoid_list: [], quality_checklist: [] }; if (!currentChapter.value.task_sheet.avoid_list) currentChapter.value.task_sheet.avoid_list = []; currentChapter.value.task_sheet.avoid_list.push(newAvoidItem.value.trim()); newAvoidItem.value = ''; emitUpdate(); }
function removeAvoidItem(i) { currentChapter.value.task_sheet.avoid_list.splice(i, 1); emitUpdate(); }
function addCheckItem() { if (!newCheckItem.value.trim()) return; if (!currentChapter.value.task_sheet) currentChapter.value.task_sheet = { avoid_list: [], quality_checklist: [] }; if (!currentChapter.value.task_sheet.quality_checklist) currentChapter.value.task_sheet.quality_checklist = []; currentChapter.value.task_sheet.quality_checklist.push(newCheckItem.value.trim()); newCheckItem.value = ''; emitUpdate(); }
function removeCheckItem(i) { currentChapter.value.task_sheet.quality_checklist.splice(i, 1); emitUpdate(); }

// 滑块
function onSliderChange(field, event) { if (!currentChapter.value.boundary) currentChapter.value.boundary = {}; currentChapter.value.boundary[field] = Number(event.target.value); emitUpdate(); }

// 折叠
const sections = reactive({ basic: true, sevenPart: true, boundary: true, advanced: false, sceneCards: true, taskSheet: true, assess: false });
function toggleSection(key) { sections[key] = !sections[key]; }

// AI操作状态
const loadingBoundary = ref(false); const loadingScenes = ref(false); const loadingTask = ref(false); const loadingAssess = ref(false);
function onRefineSingle() { const ch = currentChapter.value; if (ch) emit('refine', ch); }

async function aiGenerateBoundary() {
  loadingBoundary.value = true;
  try {
    const result = await refineOutline('detailed_outline', { original_data: currentChapter.value, mode: 'overall', direction: 'overall', extra_instruction: '请特别关注章节边界合同部分' });
    if (result.type === 'json' && Array.isArray(result.data) && result.data[0]) {
      if (result.data[0].boundary) currentChapter.value.boundary = { ...currentChapter.value.boundary, ...result.data[0].boundary };
      if (result.data[0].seven_part) currentChapter.value.seven_part = { ...currentChapter.value.seven_part, ...result.data[0].seven_part };
      emitUpdate();
    }
    showToast('边界合同已生成');
  } catch (e) { showToast('生成失败: ' + (e.message || '未知错误')); }
  finally { loadingBoundary.value = false; }
}

async function aiGenerateSceneCards() {
  loadingScenes.value = true;
  try {
    const result = await generateSceneCards({ tool_key: 'detailed_outline', chapter_data: currentChapter.value });
    if (result.type === 'json' && Array.isArray(result.data)) { currentChapter.value.scene_cards = result.data; emitUpdate(); showToast('已生成' + result.data.length + '个场景卡'); }
  } catch (e) { showToast('生成失败: ' + (e.message || '未知错误')); }
  finally { loadingScenes.value = false; }
}

async function aiGenerateTaskSheet() {
  loadingTask.value = true;
  try {
    const result = await generateTaskSheet({ tool_key: 'detailed_outline', chapter_data: currentChapter.value });
    if (result.type === 'json') { currentChapter.value.task_sheet = result.data; emitUpdate(); showToast('任务单已生成'); }
  } catch (e) { showToast('生成失败: ' + (e.message || '未知错误')); }
  finally { loadingTask.value = false; }
}

const assessment = ref(null);
async function aiAssessQuality() {
  loadingAssess.value = true;
  try {
    const result = await assessQuality({ tool_key: 'detailed_outline', chapter_data: currentChapter.value });
    if (result.type === 'json') { assessment.value = result.data; showToast('评估完成'); }
  } catch (e) { showToast('评估失败: ' + (e.message || '未知错误')); }
  finally { loadingAssess.value = false; }
}

function verdictTagType(v) { return { ready: 'success', repairable: 'warning', incomplete: 'danger' }[v] || ''; }
function verdictLabel(v) { return { ready: '✅ 就绪', repairable: '⚠ 需修复', incomplete: '❌ 不完整' }[v] || v; }
function severityTagType(s) { return { high: 'danger', medium: 'warning', low: '' }[s] || ''; }
function hookTagType(type) { return { open: 'primary', advance: 'warning', resolve: 'success', defer: '' }[type] || ''; }
function hookLabel(type) { return { open: '新开', advance: '推进', resolve: '解决', defer: '暂缓' }[type] || type; }
</script>

<style scoped>
.doe-root { display: grid; gap: 10px; }
/* 批量模式 */
.doe-toolbar { display: flex; gap: 8px; flex-wrap: wrap; }
.doe-chapters { display: grid; gap: 8px; }
.doe-chapter { background: #fff; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.doe-ch-header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: #fafafa; cursor: pointer; flex-wrap: wrap; }
.doe-ch-header .ch-num { font-size: 13px; color: var(--accent); font-weight: 700; }
.doe-ch-header strong { font-size: 15px; flex: 1; }
.wc { font-size: 11px; color: var(--muted); }
.expand-icon { color: var(--muted); flex-shrink: 0; }
.doe-quick { padding: 6px 12px; margin: 0; font-size: 13px; color: var(--muted); }
.doe-seven { padding: 0 12px 12px; display: grid; gap: 8px; }
.seg { padding: 8px; background: #f8fafc; border-radius: 6px; border-left: 3px solid #e0e0e0; }
.seg-choice { border-left-color: var(--accent); }
.seg-label { font-size: 12px; font-weight: 600; color: var(--accent); display: block; margin-bottom: 4px; }
.seg p { font-size: 13px; margin: 2px 0; line-height: 1.6; color: var(--ink); }
.hook-list { display: flex; flex-direction: column; gap: 4px; }
.hook-item { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.hook-text { flex: 1; color: var(--ink); }
.hook-ch { font-size: 11px; color: var(--accent); }
.seg-meta { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: var(--muted); padding: 4px 0; }
/* 单章深度模式 */
.ch-nav { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px 0; }
.nav-label { font-size: 14px; font-weight: 600; flex: 1; text-align: center; min-width: 100px; }
.nav-actions { display: flex; gap: 4px; margin-left: auto; }
.section-card { background: #fff; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.section-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: #fafafa; cursor: pointer; flex-wrap: wrap; }
.section-icon { font-size: 16px; }
.section-head strong { font-size: 14px; flex: 1; }
.section-ai-btn { margin-right: 4px; }
.badge { background: var(--accent); color: #fff; font-size: 11px; padding: 1px 6px; border-radius: 10px; font-weight: 600; }
.section-body { padding: 8px 12px 12px; display: grid; gap: 0; }
.muted { color: var(--muted); font-style: italic; font-size: 13px; padding: 8px 0; text-align: center; }
/* 字段行 */
.field-row { padding: 8px 12px; }
.row-label { font-size: 12px; color: var(--muted); display: block; margin-bottom: 6px; font-weight: 500; }
.chip-input { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.chip-add { border: 1px dashed #ccc; border-radius: 12px; padding: 4px 10px; font-size: 13px; outline: none; min-width: 80px; flex: 1; background: transparent; }
.chip-add:focus { border-color: var(--accent); }
/* 7段式编辑 */
.seven-card { padding: 8px 0; border-bottom: 1px solid #f5f5f5; }
.seven-card:last-child { border-bottom: none; }
.seven-choice { background: #fefaf0; margin: 4px 0; border-radius: 6px; padding: 8px; border-bottom: none; border-left: 3px solid var(--accent); }
.seg-num { font-size: 12px; font-weight: 600; color: var(--accent); display: block; margin-bottom: 4px; }
.seg-input { width: 100%; border: 1px solid #eee; border-radius: 6px; padding: 6px 10px; font-size: 13px; line-height: 1.6; resize: vertical; font-family: inherit; box-sizing: border-box; }
.seg-input:focus { border-color: var(--accent); outline: none; }
.seg-hook-payoff { display: grid; gap: 4px; }
/* Hook编辑 */
.hook-ledger-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.hook-edit-row { display: flex; align-items: center; gap: 4px; padding: 4px 0; }
.hook-edit-input { flex: 1; border: 1px solid #eee; border-radius: 4px; padding: 4px 6px; font-size: 12px; min-width: 0; }
.hook-edit-input:focus { border-color: var(--accent); outline: none; }
.hook-edit-num { width: 50px; border: 1px solid #eee; border-radius: 4px; padding: 4px; font-size: 12px; text-align: center; }
.hook-edit-num:focus { border-color: var(--accent); outline: none; }
/* 滑块 */
.slider-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; }
.slider-label { font-size: 13px; color: var(--ink); min-width: 60px; }
.slider-val { font-size: 13px; font-weight: 600; color: var(--accent); min-width: 30px; text-align: right; }
.range-slider { flex: 1; accent-color: var(--accent); }
/* 场景卡 */
.scene-card-item { border: 1px solid #e8e8e8; border-radius: 8px; margin-bottom: 8px; overflow: hidden; background: #fafbfc; }
.scene-card-head { display: flex; align-items: center; gap: 6px; padding: 8px; background: #f0f4ff; }
.scene-key { font-size: 11px; font-weight: 700; color: #fff; background: var(--accent); padding: 2px 8px; border-radius: 4px; white-space: nowrap; }
.scene-title-input { flex: 1; border: none; background: transparent; font-size: 13px; font-weight: 600; outline: none; padding: 2px 4px; }
.scene-title-input:focus { border-bottom: 1px solid var(--accent); }
.scene-card-body { padding: 6px 8px; display: grid; gap: 0; }
/* 评估 */
.assess-verdict { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
.assess-score { font-size: 24px; font-weight: 700; color: var(--accent); }
.assess-summary { font-size: 14px; color: var(--ink); margin: 4px 0; line-height: 1.6; }
.assess-issues { display: grid; gap: 6px; margin-top: 8px; }
.issue-item { display: flex; gap: 8px; align-items: flex-start; padding: 8px; background: #f8fafc; border-radius: 6px; }
.issue-body { flex: 1; }
.issue-summary { font-size: 13px; margin: 0 0 2px; line-height: 1.5; }
.issue-hint { font-size: 12px; color: var(--muted); margin: 2px 0 0; }
</style>
