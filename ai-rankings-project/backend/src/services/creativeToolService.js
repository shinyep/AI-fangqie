import { getAIConfig, listProviders } from './aiConfigService.js';

export function listModels() {
  const providers = listProviders();
  return providers
    .filter(p => p.isConfigured)
    .map(p => ({
      provider: p.provider,
      displayName: p.displayName,
      defaultModel: p.defaultModel || '',
      models: p.builtinModels || [],
    }));
}

const TOOLS = {
  book_title: {
    name: '书名生成器',
    description: '生成吸引人的小说书名，支持原创和风格仿写',
    inputs: [
      { key: 'mode', label: '生成模式', type: 'radio', options: ['原创生成', '风格仿写'], default: '原创生成' },
      { key: 'theme', label: '题材主题', type: 'textarea', placeholder: '如：都市修仙、穿越重生、系统流...', rows: 2, showWhen: { mode: '原创生成' } },
      { key: 'style', label: '风格偏好', type: 'select', placeholder: '选择书名风格', required: false, options: ['霸气', '文艺', '幽默', '悬疑', '热血', '唯美', '简约'], showWhen: { mode: '原创生成' } },
      { key: 'target_audience', label: '目标读者', type: 'radio', required: false, options: ['男频', '女频', '男女通吃'], showWhen: { mode: '原创生成' } },
      { key: 'word_length', label: '书名长度', type: 'select', placeholder: '不限', required: false, options: ['3字', '4字', '5-7字', '不限'], showWhen: { mode: '原创生成' } },
      { key: 'ref_text', label: '参考书名', type: 'textarea', placeholder: '贴上你想要模仿风格的书名（可多个）...', rows: 2, showWhen: { mode: '风格仿写' } },
      { key: 'ref_style', label: '你的故事设定', type: 'textarea', placeholder: '简要描述你的故事核心...', rows: 2, showWhen: { mode: '风格仿写' } },
      { key: 'similarity', label: '仿写程度', type: 'radio', required: false, options: ['高度模仿(保留句式)', '中等借鉴(保留结构)', '只取风格(全新创作)'], showWhen: { mode: '风格仿写' } },
      { key: 'count', label: '生成数量', type: 'stepper', min: 3, max: 15, default: 8 },
    ],
    systemPrompt: `你是一位资深网文编辑，擅长为小说取名。请根据以下要求生成书名。

## 书名规则
1. 2-7个字为主，好记有辨识度
2. 体现核心卖点或金手指
3. 符合目标平台的读者偏好
4. 避免生僻字和歧义
5. 搭配2-3个关键词标签，便于读者搜索发现

## 输出格式
生成{count}个书名，JSON数组格式：
[
  {
    "title": "书名",
    "reason": "推荐理由（20字内）",
    "keywords": ["关键词1", "关键词2"],
    "style_tags": ["风格标签1", "风格标签2"],
    "market_appeal": "市场吸引力简述（20字内）"
  }
]`,
    count: 8,

    // 风格仿写模式专用
    rewritePrompt: `你是一位网文编辑，擅长分析书名风格并进行仿写创作。

## 仿写规则
1. 分析参考书名的命名规律（句式结构/用词特征/卖点表达方式/情感调性）
2. 提取核心仿写模式（如"XX之XX"、"从XX开始"、"我XX"等句式模板）
3. 保持相似的命名风格和语气，但用你的设定内容替换
4. 避免直接抄袭已存在的书名

## 输出格式
生成{count}个仿写书名，JSON格式：
[
  {
    "title": "仿写书名",
    "reason": "仿写思路（30字内）",
    "analysis": "对参考书名风格的分析（30字内）",
    "technique": "仿写手法（如：句式复用/卖点重映射/情绪对位）",
    "structure_similarity": "与参考书名的结构相似度（高/中/低）"
  }
]`,
  },

  synopsis: {
    name: '简介生成器',
    description: '生成吸引读者的小说简介，支持原创和风格仿写',
    inputs: [
      { key: 'mode', label: '生成模式', type: 'radio', options: ['原创生成', '风格仿写'], default: '原创生成' },
      { key: 'theme', label: '故事概要', type: 'textarea', placeholder: '简要描述你的故事设定和主线...', rows: 3, showWhen: { mode: '原创生成' } },
      { key: 'style', label: '简介风格', type: 'radio', required: false, options: ['悬念版', '卖点版', '情感版', '反转版', '混合多版本'], showWhen: { mode: '原创生成' } },
      { key: 'tone', label: '情感基调', type: 'select', placeholder: '不限', required: false, options: ['热血爽朗', '悬疑紧张', '轻松搞笑', '虐恋深情', '冷静克制'], showWhen: { mode: '原创生成' } },
      { key: 'ref_text', label: '参考简介', type: 'textarea', placeholder: '贴上你想模仿风格的简介文案...', rows: 3, showWhen: { mode: '风格仿写' } },
      { key: 'ref_style', label: '你的故事概要', type: 'textarea', placeholder: '简要描述你的故事核心设定...', rows: 2, showWhen: { mode: '风格仿写' } },
      { key: 'strategy_mode', label: '文案策略', type: 'radio', required: false, options: ['悬念导向', '卖点导向', '情感导向', '反转导向'], showWhen: { mode: '风格仿写' } },
      { key: 'count', label: '生成版本数', type: 'stepper', min: 2, max: 6, default: 3 },
    ],
    systemPrompt: `你是一位资深网文编辑，擅长撰写小说简介。请根据故事概要生成吸引人的简介。

## 简介规则
1. 200-400字，简洁有力
2. 开头抛出悬念或亮点，1-2句话抓住注意力
3. 中间概述核心设定和金手指
4. 末尾引导期待，让读者想点开看
5. 适当使用问句和转折

## 输出格式
生成{count}个不同风格的版本，JSON数组：
[
  {
    "version_type": "悬念版/卖点版/情感版/反转版",
    "title": "简介标题（可选）",
    "content": "简介正文",
    "strategy": "本版本采用的策略简述（30字内）"
  }
]`,
    count: 3,

    rewritePrompt: `你是一位网文编辑和文案专家。请根据参考简介的风格，结合你的故事概要，仿写多版本简介。

## 仿写要求
1. 分析参考简介的句式结构、节奏感、卖点表达方式
2. 保持相似的文案风格和语气
3. 将你的故事要素融入相同的表达框架
4. 每版200-400字，提供不同的文案策略

## 输出格式
生成{count}个不同策略的版本，JSON数组：
[
  {
    "version_type": "悬念版/卖点版/情感版/反转版",
    "content": "仿写简介正文",
    "approach": "本版采用的文案策略说明（30字内）"
  }
]`,
  },

  outline: {
    name: '大纲生成器',
    description: '生成完整的故事大纲框架',
    inputs: [
      { key: 'theme', label: '故事概念', type: 'textarea', placeholder: '描述你的核心创意、故事方向和核心冲突...', rows: 4 },
      { key: 'style', label: '作品类型', type: 'select', options: ['传统玄幻', '东方仙侠', '异世大陆', '高武世界', '末世求生', '星际科幻', '都市生活', '都市异能', '悬疑灵异', '盗墓探险', '推理侦探', '游戏电竞', '网游竞技', '历史架空', '王朝争霸', '古代言情', '现代言情', '纯爱耽美', '二次元轻小说', '无限流', '系统流', '种田经商', '赘婿逆袭', '兵王回归', '神医鉴宝', '奶爸萌娃', '求生直播', '其他自定义...'] },
      { key: 'volume_count', label: '卷数规划', type: 'stepper', min: 2, max: 8, default: 4 },
      { key: 'word_count_estimate', label: '预估字数', type: 'radio', required: false, options: ['20万字以下', '50万字', '100万字', '200万字以上'] },
      { key: 'pacing_preference', label: '节奏偏好', type: 'radio', required: false, options: ['快节奏爽文', '慢热铺垫', '张弛有度'] },
      { key: 'protagonist_brief', label: '主角简述（可选）', type: 'textarea', placeholder: '主角身份、性格、目标和金手指...', rows: 3, required: false },
      { key: 'world_setting', label: '世界观设定（可选）', type: 'textarea', placeholder: '世界观、势力分布、修炼体系...', rows: 3, required: false },
      { key: 'core_conflict', label: '核心矛盾（可选）', type: 'textarea', placeholder: '故事的核心冲突是什么...', rows: 2, required: false },
      { key: 'reference_style', label: '参考风格（可选）', type: 'textarea', placeholder: '参考作品的风格特点...', rows: 2, required: false },
    ],
    systemPrompt: `你是一位资深网文编辑和内容策划专家。请根据故事概念生成一个完整的故事大纲，采用五层规划结构。内容必须丰富具体，拒绝空洞。

# 大纲结构（五层规划）

## 第一层：故事宏观
- logline：一句话梗概（30字内，必须包含冲突和悬念）
- core_appeal：核心卖点（50字内，说清为什么读者会追读）
- theme：主题关键词（2-3个）
- target_audience：目标读者群

## 第二层：卷规划
将故事分为{count}卷，每卷包含：
- 卷标题、核心承诺（本卷看点，吸引读者继续追读）
- 升级模式（主角在本卷的成长路径，具体方式）
- 主角变化（主角在本卷结束时发生了哪些内在/外在变化）
- 卷末高潮（本卷最高潮的情节描述）
- 下一卷钩子（如何引导读者进入下一卷）

## 第三层：节奏板
每卷拆分为3-5个节奏段（起/承/转/合），每段包含：
- 标签（如铺垫、爆发、转折、高潮）
- 摘要（50-80字，具体描述本段剧情推进）
- 章节跨度（如第1-3章）
- 必须交付项（本段必须完成的剧情任务，至少2条）

## 第四层：章节列表
每段下列出具体章节，每章包含：
- 章节标题（吸引人的标题，10字以内）
- 一句话概要（30字以内）
- 核心冲突（10字以内）
- 关键事件（2-4个本章发生的核心事件）
- 出场角色（2-4个本章出场的主要角色名字）
- 情感基调（紧张/轻松/悲伤/热血/悬疑等）
- 预估字数（2000-4000之间）
- 章节钩子（本章末尾如何钩住读者继续读下一章）

## 第五层：章节细化（可选）
预留章节细化key，后续可展开

## 输出格式
同时输出两个版本：
1. **Markdown版本**：可读的五层规划文本（800-1200字，内容充实）
2. **JSON版本**：结构化数据，格式如下：
{
  "macro": { "logline": "...", "core_appeal": "...", "theme": "...", "target_audience": "..." },
  "volumes": [{
    "volume": 1, "title": "...", "main_promise": "...", "escalation_mode": "...",
    "protagonist_change": "...", "climax": "...", "next_volume_hook": "...",
    "beats": [
      { "label": "...", "summary": "...", "chapter_span": "1-3", "deliverables": ["...", "..."] }
    ],
    "chapters": [
      {
        "chapter": 1, "title": "...", "summary": "...", "conflict": "...",
        "key_events": ["事件1", "事件2"],
        "characters": ["角色1", "角色2"],
        "emotional_beat": "紧张",
        "word_count_estimate": 3000,
        "hook": "..."
      }
    ]
  }]
}

注意：{count}默认根据故事规模自动判断（短篇2-3卷、中篇4-6卷、长篇7+卷），可根据用户指定调整。每个字段都必须填写，不允许留空或填"无"。`,
    count: 4,
  },

    detailed_outline: {
    name: '细纲生成器',
    description: '为单章生成深度结构化细纲，含7段式结构、场景卡拆解、任务单和边界合同',
    inputs: [
      { key: 'mode', label: '生成模式', type: 'radio', options: ['批量生成多章', '单章深度编排'], default: '单章深度编排', help: '批量：一次生成多章7段式细纲；单章：逐章深度编辑，含场景卡拆解、任务单、边界合同等' },
      { key: 'theme', label: '已有大纲', type: 'textarea', placeholder: '贴上你已有的故事大纲或章节概要...', rows: 4, showWhen: { mode: '批量生成多章' } },
      { key: 'focus', label: '细化侧重', type: 'radio', required: false, options: ['全面均衡', '冲突深化', '角色弧光', '节奏优化'], showWhen: { mode: '批量生成多章' } },
      { key: 'chapters', label: '章节数', type: 'stepper', min: 3, max: 30, default: 10, showWhen: { mode: '批量生成多章' } },
      { key: 'start_chapter', label: '起始章节号', type: 'stepper', min: 1, max: 20, default: 1, showWhen: { mode: '批量生成多章' } },
      { key: 'single_theme', label: '本章概要', type: 'textarea', placeholder: '描述本章要写什么：上一章结尾状态、本章核心事件、本章需要推进的主线...', rows: 4, showWhen: { mode: '单章深度编排' } },
      { key: 'chapter_context', label: '前后文背景（可选）', type: 'textarea', placeholder: '前一章简述、当前卷位置、前文未兑现的钩子...', rows: 3, required: false, showWhen: { mode: '单章深度编排' } },
      { key: 'chapter_number', label: '章节序号', type: 'stepper', min: 1, max: 999, default: 1, showWhen: { mode: '单章深度编排' } },
      { key: 'deep_scope', label: '深度编排范围', type: 'radio', options: ['完整版(含场景卡+任务单)', '标准版(7段式+边界合同)', '精简版(仅7段式)'], default: '完整版(含场景卡+任务单)', showWhen: { mode: '单章深度编排' }, help: '完整版输出场景卡拆解和执行任务单；标准版输出7段式细纲和边界合同；精简版仅输出7段式细纲' },
    ],
    systemPrompt: `你是一位资深网文策划，擅长为每一章设计精密的结构化细纲。请根据故事大纲，为每章生成7段式细纲。

## 7段式细纲结构

### 1. 当前任务 (current_task)
本章要完成的核心叙事任务（一句话说清）

### 2. 读者期待 (reader_expectation)
本章调用/兑现了读者的哪些期待？读者此刻最想知道什么？

### 3. 钩子兑现 (hook_payoff)
本章是否兑现了前文的某个伏笔/钩子？如果有，说明来源章节和兑现方式；如果没有，标注"新开"

### 4. 日常过渡 (daily_transition)
如果有日常/过渡段落，它们承担什么叙事功能（如：展示世界观细节、深化角色关系、调节节奏）；如果本章无日常段落，标注"无"

### 5. 关键抉择 (key_choice)
本章主角/对手面临的核心选择：
- conflict：冲突是什么？
- options：可选路径（2-3个）
- cost：每种选择的代价

### 6. 章尾改变 (chapter_change)
本章结束时，发生了哪些不可逆的改变（信息/关系/物理/权力至少一种）

### 7. Hook账本 (hook_ledger)
本章埋下的新钩子：
- open：新开的钩子（预计在哪个章节兑现）
- advance：推进了已有的哪个钩子
- resolve：解决了哪个已有钩子
- defer：暂缓了哪个钩子

## 输出格式
生成{count}章的细纲，JSON数组：
[
  {
    "chapter": 1,
    "title": "章节标题（吸引人）",
    "seven_part": {
      "current_task": "本章核心任务",
      "reader_expectation": "读者期待分析",
      "hook_payoff": {"from_chapter": 0, "description": "兑现描述（如无则填null）"},
      "daily_transition": "日常过渡功能描述（如无则填null）",
      "key_choice": {"conflict": "冲突", "options": ["选项1", "选项2"], "cost": "代价"},
      "chapter_change": "不可逆改变描述",
      "hook_ledger": [
        {"type": "open", "hook": "新钩子描述", "expected_chapter": 5}
      ]
    },
    "events": ["核心事件1", "核心事件2"],
    "characters": ["出场角色1"],
    "conflict": "本章冲突概述",
    "emotional_beat": "情感基调（如：紧张/轻松/悲伤/热血）",
    "word_count_estimate": 2500
  }
]`,
    count: 10,

    // 单章深度编排的System Prompt
    singleChapterPrompt: `你是一位资深网文策划，擅长为单章设计深度结构化细纲。请根据提供的本章概要，为这一章生成完整的创作蓝图。

## 章节边界合同
每一章都应该有一个明确的"边界合同"，定义本章的叙事使命和执行约束。

### 章节目标 (purpose)
本章要向读者交付什么？不能只复述摘要，要说清本章在整卷中的角色：是铺垫、推进、转折还是收束？

### 独占事件 (exclusive_event)
只在本章发生、前章没有后章不会重演的事件是什么？这是本章的"不可替代性"。

### 结束状态 (ending_state)
本章结束时，主角/故事处于什么状态？与开头相比改变了什么？

### 下章入口状态 (next_chapter_entry_state)
为下一章留下了什么入口？读者翻页的动机是什么？

## 7段式细纲结构

### 1. 当前任务
本章要完成的核心叙事任务（一句话说清）

### 2. 读者期待
本章调用/兑现了读者的哪些期待？读者此刻最想知道什么？

### 3. 钩子兑现
本章是否兑现了前文的某个伏笔/钩子？如果有，说明来源章节和兑现方式

### 4. 日常过渡
如果有日常/过渡段落，它们承担什么叙事功能

### 5. 关键抉择
本章主角/对手面临的核心选择：冲突是什么？可选路径？代价？

### 6. 章尾改变
本章结束时发生了哪些不可逆的改变（信息/关系/物理/权力至少一种）

### 7. Hook账本
本章埋下的新钩子：open（新开）、advance（推进）、resolve（解决）、defer（暂缓）

## 场景卡拆解（仅在完整版时生成）
将本章拆解为3-8个场景，每个场景：
- scene_key：场景标识
- title：场景标题
- purpose：场景目标（完成什么叙事任务）
- entry_state：入场状态（角色/情绪/环境）
- exit_state：离场状态
- must_advance：必须推进的剧情点
- must_preserve：必须保持的设定/人设
- target_word_count：字数预算

## 任务单（仅在完整版时生成）
给正文写作器下达的具体执行指令：
- writing_focus：本章写作重心
- conflict_delivery：冲突如何呈现
- emotion_curve：情绪曲线（起→伏→起）
- avoid_list：禁止触碰的内容
- quality_checklist：写完后的自查清单

## 输出格式
{
  "chapter": 章节号,
  "title": "章节标题",
  "boundary": {
    "purpose": "章节目标",
    "exclusive_event": "独占事件",
    "ending_state": "结束状态",
    "next_chapter_entry_state": "下章入口状态",
    "conflict_level": 冲突等级(0-100),
    "reveal_level": 揭露等级(0-100),
    "target_word_count": 目标字数,
    "must_avoid": "禁止事项"
  },
  "seven_part": { ... },
  "events": ["核心事件1", "核心事件2"],
  "characters": ["出场角色1"],
  "conflict": "本章冲突概述",
  "emotional_beat": "情感基调",
  "scene_cards": [
    {
      "scene_key": "SC01",
      "title": "场景标题",
      "purpose": "场景目标",
      "entry_state": "入场状态",
      "exit_state": "离场状态",
      "must_advance": ["必须推进1"],
      "must_preserve": ["必须保持1"],
      "target_word_count": 500
    }
  ],
  "task_sheet": {
    "writing_focus": "写作重心",
    "conflict_delivery": "冲突呈现方式",
    "emotion_curve": "情绪曲线",
    "avoid_list": ["禁止事项1"],
    "quality_checklist": ["检查项1"]
  }
}`,

    // 场景卡生成的System Prompt
    sceneCardPrompt: `你是一位网文策划，擅长将章节拆解为可执行的场景卡。

## 场景卡规范
1. 每章拆解为3-8个场景
2. 每个场景有清晰的目标（purpose）和状态转换（entry→exit）
3. 字数预算总和不超过目标字数
4. 场景之间要有因果/递进关系

## 输出格式
生成3-8个场景卡的JSON数组：
[
  {
    "scene_key": "SC01",
    "title": "场景标题",
    "purpose": "场景叙事目标",
    "entry_state": "入场状态描述",
    "exit_state": "离场状态描述",
    "must_advance": ["必须推进的剧情点"],
    "must_preserve": ["必须保持的设定/人设"],
    "target_word_count": 500
  }
]`,

    // 任务单生成的System Prompt
    taskSheetPrompt: `你是一位资深写作指导，擅长为章节撰写可执行的任务单。

## 任务单规范
1. writing_focus：用1-2句话说明本章写作重心
2. conflict_delivery：冲突如何逐步呈现（铺垫→引爆→升级→收束）
3. emotion_curve：情绪变化曲线（如：紧张→释然→再度紧张→高潮→留白）
4. avoid_list：本章绝对不能做的事（如：不要过早揭示XX、不要弱化反派）
5. quality_checklist：写完后自检的清单（如：钩子是否埋下？角色台词是否贴合人设？）

## 输出格式
{
  "writing_focus": "本章写作重心",
  "conflict_delivery": "冲突呈现方式",
  "emotion_curve": "情绪曲线描述",
  "avoid_list": ["禁止事项"],
  "quality_checklist": ["质量检查项"]
}`,

    // 质量评估的System Prompt
    assessPrompt: `你是一位网文质量评审，请评估以下章节创作蓝图的完整性。

## 评估维度
1. 章节目标是否明确？（不能只是复述摘要）
2. 边界合同是否完整？（独占事件、结束状态、下章入口）
3. 7段式细纲是否具体？（不能有空泛描述）
4. 场景卡是否可执行？（目标清晰、状态转换明确）
5. 任务单是否足够指导写作？

## 输出格式
{
  "verdict": "ready" | "repairable" | "incomplete",
  "summary": "总体评价（一句话）",
  "issues": [
    {"severity": "high"|"medium"|"low", "target": "purpose"|"boundary"|"seven_part"|"scene_cards"|"task_sheet", "summary": "问题描述", "repair_hint": "修复建议"}
  ],
  "completeness_score": 0-100
}`,
  },
opening: {
    name: '黄金开篇生成器',
    description: '生成抓住读者的第一章开篇',
    inputs: [
      { key: 'theme', label: '故事设定', type: 'textarea', placeholder: '描述你的故事设定、主角和开篇场景...', rows: 3 },
      { key: 'style', label: '开篇风格', type: 'select', options: ['热血爽文', '悬疑烧脑', '轻松搞笑', '虐恋深情', '仙侠古风'] },
      { key: 'hook_type', label: '开篇钩子类型', type: 'radio', required: false, options: ['冲突开场', '悬念开场', '对话开场', '场景描写开场'] },
      { key: 'word_count', label: '预估字数', type: 'select', placeholder: '1200字(默认)', required: false, options: ['600-800字(短)', '1000-1200字(标准)', '1500-2000字(长)'] },
      { key: 'first_person', label: '第一人称视角', type: 'switch', default: false },
    ],
    systemPrompt: `你是一位网文大神，擅长写吸引人的第一章。请根据故事设定生成黄金开篇。

## 开篇原则
1. 黄金三章法则：前三段必须抓住读者
2. 开场即冲突或悬念，避免大段背景介绍
3. 快速建立主角形象和核心困境
4. 暗示金手指或特殊能力，但不立即展开
5. 制造期待感，章末留钩子
6. 开篇第一段尤其关键：用动作/对话/悬念开场，不用静态描写

## 输出格式
JSON格式输出，包含正文和分析：
{
  "content": "开篇正文（800-1200字）",
  "analysis": {
    "first_paragraph_hook": "第一段的钩子分析",
    "hook_type": "钩子类型（悬念型/冲突型/疑问型/反差型）",
    "structure": [
      {"section": "开场", "word_count_estimate": 200, "purpose": "建立悬念"},
      {"section": "展开", "word_count_estimate": 400, "purpose": "展示困境"},
      {"section": "推进", "word_count_estimate": 300, "purpose": "引入金手指线索"},
      {"section": "收尾", "word_count_estimate": 200, "purpose": "章末钩子"}
    ],
    "character_intro": [{"name": "角色名", "method": "出场方式"}],
    "improvements": [{"issue": "潜在问题", "suggestion": "改进建议"}]
  }
}`,
    count: 1,
  },

  golden_finger: {
    name: '金手指生成器',
    description: '生成新颖的主角金手指/外挂设定',
    inputs: [
      { key: 'theme', label: '故事类型', type: 'select', options: ['都市', '玄幻', '科幻', '历史', '游戏', '仙侠', '末日'] },
      { key: 'style', label: '偏好类型', type: 'select', placeholder: '不限', required: false, options: ['签到系统', '重生', '数据化面板', '召唤', '抽卡', '融合升级', '无所谓AI发挥'] },
      { key: 'uniqueness', label: '新颖度要求', type: 'radio', required: false, options: ['经典稳妥', '适度创新', '前所未有'] },
      { key: 'power_scale', label: '强度定位', type: 'radio', required: false, options: ['开局无敌', '缓慢成长', '限制极大'] },
      { key: 'count', label: '生成数量', type: 'stepper', min: 2, max: 8, default: 5 },
    ],
    systemPrompt: `你是一位网文创意策划，擅长设计新颖的金手指设定。请根据故事类型生成独特的金手指方案。

## 设计要求
1. 避免烂大街的设定（纯签到、纯系统），增加新意和差异化
2. 金手指必须有明确的使用限制（代价/冷却/条件），限制越具体越真实
3. 要有清晰的升级路径，让读者看到成长空间
4. 要与题材深度融合，有独特的应用场景
5. 金手指本身的弱点或缺陷是制造冲突的好来源

## 输出格式
生成{count}个金手指方案，JSON格式：
[
  {
    "name": "金手指名称",
    "mechanism": "触发机制（30字内）",
    "ability": "核心能力描述（50字内）",
    "growth": "成长路线（30字内）",
    "highlight": "独特亮点（30字内）",
    "limitations": ["限制1", "限制2", "限制3"],
    "hidden_abilities": ["隐藏能力1", "隐藏能力2"],
    "upgrade_path": [
      {"level": "初阶", "condition": "解锁条件", "power": "获得能力"},
      {"level": "中阶", "condition": "解锁条件", "power": "获得能力"},
      {"level": "高阶", "condition": "解锁条件", "power": "获得能力"}
    ],
    "weakness": "金手指的天敌或致命弱点",
    "conflict_source": "金手指本身可能引发的冲突（30字内）"
  }
]`,
    count: 5,
  },

  name_generator: {
    name: '名字生成器',
    description: '为角色生成符合设定风格的名字',
    inputs: [
      { key: 'theme', label: '设定背景', type: 'select', options: ['古代仙侠', '现代都市', '西方奇幻', '科幻未来', '历史古风', '末世废土'] },
      { key: 'character_type', label: '角色类型', type: 'radio', required: false, options: ['主角', '反派', '女主角', '配角', '混合'] },
      { key: 'gender', label: '性别', type: 'radio', required: false, options: ['男', '女', '中性', '混合'] },
      { key: 'vibe', label: '气质风格', type: 'select', placeholder: '不限', required: false, options: ['霸气', '温婉', '阴冷', '儒雅', '喜感', '仙气'] },
      { key: 'count', label: '生成数量', type: 'stepper', min: 5, max: 25, default: 10 },
    ],
    systemPrompt: `你是一位网文命名专家。请根据背景设定生成角色名字。

## 命名规则
- 古代/仙侠：有古韵意境，2-3字为主
- 现代/都市：自然不做作，2-3字
- 西方/奇幻：音译感，有异域风情
- 根据角色身份调节气质（霸气/温婉/阴冷/儒雅）

## 输出格式
生成{count}个名字，JSON数组：
[
  {
    "name": "名字",
    "gender": "男/女/中性",
    "style": "风格标签",
    "meaning": "寓意（15字内）",
    "pronunciation": "拼音/音译读法",
    "character_hint": "角色类型暗示（如：正道大侠/邪魅反派/冰山美人）"
  }
]`,
    count: 10,
  },

  character_design: {
    name: '人设生成器',
    description: '生成完整的角色人设卡',
    inputs: [
      { key: 'theme', label: '角色定位', type: 'textarea', placeholder: '如：废材逆袭的主角、冷面腹黑的反派...', rows: 2 },
      { key: 'style', label: '故事背景', type: 'select', options: ['修仙世界', '都市异能', '科幻未来', '历史权谋', '悬疑惊悚', '奇幻冒险'] },
      { key: 'role_type', label: '角色类型', type: 'radio', required: false, options: ['主角', '重要配角', '反派', '女主角/男主角'] },
      { key: 'count', label: '生成数量', type: 'stepper', min: 1, max: 5, default: 3 },
      { key: 'depth_level', label: '人设深度', type: 'radio', required: false, options: ['基础人设(信息+性格)', '标准人设(+背景+能力)', '深度人设(+心理+人际关系+弧光)'] },
      { key: 'include_relationships', label: '包含人际关系网', type: 'switch', default: true },
    ],
    systemPrompt: `你是一位网文人设专家。请根据角色定位生成完整的人设卡，包含深层心理和人际关系。

## 人设维度（深度刻画）
1. **基础信息**：姓名、性别、年龄、外貌特征（含标志性细节）
2. **性格层次**：
   - 表面性格（对外展示的）
   - 内在性格（独处时的真实面）
   - 性格弧线（从A到B的转变路径）
3. **深层驱动**：
   - 核心动机（ta真正想要的是什么）
   - 致命缺陷（性格或能力上的根本弱点）
   - 内心冲突（两种价值观/欲望的拉扯）
4. **背景经历**：出身、关键转折事件、内心创伤或执念
5. **能力体系**：核心能力、战斗/行事风格、成长潜力
6. **人际关系**：与主要角色的关系类型和互动模式
7. **言行特色**：口头禅、习惯性小动作、说话风格
8. **剧情定位**：在主线中的作用（推动/阻碍/陪伴/启发）

## 输出格式
生成{count}个人设方案，JSON格式：
[
  {
    "name": "建议姓名",
    "gender": "性别",
    "age": "年龄",
    "appearance": "外貌特征（含标志性细节）",
    "personality": "性格描述（表面+内在）",
    "inner_conflict": "内心冲突描述",
    "motivation": "核心动机",
    "fatal_flaw": "致命缺陷",
    "background": "背景经历",
    "abilities": ["能力1", "能力2"],
    "speech_style": "说话风格",
    "quirks": ["小动作/习惯1", "小动作/习惯2"],
    "relationships": [
      {"target": "关联角色", "type": "关系类型", "description": "关系描述"}
    ],
    "role": "剧情定位",
    "arc": "角色弧线/成长方向"
  }
]`,
    count: 3,
  },


  // ========== 新增生成器 ==========

  world: {
    name: '世界观生成器',
    description: '生成完整独特的小说世界观设定',
    inputs: [
      { key: 'theme', label: '世界观概念', type: 'textarea', placeholder: '如：灵气复苏、赛博修仙、末日废土...', rows: 2 },
      { key: 'style', label: '风格倾向', type: 'radio', options: ['黑暗硬核', '轻松日常', '史诗宏大', '诡奇神秘'] },
      { key: 'include_power_system', label: '包含力量体系', type: 'switch', default: true },
      { key: 'include_geography', label: '包含地理环境', type: 'switch', default: true },
      { key: 'faction_count', label: '主要势力数量', type: 'stepper', min: 2, max: 6, default: 3 },
      { key: 'complexity', label: '世界观复杂度', type: 'radio', required: false, options: ['简洁精炼', '中等丰富', '史诗巨细'] },
    ],
    systemPrompt: `你是一位科幻/奇幻世界观构建专家。请根据概念设计一个完整独特的世界观。

## 世界观维度
1. **基本信息**：时代、整体氛围、主题色调
2. **力量体系**：
   - 核心规则（等级/境界/技能树）
   - 能量来源和运转机制
   - 天花板（最强能到什么程度）和代价（使用力量的副作用）
3. **势力分布**：每个势力的目标、实力、地盘、代表人物
4. **地理环境**：独特区域、资源分布、禁区险地
5. **独特法则**：这个世界独有的物理/魔法/社会规则（2-3条最亮眼的）
6. **隐藏秘密**：不为大众所知的真相（给剧情留反转空间）

## 输出格式
JSON格式输出：
{
  "basic_info": {"era": "时代", "theme": "主题", "tone": "氛围基调"},
  "power_system": {
    "name": "力量体系名称",
    "levels": ["等级1", "等级2", "等级3", "等级4", "等级5"],
    "energy_source": "能量来源",
    "cost": "使用代价",
    "ceiling": "力量天花板描述"
  },
  "factions": [
    {"name": "势力名", "goal": "目标", "power": "实力描述", "territory": "地盘"}
  ],
  "geography": [
    {"region": "区域名", "features": "特征", "danger": "危险等级（高/中/低）"}
  ],
  "unique_rules": [
    {"rule": "独特规则", "impact": "对故事的影响"}
  ],
  "hidden_secrets": [
    {"secret": "隐藏真相", "reveal_stage": "适合在什么阶段揭露"}
  ]
}`,
    count: 1,
  },

  imagination: {
    name: '脑洞生成器',
    description: '生成新颖独特的创意脑洞/故事概念',
    inputs: [
      { key: 'mode', label: '生成模式', type: 'radio', options: ['原创生成', '风格仿写'], default: '原创生成' },
      { key: 'theme', label: '灵感方向', type: 'textarea', placeholder: '描述你想看的脑洞方向，或多个关键词...', rows: 2, showWhen: { mode: '原创生成' } },
      { key: 'brainhole_type', label: '脑洞类型', type: 'select', placeholder: '不限,让AI自由发挥', required: false, options: ['系统流', '反套路', '跨界融合', '设定反转', '重生/轮回', '日常向'], showWhen: { mode: '原创生成' } },
      { key: 'style', label: '风格偏好', type: 'radio', required: false, options: ['搞笑吐槽', '黑暗反转', '热血燃向', '悬疑烧脑'], showWhen: { mode: '原创生成' } },
      { key: 'include_market_analysis', label: '包含市场分析', type: 'switch', default: false, showWhen: { mode: '原创生成' } },
      { key: 'ref_text', label: '参考脑洞', type: 'textarea', placeholder: '贴上你感兴趣的脑洞/故事概念...', rows: 3, showWhen: { mode: '风格仿写' } },
      { key: 'ref_style', label: '你的偏好方向', type: 'textarea', placeholder: '如：更偏搞笑、更偏硬核...', rows: 1, required: false, showWhen: { mode: '风格仿写' } },
      { key: 'differentiation', label: '差异化程度', type: 'radio', required: false, options: ['高度延续(相似风格)', '中等变化(保留模式)', '全新概念(只取灵感)'], showWhen: { mode: '风格仿写' } },
      { key: 'count', label: '生成数量', type: 'stepper', min: 2, max: 8, default: 5 },
    ],
    systemPrompt: `你是一位网文创意大师，擅长设计新颖独特的脑洞和故事概念。

## 脑洞要求
1. 概念要新奇有趣，让人眼前一亮
2. 核心设定简洁有力（一句话能说清楚）
3. 包含鲜明的反差或冲突，以此驱动剧情
4. 有可延展的剧情空间（能撑起百万字长篇）
5. 适合网文平台读者口味
6. 每个脑洞需要有明确的冲突引擎（故事靠什么矛盾推动）

## 输出格式
生成{count}个脑洞方案，JSON格式：
[
  {
    "name": "脑洞名称",
    "concept": "核心概念（一句话）",
    "hook": "一句话卖点/钩子（15字内的高度浓缩）",
    "setting": "世界观简述（50-100字）",
    "highlight": "最吸引人的亮点",
    "conflict_engine": "冲突引擎描述（故事靠什么矛盾持续推动）",
    "twist_potential": "反转潜力（可预见的反转方向）",
    "audience": "目标读者群",
    "market_fit": {
      "advantage": "市场优势",
      "risk": "潜在风险"
    }
  }
]`,
    count: 5,

    rewritePrompt: `你是一位网文创意策划。请根据参考脑洞的创意模式，仿写出类似风格的新脑洞。

## 仿写要求
1. 提取参考脑洞的核心创意模式（反转点/对比结构/跨界融合方式），而非照搬设定
2. 用同样的创意结构创造新概念
3. 保持新颖度和可读性
4. 每个脑洞要有明确的差异化亮点和可辨识的特征
5. 说明与参考脑洞的差异，避免雷同

## 输出格式
生成{count}个仿写脑洞，JSON格式：
[
  {
    "name": "脑洞名称",
    "concept": "核心概念",
    "setting": "世界观简述",
    "highlight": "独特亮点",
    "original_pattern": "从参考脑洞中提取的创意模式",
    "differentiation": "与参考脑洞的差异化说明",
    "expandability": "可扩展性（能否撑起长篇小说）"
  }
]`,
  },

  book_analysis: {
    name: '书籍分析器',
    description: '对小说全面分析：卖点、节奏、人设、市场定位',
    inputs: [
      { key: 'theme', label: '书籍信息', type: 'textarea', placeholder: '贴上书名、简介、开头章节等内容...', rows: 4 },
      { key: 'focus_area', label: '分析重点', type: 'select', placeholder: '综合全面分析', required: false, options: ['综合全面', '爽点与节奏', '人物塑造', '商业价值', '开篇评审'] },
      { key: 'depth', label: '分析深度', type: 'radio', required: false, options: ['快速概览', '标准分析', '深度拆解'] },
      { key: 'include_comparison', label: '包含同类书对比', type: 'switch', default: true },
      { key: 'include_chapter_review', label: '包含逐章评审', type: 'switch', default: false },
    ],
    systemPrompt: `你是一位资深网文编辑和市场分析师。请对以下小说进行全面深度分析。

## 分析维度
1. **核心卖点**：这本书最吸引人的点是什么？（100字内）
2. **优势与不足**：分别列出2-3条
3. **目标读者**：适合什么类型的读者群？画像越具体越好
4. **节奏评价**：开篇抓人度、章节节奏、高潮分布是否合理
5. **人物塑造**：主角魅力值、配角丰满度、反派深度
6. **世界观**：设定新颖度、逻辑自洽性、展开潜力
7. **市场定位**：同类书对比、题材热度、潜在风险
8. **商业化建议**：如何优化以提升数据？
9. **章节评审**：对前几章的逐段评审
10. **综合评分**：多个维度1-10分

## 输出格式
JSON格式：
{
  "selling_points": "核心卖点",
  "strengths": ["优势1", "优势2", "优势3"],
  "weaknesses": ["不足1", "不足2"],
  "target_audience": "目标读者画像",
  "pacing": "节奏评价",
  "character_analysis": "人物塑造分析",
  "world_building": "世界观分析",
  "market_position": "市场定位分析",
  "commercial_advice": "商业化建议",
  "risk_rating": 3,
  "comparison_books": [
    {"title": "同类书名", "similarity": "相似点", "advantage": "你的优势"}
  ],
  "chapter_review": [
    {"range": "第1章", "rating": 8, "comment": "评审意见"}
  ],
  "rating": 7
}`,
    count: 1,
  },

  chapter_title: {
    name: '章节起名生成器',
    description: '根据章节内容或大纲生成吸睛的章节标题',
    inputs: [
      { key: 'theme', label: '章节内容概要', type: 'textarea', placeholder: '描述本章内容或贴上大纲...', rows: 3 },
      { key: 'style', label: '起名风格', type: 'select', placeholder: '不限', required: false, options: ['悬念式', '霸气式', '搞笑式', '燃向', '深沉式', '唯美式'] },
      { key: 'count', label: '生成数量', type: 'stepper', min: 3, max: 12, default: 5 },
      { key: 'include_alternatives', label: '包含备选标题', type: 'switch', default: true },
    ],
    systemPrompt: `你是一位网文编辑，擅长为章节取吸引人的标题。

## 起名规则
1. 3-10个字，简洁有力
2. 体现本章核心事件或冲突
3. 制造悬念或期待感，但不过度剧透
4. 风格统一但各章有辨识度
5. 考虑标题的情感调性（热血/紧张/轻松/悲壮）

## 输出格式
生成{count}个章节标题候选，JSON格式：
[
  {
    "title": "章节标题",
    "style": "风格标签（悬念式/霸气式/搞笑式/燃向/深沉式）",
    "emotional_tone": "情感调性（热血/紧张/轻松/悲壮/悬疑）",
    "keywords": ["核心关键词1", "核心关键词2"],
    "reason": "推荐理由（20字内）",
    "alternatives": ["备选标题1", "备选标题2"]
  }
]`,
    count: 5,
  },

  cover_prompt: {
    name: '封面提示词生成器',
    description: '生成AI绘图用的封面提示词（配合Midjourney/SD）',
    inputs: [
      { key: 'theme', label: '小说信息', type: 'textarea', placeholder: '书名、类型、核心元素、风格关键词...', rows: 3 },
      { key: 'style', label: '封面画风', type: 'select', options: ['古风水墨', '赛博朋克', '日系轻小说', '厚涂写实', '极简设计', '奇幻唯美'] },
      { key: 'ai_tool', label: '目标AI工具', type: 'radio', required: false, options: ['Midjourney', 'Stable Diffusion', 'DALL-E', '通用'] },
      { key: 'aspect_ratio', label: '画面比例', type: 'select', placeholder: '2:3(推荐)', required: false, options: ['2:3(手机封面)', '9:16(竖版全屏)', '1:1(方版)', '16:9(宽屏)'] },
      { key: 'color_preference', label: '色彩偏好', type: 'select', placeholder: '不限', required: false, options: ['暖色调', '冷色调', '高对比', '柔和', '明亮'] },
    ],
    systemPrompt: `你是一位AI绘图提示词专家，擅长为小说封面生成高质量绘图提示词。

## 提示词设计规范
1. **主体元素**：人物/场景/核心物品，详细描述姿态、表情、服装、环境
2. **风格描述**：艺术风格（水墨/油画/厚涂/平涂/日系/CG）+ 色彩方案 + 光影效果
3. **构图参考**：主体位置（居中/三分法）、视角（平视/俯视/仰视）、画幅建议（竖版16:9适合手机）
4. **质量词**：根据目标工具选用合适的质量关键词
   - Midjourney: --ar 2:3 --style raw --s 250
   - SD: masterpiece, best quality, 8k, highly detailed
   - DALL-E: cinematic lighting, photorealistic
5. **中英双语**：英文版使用自然流畅的prompt，不堆砌

## 输出格式
JSON格式：
{
  "cn_prompt": "中文提示词（含风格描述和构图建议）",
  "en_prompt": "English prompt",
  "style_keywords": ["画风关键词1", "画风关键词2", "画风关键词3"],
  "color_scheme": "推荐色彩方案",
  "composition": "构图建议（如：竖版、主体居中、仰视角度）",
  "tool_recommendations": {
    "midjourney": "Midjourney适用参数",
    "sd": "Stable Diffusion适用参数"
  }
}`,
    count: 1,
  },

  volume_summary: {
    name: '分卷概要生成器',
    description: '生成小说分卷的结构化概要',
    inputs: [
      { key: 'theme', label: '完整故事大纲', type: 'textarea', placeholder: '贴上你的完整故事大纲或核心设定...', rows: 4 },
      { key: 'volume_count', label: '分卷数量', type: 'stepper', min: 2, max: 8, default: 3 },
      { key: 'escalation_type', label: '卷间递进方式', type: 'radio', required: false, options: ['冲突升级', '换地图/场景', '能力突破', '势力扩张', '综合递进'] },
      { key: 'include_chapter_allocation', label: '包含章节分配', type: 'switch', default: true },
    ],
    systemPrompt: `你是一位网文策划编辑。请根据故事大纲，生成分卷的结构化概要，每卷有明确的叙事功能和递进关系。

## 分卷结构（每卷必含）
1. 卷名：吸引人，2-4字
2. 核心承诺：本卷给读者的主要看点/承诺（读者为什么要读这卷）
3. 核心冲突：本卷的主要矛盾
4. 升级模式：主角在本卷的成长/升级方式
5. 主要事件：3-5个关键剧情节点
6. 角色变化：本卷结束时主角发生了怎样的改变
7. 卷末高潮：本卷最终大场面简述
8. 卷末钩子：引向下一卷的悬念
9. 章节分配：本卷各章节的剧情分配

## 卷间递进原则
- 每卷的冲突规模和赌注要递增
- 主角的能力/地位/认知在每卷末有明显跃迁
- 卷末钩子要为下一卷埋下足够的期待

## 输出格式
生成{count}卷的概要，JSON格式：
[
  {
    "volume": 1,
    "title": "卷名（2-4字）",
    "main_promise": "本卷核心承诺/看点",
    "conflict": "核心冲突",
    "escalation_mode": "升级模式",
    "events": ["事件1", "事件2", "事件3", "事件4"],
    "character_growth": "角色成长/变化节点",
    "climax": "卷末高潮描述",
    "hook": "卷末钩子",
    "reset_point": "下卷重置点（如换地图/新势力登场/能力突破）",
    "open_payoffs": ["本卷新开启的伏笔1", "伏笔2"],
    "chapter_allocation": [
      {"chapter_range": "第1-3章", "focus": "本段剧情焦点"}
    ]
  }
]`,
    count: 3,
  },
};

async function callAI(systemPrompt, userPrompt, { temperature = 0.85, maxTokens = 4096, timeout = 120000, provider: overrideProvider = null, model: overrideModel = null } = {}) {
  const config = getAIConfig();
  if (overrideProvider) {
    const providers = listProviders();
    var target = providers.find(function(p) { return p.provider === overrideProvider && p.isActive; });
    if (target) {
      if (target.api_key) config.api_key = target.api_key;
      if (target.api_base) config.api_base = target.api_base;
      if (overrideModel) config.model = overrideModel;
      else if (target.model) config.model = target.model;
    }
  }
  if (!config.api_key) throw new Error('AI模型未配置API Key，请先在设置中配置');

  const response = await fetch(`${config.api_base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.api_key}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature,
      max_tokens: maxTokens || config.max_tokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`AI API请求失败 (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export function getToolList() {
  return Object.entries(TOOLS).map(([key, tool]) => ({
    key,
    name: tool.name,
    description: tool.description,
    inputs: tool.inputs,
  }));
}

export async function generateTool(key, params = {}) {
  const tool = TOOLS[key];
  if (!tool) throw new Error(`未知生成器: ${key}`);

  // 模式切换：风格仿写用 rewritePrompt，原创生成用 systemPrompt
  const isRewrite = params.mode === '风格仿写' && tool.rewritePrompt;
  let systemPrompt = isRewrite ? tool.rewritePrompt : tool.systemPrompt;

  // 动态替换 {count} 模板变量：优先 chapters > volume_count > count
  const countInput = tool.inputs.find(inp => inp.type === 'stepper' || inp.type === 'number');
  const countKey = countInput?.key || 'count';
  const count = params.chapters || params[countKey] || tool.count || 1;
  systemPrompt = systemPrompt.replace(/\{count\}/g, String(count));

  // 动态构建用户输入：遍历工具定义的所有输入字段
  const userParts = [];
  if (tool.inputs) {
    tool.inputs.forEach(inp => {
      const val = params[inp.key];
      if (val !== undefined && val !== null && val !== '' && val !== false) {
        userParts.push(`${inp.label}：${val}`);
      }
    });
  }
  if (params.extra_instruction) {
    userParts.push(`附加指令：${params.extra_instruction}`);
  }
  const userPrompt = userParts.length ? userParts.join('\n') : `请根据此工具的要求生成内容。`;

  const isJsonTool = ['book_title', 'synopsis', 'outline', 'golden_finger', 'name_generator', 'character_design', 'detailed_outline', 'opening', 'world', 'imagination', 'title_rewrite', 'summary_rewrite', 'imagination_rewrite', 'book_analysis', 'chapter_title', 'cover_prompt', 'volume_summary'].includes(key);
  const isHeavyTool = ['outline', 'detailed_outline'].includes(key);
  const raw = await callAI(systemPrompt, userPrompt, {
    temperature: isJsonTool ? 0.9 : 0.85,
    maxTokens: isHeavyTool ? 16384 : (isJsonTool ? 8192 : 4096),
    timeout: 120000,
  });

  if (isJsonTool) {
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/) || raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { type: 'json', data: JSON.parse(jsonMatch[0]), raw };
      }
    } catch { /* return as text */ }
  }

  return { type: 'text', data: raw, raw };
}

// AI完善大纲节点
export async function refineOutline(toolKey, { original_data, mode = 'overall', direction, extra_instruction } = {}) {
  const tool = TOOLS[toolKey];
  if (!tool) throw new Error(`未知生成器: ${toolKey}`);

  const modes = {
    overall: '整体扩写：全面丰富内容，增加深度和细节',
    details: '补充细节：增强具体描写和场景细节',
    conflict: '强化冲突：加深矛盾对立和戏剧张力',
    pacing: '优化节奏：调整叙事节奏，松紧有度',
    world: '补足世界观：拓展世界设定和背景深度',
  };

  const modeDesc = modes[direction] || modes.overall;
  const originalJson = JSON.stringify(original_data, null, 2);

  const systemPrompt = `你是一位资深网文编辑，擅长完善和增强大纲内容。

## 当前操作
${modeDesc}

## 要求
1. 保持原始内容的核心结构不变
2. 在原有基础上进行增强，不要推倒重来
3. 丰富细节，增加具体描写
4. 保持与原作的风格一致性

## 输出格式
输出完善后的内容，保持与输入相同的JSON结构。`;

  const userParts = [`完善模式：${modeDesc}\n\n原始内容：\n${originalJson}`];
  if (extra_instruction) userParts.push(`附加指令：${extra_instruction}`);
  const userPrompt = userParts.join('\n');

  const raw = await callAI(systemPrompt, userPrompt, {
    temperature: 0.85, maxTokens: 8192, timeout: 120000,
  });

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/) || raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return { type: 'json', data: JSON.parse(jsonMatch[0]), raw };
    }
  } catch { /* return as text */ }

  return { type: 'text', data: raw, raw };
}

// AI拆分大纲节点
export async function splitOutline(toolKey, { original_data, mode = 'plot', direction, split_count = 3, extra_instruction } = {}) {
  const tool = TOOLS[toolKey];
  if (!tool) throw new Error(`未知生成器: ${toolKey}`);

  const modes = {
    plot: '按剧情推进：将内容按故事发展的先后顺序拆分为多个阶段',
    conflict: '按冲突升级：按冲突从小到大、从外部到内部的升级路径拆分',
    timeline: '按时间顺序：按时间线节点拆分（如：前夜/爆发/转折/高潮/余波）',
    chapter: '按章节策划：直接将内容拆分为具体章节的规划',
  };

  const modeDesc = modes[direction] || modes.plot;
  const originalJson = JSON.stringify(original_data, null, 2);

  const systemPrompt = `你是一位资深网文策划，擅长将大纲细化和拆分。

## 当前操作
${modeDesc}

## 要求
1. 将原始内容拆分为${split_count}个子节点
2. 每个子节点保持相对独立和完整
3. 子节点之间要有清晰的递进/因果逻辑
4. 保持原有内容不丢失，只是重组和细化

## 输出格式
生成${split_count}个子节点的JSON数组，保持与输入相同的字段结构。`;

  const userParts = [`拆分模式：${modeDesc}\n拆分数量：${split_count}\n\n原始内容：\n${originalJson}`];
  if (extra_instruction) userParts.push(`附加指令：${extra_instruction}`);
  const userPrompt = userParts.join('\n');

  const raw = await callAI(systemPrompt, userPrompt, {
    temperature: 0.9, maxTokens: 8192, timeout: 120000,
  });

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/) || raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return { type: 'json', data: JSON.parse(jsonMatch[0]), raw };
    }
  } catch { /* return as text */ }

  return { type: 'text', data: raw, raw };
}

// AI生成场景卡
export async function generateSceneCards(toolKey, { chapter_data, extra_instruction } = {}) {
  const tool = TOOLS[toolKey];
  if (!tool || !tool.sceneCardPrompt) throw new Error(`该工具不支持场景卡生成: ${toolKey}`);

  const chapterJson = JSON.stringify(chapter_data, null, 2);
  const targetWordCount = chapter_data?.boundary?.target_word_count || chapter_data?.word_count_estimate || 3000;
  const sceneCount = Math.min(8, Math.max(3, Math.round(targetWordCount / 500)));

  const systemPrompt = tool.sceneCardPrompt + `\n\n## 当前章节信息\n目标总字数：${targetWordCount}字\n建议场景数：${sceneCount}个`;

  const userParts = [`请为以下章节生成${sceneCount}个场景卡：\n\n${chapterJson}`];
  if (extra_instruction) userParts.push(`附加指令：${extra_instruction}`);
  const userPrompt = userParts.join('\n');

  const raw = await callAI(systemPrompt, userPrompt, {
    temperature: 0.8, maxTokens: 4096, timeout: 60000,
  });

  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/) || raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        type: 'json',
        data: Array.isArray(parsed) ? parsed : (parsed.scene_cards || parsed.scenes || [parsed]),
        raw,
      };
    }
  } catch { /* return as text */ }
  return { type: 'text', data: raw, raw };
}

// AI生成任务单
export async function generateTaskSheet(toolKey, { chapter_data, extra_instruction } = {}) {
  const tool = TOOLS[toolKey];
  if (!tool || !tool.taskSheetPrompt) throw new Error(`该工具不支持任务单生成: ${toolKey}`);

  const chapterJson = JSON.stringify(chapter_data, null, 2);

  const systemPrompt = tool.taskSheetPrompt;
  const userParts = [`请为以下章节生成可执行的任务单：\n\n${chapterJson}`];
  if (extra_instruction) userParts.push(`附加指令：${extra_instruction}`);
  const userPrompt = userParts.join('\n');

  const raw = await callAI(systemPrompt, userPrompt, {
    temperature: 0.75, maxTokens: 2048, timeout: 60000,
  });

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return { type: 'json', data: JSON.parse(jsonMatch[0]), raw };
    }
  } catch { /* return as text */ }
  return { type: 'text', data: raw, raw };
}

// AI评估章节创作蓝图质量
export async function assessChapterQuality(toolKey, { chapter_data, extra_instruction } = {}) {
  const tool = TOOLS[toolKey];
  if (!tool || !tool.assessPrompt) throw new Error(`该工具不支持质量评估: ${toolKey}`);

  const chapterJson = JSON.stringify(chapter_data, null, 2);

  const systemPrompt = tool.assessPrompt;
  const userParts = [`请评估以下章节创作蓝图的完整性：\n\n${chapterJson}`];
  if (extra_instruction) userParts.push(`附加指令：${extra_instruction}`);
  const userPrompt = userParts.join('\n');

  const raw = await callAI(systemPrompt, userPrompt, {
    temperature: 0.5, maxTokens: 2048, timeout: 60000,
  });

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return { type: 'json', data: JSON.parse(jsonMatch[0]), raw };
    }
  } catch { /* return as text */ }
  return { type: 'text', data: raw, raw };
}

// AI生成单章深度细纲
export async function generateSingleChapter(toolKey, params) {
  const tool = TOOLS[toolKey];
  if (!tool || !tool.singleChapterPrompt) throw new Error(`该工具不支持单章深度编排: ${toolKey}`);

  const { single_theme, chapter_context, chapter_number = 1, deep_scope, extra_instruction } = params;
  const includeSceneCards = !deep_scope || deep_scope.includes('完整版');
  const includeBoundary = !deep_scope || deep_scope.includes('标准版') || deep_scope.includes('完整版');

  let systemPrompt = tool.singleChapterPrompt;

  const userParts = [`本章序号：第${chapter_number}章`, `本章概要：${single_theme || ''}`];
  if (chapter_context) userParts.push(`前后文背景：${chapter_context}`);
  if (extra_instruction) userParts.push(`附加指令：${extra_instruction}`);
  const userPrompt = userParts.join('\n\n');

  const raw = await callAI(systemPrompt, userPrompt, {
    temperature: 0.85, maxTokens: includeSceneCards ? 8192 : 4096, timeout: 120000,
  });

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return { type: 'json', data: JSON.parse(jsonMatch[0]), raw };
    }
  } catch { /* return as text */ }
  return { type: 'text', data: raw, raw };
}
