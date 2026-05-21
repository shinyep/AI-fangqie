import { computed } from 'vue';

const aiFunctions = [
  {
    key: 'write',
    label: 'AI写作',
    title: 'AI写作',
    description: '一般用于章节正文写作',
    mode: 'generate',
    variants: [
      { key: 'chapter', label: '单章正文', instruction: '根据剧情片段生成完整单章正文，包含开场承接、冲突推进、人物互动和结尾钩子。直接输出正文。' },
      { key: 'opening', label: '黄金开篇', instruction: '生成适合网文首章的强钩子开篇，前三段快速给出主角处境、矛盾、期待感和类型卖点。直接输出正文。' },
      { key: 'from-outline', label: '按纲成文', instruction: '严格按用户提供的章纲或细纲写成正文，不新增偏离主线的大剧情，补足动作、对白、心理和转场。' },
      { key: 'climax', label: '高潮爆点', instruction: '围绕当前剧情写高潮段落，强化冲突升级、反转、情绪释放和追读钩子。直接输出正文。' },
    ],
  },
  {
    key: 'title',
    label: '章节起名',
    title: '章节起名',
    description: '根据章节内容自动生成吸引读者的标题',
    mode: 'expand',
    sourceLabel: '章节内容',
    defaultAction: 'title',
    instruction: '你正在执行"章节起名"。根据章节正文内容，提炼出简洁有力、吸引读者的章节标题（15字以内），抓住本章核心爽点或钩子。只输出标题文本，不要任何解释或标记。',
  },
  {
    key: 'character',
    label: 'AI扩写润色',
    title: 'AI扩写润色',
    description: '对划选段落或正文进行扩写、润色、精炼',
    mode: 'expand',
    sourceLabel: '扩写文本',
    defaultAction: 'expand',
    variants: [
      { key: 'expand-detail', label: '细节扩写', action: 'expand', instruction: '在不改变剧情的前提下，补足动作、环境、心理、五感和对白，让段落更饱满。' },
      { key: 'polish-style', label: '文笔润色', action: 'polish', instruction: '优化句式、节奏、画面感和代入感，保留原剧情信息与叙事视角。' },
      { key: 'shorten-clean', label: '精炼压缩', action: 'shorten', instruction: '删掉重复和水词，保留核心情节、有效信息和关键情绪。' },
      { key: 'dialogue', label: '对白强化', action: 'polish', instruction: '强化人物对白、潜台词和互动节奏，让人物关系更鲜明。' },
    ],
  },
  {
    key: 'continue',
    label: 'AI续写正文',
    title: 'AI续写正文',
    description: '基于当前章节内容继续写作',
    mode: 'continue',
    variants: [
      { key: 'natural', label: '自然续写', instruction: '承接前文语气、人设、视角和伏笔，平滑推进下一段剧情。直接输出续写正文。' },
      { key: 'outline-follow', label: '按纲续写', instruction: '优先遵守用户补充的后续章纲或剧情走向，避免使用超纲剧情。直接输出续写正文。' },
      { key: 'hook', label: '追读钩子', instruction: '续写时重点制造悬念、误会、反转或新危机，结尾必须留下强追读点。' },
      { key: 'dialogue-drive', label: '对话推进', instruction: '以人物对话和动作反应推动剧情，减少解释性叙述，保持节奏紧凑。' },
    ],
  },
  {
    key: 'outline',
    label: '章纲',
    title: '续写章纲',
    description: '根据剧情片段生成章节大纲',
    mode: 'generate',
    instruction: '你正在执行"章纲生成"。只输出章节大纲，不写正文。根据用户提供的剧情、设定或标题，拆成可连载的分章方案；每章包含章节名、核心事件、人物冲突、爽点/情绪点、伏笔与结尾钩子。若用户指定章数，严格按指定章数；未指定时生成3-10章。',
    variants: [
      { key: 'single', label: '单章章纲', instruction: '输出1章详细章纲，包含本章目标、开场、冲突、转折、高潮、结尾钩子和写作注意事项。' },
      { key: 'multi', label: '多章续写', instruction: '根据前文和后续方向生成连续多章章纲，每章都要有爽点、冲突推进、伏笔回收或新伏笔。' },
      { key: 'fix', label: '章纲纠错', instruction: '检查章纲是否跑偏、设定冲突、动机不足、节奏断档或爽点缺失，并给出修正版章纲。' },
      { key: 'merge', label: '章纲融合', instruction: '将多个剧情点、参考章纲或碎片灵感融合成连贯章纲，保留核心卖点并重排节奏。' },
    ],
  },
  {
    key: 'arrange',
    label: 'AI排书',
    title: 'AI排书',
    description: '梳理章节节奏和后续安排',
    mode: 'generate',
    instruction: '你正在执行"AI排书"。不要写正文。请像网文责编一样梳理整本书或当前阶段的排书方案：提炼卖点与主线，划分卷/阶段，安排高潮、转折、追读钩子和关键伏笔，指出节奏风险，并给出后续章节排布表。',
    variants: [
      { key: 'book-structure', label: '全书排布', instruction: '输出整本书结构：核心卖点、主线目标、阶段目标、卷/篇章划分、关键高潮和终局方向。' },
      { key: 'stage', label: '阶段规划', instruction: '围绕当前剧情阶段安排10-30章推进表，明确每阶段任务、冲突升级和读者期待。' },
      { key: 'rhythm', label: '节奏表', instruction: '按章节表分析或设计节奏，标注铺垫、爆点、反转、缓冲、钩子和风险位置。' },
      { key: 'follow', label: '追读优化', instruction: '专门优化追读：指出掉追读的位置，重排章节钩子、冲突密度和结尾悬念。' },
    ],
  },
  {
    key: 'review',
    label: 'AI审稿',
    title: 'AI审稿（专业版）',
    description: '结构化评分、专项审计与智能修复',
    mode: 'review',
    sourceLabel: '待审文本',
    defaultAction: 'review',
    instruction: '你正在执行"AI审稿"。从连贯性、重复率、节奏、文风、追读感、综合进行6维结构化评分，输出问题清单和修复建议。',
    variants: [
      { key: 'full', label: '综合审稿', instruction: '从题材匹配、剧情逻辑、人设、节奏、爽点、文笔、追读风险进行完整审稿，先给结论再列问题。' },
      { key: 'poison', label: '毒点排查', instruction: '重点找读者可能弃文的毒点：降智、憋屈、动机崩、信息误导、节奏拖、爽点落空，并给替代方案。' },
      { key: 'logic', label: '逻辑设定', instruction: '重点检查时间线、能力体系、人物动机、因果链、伏笔承接和设定一致性。' },
      { key: 'rhythm-score', label: '爽点节奏', instruction: '给章节爽点和节奏打分，标注高光、低谷、拖沓段和可前置/压缩的位置。' },
    ],
  },
  {
    key: 'correct',
    label: 'AI纠错',
    title: 'AI纠错',
    description: '修正错别字、病句和不顺表达',
    mode: 'polish',
    sourceLabel: '待检测文本',
    defaultAction: 'polish',
    instruction: '你正在执行"AI纠错"。只修正错别字、标点、语病、重复词、称谓不一致和轻微逻辑硬伤；尽量保留原文句式、信息和文风，不新增剧情。输出修正后的文本，末尾可简短列出关键修改点。',
    variants: [
      { key: 'typo', label: '错字标点', instruction: '只修正错别字、漏字、多字、标点和明显格式问题，不改写文风。' },
      { key: 'sentence', label: '病句通顺', instruction: '修正不通顺句子、语序混乱、主谓宾不清和重复表达，尽量保留原句意思。' },
      { key: 'consistency', label: '称谓统一', instruction: '检查人物称谓、地名、物品名、境界名、时间线和前后表述是否一致，并修正。' },
      { key: 'light-logic', label: '细节核对', instruction: '检查轻微逻辑问题和细节硬伤，能直接修的直接修，不能直接修的在末尾列出建议。' },
    ],
  },
  {
    key: 'remove',
    label: 'AI去痕',
    title: 'AI去痕',
    description: '降低机械感，让文本更自然',
    mode: 'polish',
    sourceLabel: '待去痕文本',
    defaultAction: 'polish',
    instruction: '你正在执行"AI去痕"。目标是降低模板腔、机械衔接和过度工整的AI味。保留剧情事实与人物关系，调整句长节奏、口语自然度、动作细节和情绪递进，让文本更像人工创作；不要改变核心剧情。',
    variants: [
      { key: 'ai-trace', label: '去AI味', instruction: '重点消除模板化表达、过度总结、机械转折和空泛形容，让叙述更自然。' },
      { key: 'short-lines', label: '短句节奏', instruction: '把过长、过满的句子拆成适合网文阅读的短句和段落，增强阅读流畅度。' },
      { key: 'human-detail', label: '真人细节', instruction: '补入少量贴近人物处境的动作、反应和感官细节，避免泛泛而谈。' },
      { key: 'voice', label: '口吻贴合', instruction: '根据人物身份和场景调整口吻，减少同质化语气，让对白和心理更像角色本人。' },
    ],
  },
  {
    key: 'more',
    label: '更多AI工具',
    title: '更多AI工具',
    description: '扩写、润色或精简当前正文',
    mode: 'expand',
    sourceLabel: '处理文本',
    defaultAction: 'expand',
    instruction: '你正在执行"更多AI工具"。根据用户选择的处理方式执行：扩写时增加细节和情绪层次；润色时提升表达质量；精炼时删减冗余。始终保留原意、人设、视角和剧情走向。',
    variants: [
      { key: 'expand', label: '扩写', action: 'expand', instruction: '扩写原文，补足细节、氛围、动作和心理，字数增加但剧情不跑偏。' },
      { key: 'polish', label: '润色', action: 'polish', instruction: '润色原文，提升文笔、节奏和画面感，字数基本持平。' },
      { key: 'shorten', label: '精简', action: 'shorten', instruction: '精简原文，删水词、重复和低效信息，保留核心剧情。' },
      { key: 'style-copy', label: '文风改写', action: 'polish', instruction: '按用户补充要求改写文风，例如更爽、更细腻、更口语、更紧张，但不改变剧情。' },
    ],
  },
  {
    key: 'script',
    label: '剧本改编',
    title: '剧本改编',
    description: '将正文调整成更适合剧本表达的形式',
    mode: 'polish',
    sourceLabel: '待改编文本',
    defaultAction: 'polish',
    instruction: '你正在执行"剧本改编"。把小说正文改成剧本格式，不做普通润色。输出应包含场次/场景、人物、动作提示、对白和必要镜头/舞台说明；保留原剧情和人物关系，不新增大段无关剧情。',
    variants: [
      { key: 'short-drama', label: '短剧剧本', instruction: '将小说正文改成短剧剧本，按场次输出，突出前三秒钩子、冲突、反转和每场结尾悬念。' },
      { key: 'scene-outline', label: '分场大纲', instruction: '不写完整对白，输出分场大纲：场景、人物、事件、冲突、情绪变化和转场。' },
      { key: 'dialogue-script', label: '对白剧本', instruction: '重点改成可表演对白，保留必要动作提示，减少旁白和心理独白。' },
      { key: 'shot-list', label: '分镜提示', instruction: '输出适合拍摄的分镜提示：镜头、画面、动作、台词、音效/节奏点。' },
    ],
  },
];

const textProcessActions = [
  { value: 'expand', label: '扩写' },
  { value: 'polish', label: '润色' },
  { value: 'shorten', label: '精炼' },
];
const AI_SOURCE_LIMIT = 5000;

export function useAiConfig() {
  function createActiveConfig(activeAiKeyRef, aiFormRef) {
    const activeAiConfig = computed(() => aiFunctions.find((item) => item.key === activeAiKeyRef.value) || aiFunctions[0]);
    const activeToolVariants = computed(() => activeAiConfig.value.variants || []);
    const activeToolVariant = computed(() => activeToolVariants.value.find((item) => item.key === aiFormRef.toolVariant) || activeToolVariants.value[0] || null);
    const isTextProcessMode = computed(() => ['expand', 'polish'].includes(activeAiConfig.value.mode));
    const isCorrectionTool = computed(() => activeAiConfig.value.key === 'correct');
    const isOutlineTool = computed(() => activeAiConfig.value.key === 'outline');
    const showVariantSelector = computed(() => activeToolVariants.value.length && !['outline', 'correct', 'remove'].includes(activeAiConfig.value.key));
    const showTextProcessActions = computed(() => ['character', 'more'].includes(activeAiConfig.value.key));
    const requirementLabel = computed(() => {
      const labels = {
        title: '起名要求',
        outline: '续写要求',
        review: '审稿要求',
        remove: '去痕要求',
        script: '改编要求',
      };
      return labels[activeAiConfig.value.key] || (isTextProcessMode.value ? '处理要求' : '写作要求');
    });
    const runButtonText = computed(() => {
      if (activeAiConfig.value.key === 'correct') return '检查';
      return '生成';
    });

    return {
      activeAiConfig,
      activeToolVariants,
      activeToolVariant,
      isTextProcessMode,
      isCorrectionTool,
      isOutlineTool,
      showVariantSelector,
      showTextProcessActions,
      requirementLabel,
      runButtonText,
    };
  }

  return { aiFunctions, textProcessActions, AI_SOURCE_LIMIT, createActiveConfig };
}
