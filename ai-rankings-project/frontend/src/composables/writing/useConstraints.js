import { ref, computed } from 'vue';

/**
 * AI 修改约束系统
 * 提供结构化的修改约束，确保 AI 改写不偏离原意
 */
export function useConstraints() {
  const constraints = ref({
    keepFacts: true,           // 保留现有剧情事实
    keepPov: true,              // 保持叙事视角和人称
    noUnauthorizedSetting: true, // 不新增未授权设定
    preserveCoreInfo: true,     // 保留核心信息
  });

  const advancedOpen = ref(false);

  const constraintLabels = {
    keepFacts: '保留剧情事实',
    keepPov: '保持视角人称',
    noUnauthorizedSetting: '不新增设定',
    preserveCoreInfo: '保留核心信息',
  };

  const constraintDescriptions = {
    keepFacts: '不修改已发生的剧情事件和因果关系',
    keepPov: '保持当前章节的叙事人称和视角不变',
    noUnauthorizedSetting: '不引入原文未提及的新设定、新角色或新规则',
    preserveCoreInfo: '保留原文的关键信息和重要细节',
  };

  const enabledCount = computed(() =>
    Object.values(constraints.value).filter(Boolean).length
  );

  function buildConstraintsText() {
    const lines = [];
    if (constraints.value.keepFacts) lines.push('- 保留现有剧情事实，不修改已发生的事件');
    if (constraints.value.keepPov) lines.push('- 保持当前人称与叙事视角');
    if (constraints.value.noUnauthorizedSetting) lines.push('- 不新增未授权设定、角色或规则');
    if (constraints.value.preserveCoreInfo) lines.push('- 尽量保留原段核心信息');
    return lines.join('\n');
  }

  function buildConstraintsPayload() {
    return { ...constraints.value };
  }

  function toggleConstraint(key) {
    constraints.value[key] = !constraints.value[key];
  }

  function resetConstraints() {
    constraints.value = {
      keepFacts: true,
      keepPov: true,
      noUnauthorizedSetting: true,
      preserveCoreInfo: true,
    };
  }

  return {
    constraints,
    advancedOpen,
    constraintLabels,
    constraintDescriptions,
    enabledCount,
    buildConstraintsText,
    buildConstraintsPayload,
    toggleConstraint,
    resetConstraints,
  };
}
