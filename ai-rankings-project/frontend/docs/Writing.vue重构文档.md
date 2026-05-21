# Writing.vue 拆分重构文档

## 概述

`Writing.vue` 是项目中最庞大的单文件组件，原始 **5,213 行**，集成了：
- 书架管理（CRUD）
- 章节编辑器（CRUD + 右键菜单 + 导出）
- 10 个 AI 功能面板（写作、续写、扩写润色、章纲、排书、审稿、纠错、去痕、更多工具、剧本改编）
- 6 个弹窗（新建书籍、全书设定、章节概要、关键词替换、关联章节、提取风格）
- 上下文感知系统（角色、风格、概要链、关联章节）
- Provider/Model 切换

单文件过大导致难以维护、改动风险高、代码导航困难。本次重构采用**渐进式 Composable 提取**策略，在不修改任何业务逻辑的前提下将代码拆分为独立模块。

## 核心原则

1. **纯搬移，不改逻辑** — 每个 composable 只做代码搬移，不重构、不优化、不改变量名
2. **每步必验** — 每提取一个模块，通过 Vite build 编译验证
3. **依赖显式注入** — 外部依赖全部通过函数参数传入，无隐式依赖
4. **变量名保持一致** — 解构变量名与原代码完全相同，模板引用无需修改

## 架构总览

```
src/composables/writing/
├── useCorrectionRules.js    # 纠错规则状态
├── useAiConfig.js           # AI 功能配置常量 + computed 工厂
├── useAiForm.js             # AI 面板表单状态 + Provider/Model 切换
├── useInit.js               # 初始化数据 + 预设管理
├── useEditor.js             # 编辑器草稿状态 + 文本选择
├── useCharacterPicker.js    # 角色选择器
├── usePromptPicker.js       # 提示词选择器
├── useExtractStyle.js       # 风格提取弹窗
├── useDiffPreview.js        # 内联 Diff 预览 + 修复 Diff
├── useContextAwareness.js   # 上下文感知 + 关联章节 + 自动收集
├── useKeywordReplace.js     # 关键词批量替换弹窗
├── useChapterSummary.js     # 章节概要弹窗
├── useBookManagement.js     # 书架管理 + 全书设定 + 新建书籍
├── useChapterManagement.js  # 章节 CRUD + 右键菜单 + 导出
└── useAiExecution.js        # AI 面板状态 + 审稿状态 + 指令构建
```

## 各模块详细说明

### 1. useCorrectionRules.js（步骤 1）

**职责**：纠错规则状态管理

**搬移内容**：
- `correctionRules` — 4 条纠错规则的 reactive 数组
- `setCorrectionRules(enabled)` — 批量设置规则启用状态
- `resetCorrectionRules()` — 重置为全选

**依赖**：无外部依赖

**使用方式**：
```js
const { correctionRules, setCorrectionRules, resetCorrectionRules } = useCorrectionRules();
```

**验证链路**：链路 H — 纠错面板规则列表正常展示、全选/全不选有效

---

### 2. useAiConfig.js（步骤 2）

**职责**：10 个 AI 功能完整配置 + AI 相关 computed 工厂

**搬移内容**：
- `aiFunctions` 数组 — 10 个 AI 功能配置（~140 行），每个包含 key、label、description、mode、variants、instruction
- `textProcessActions` 数组 — 文本处理操作（扩写/润色/精炼）
- `AI_SOURCE_LIMIT` 常量 — 2500
- `createActiveConfig(activeAiKeyRef, aiFormRef)` 工厂函数

**依赖**：无外部依赖

**使用方式**：
```js
const { aiFunctions, textProcessActions, AI_SOURCE_LIMIT, createActiveConfig } = useAiConfig();
const { activeAiConfig, isTextProcessMode, ... } = createActiveConfig(activeAiKey, aiForm);
```

**验证链路**：链路 C-F — 各 AI 功能面板的标题、描述、变体选择器正常

---

### 3. useAiForm.js（步骤 3）

**职责**：AI 面板表单状态 + Provider/Model 选择

**搬移内容**：
- `selectedProvider` ref + watch
- `aiForm` reactive 对象
- `currentModels` computed
- `ensureToolVariant(config)` / `selectToolVariant(variant)` / `getProviderDefaultModel(providerId)`

**依赖**：`llmStore`（Pinia store）

**使用方式**：
```js
const llmStore = useLlmStore();
const { selectedProvider, aiForm, currentModels, ensureToolVariant, selectToolVariant } = useAiForm(llmStore);
```

**验证链路**：链路 K — 切换 provider 和 model

---

### 4. useInit.js（步骤 5）

**职责**：初始化数据 + 预设管理

**搬移内容**：
- `todayStats` ref
- `stylePresets` / `requirementPresets` refs + fallback 预设常量
- `activeLibraryPrompt` ref
- `displayStylePresets` / `displayRequirementPresets` computed
- 工厂函数：`createCurrentStyleProfile`、`createSelectedStylePresetContent`、`createSelectedRequirementPresetContent`、`createMergedStyleProfile`
- `getPresetContent` / `getPresetPromptSection`

**注意**：Writing.vue 保留了自己的 `loadActiveLibraryPrompt()`（含 `showToast` 副作用），后移至 `useAiExecution`。

**依赖**：无外部依赖

**验证链路**：链路 A1 — 页面加载，控制台无 API 报错

---

### 5. useEditor.js（步骤 4）

**职责**：编辑器草稿状态 + 文本选择

**搬移内容**：
- `draftTitle` / `draftContent` / `dirty` / `saving` / `lastSavedAt` refs
- `contentInputRef` / `textSelection` refs
- `draftWordCount` / `lastSavedText` / `hasActiveSelection` computed
- `setActiveChapter` / `markDirty` / `handleContentInput` / `syncTextSelection` / `refreshTextSelection`

**特殊处理**：`setActiveChapter` 不操作 `activeChapter` ref（交给 Writing.vue 的 wrapper），通过 `formatDateTimeFn` 参数接收日期格式化函数。

**依赖**：`countChineseWords`（from utils）

**验证链路**：链路 B 全部 — 编辑、保存、切换、字数统计

---

### 6. useCharacterPicker.js（步骤 6）

**职责**：角色选择器弹窗逻辑

**搬移内容**：6 个 refs、3 个 computeds、7 个函数（角色加载、选择、同步、导航）

**依赖**：`aiForm`、`fetchCharacters` API、`useRouter`

**验证链路**：链路 F1 — 章纲模式角色选择器正常

---

### 7. usePromptPicker.js（步骤 7）

**职责**：提示词选择器弹窗逻辑

**搬移内容**：6 个 refs、1 个 computed、7 个函数（提示词加载、选择、tooltip、导航）

**依赖**：`aiForm`、`fetchPrompts` API、`useRouter`、`showToast`

**验证链路**：链路 F2 — 章纲模式提示词选择器正常

---

### 8. useExtractStyle.js（步骤 8）

**职责**：风格提取弹窗逻辑

**搬移内容**：4 个 refs、3 个函数（打开弹窗、AI 提取、应用结果）

**依赖**：`aiForm`、`draftContent`、`stylePresets`、`showToast`、`showFailToast`、`extractWritingStyle` API

**验证链路**：链路 E5 — 提取风格全流程

---

### 9. useDiffPreview.js（步骤 9）

**职责**：内联 Diff 预览 + 修复 Diff 展示

**搬移内容**：Repair Diff 和 Inline Diff 的所有 refs、computed、函数

**依赖**：`aiForm`、`isTextProcessMode`、`textSelection`、`computeTextDiff` util

**验证链路**：链路 E3-E4 + G4-G5 — diff 预览正确

---

### 10. useContextAwareness.js（步骤 10）

**职责**：上下文感知系统 — 关联章节、自动收集、Token 估算

**搬移内容**：3 个 refs、11 个 computeds、3 个函数

**依赖**：`chapters`、`activeChapter`、`aiForm`、`currentStyleProfile`、`selectedCharactersForPrompt`、`countChineseWords`

**验证链路**：链路 J 全部 + I3 — 上下文卡片 + 关联章节弹窗

---

### 11. useKeywordReplace.js（步骤 11）

**职责**：关键词批量替换弹窗

**搬移内容**：5 个 refs、1 个 computed、6 个函数（条目管理、预览、执行替换）

**依赖**：`chapters`、`activeChapter`、`activeBook`、`draftContent`、`markDirty`、`fetchChapters`、`updateChapter` API、toast 函数

**验证链路**：链路 I2 — 关键词替换（当前章/全部章节）

---

### 12. useChapterSummary.js（步骤 12）

**职责**：章节概要弹窗 — 编辑、AI 生成、批量生成

**搬移内容**：5 个 refs、4 个函数

**依赖**：`chapters`、`activeChapter`、`activeBook`、`draftContent`、`draftTitle`、`dirty`、`aiForm`、`chapterMenuOpenId`、`saveCurrentChapter`、API、toast 函数

**验证链路**：链路 I1 — 概要弹窗（编辑、AI 生成、批量生成）

---

### 13. useBookManagement.js（步骤 13）

**职责**：书架管理状态 + 新建书籍 + 全书设定弹窗

**搬移内容**：
- 15 个 refs：`books`、`activeBook`、`bookKeyword`、`showNewBook`、`showBookSettings`、`bookOutlineDraft` 等
- `filteredBooks` computed
- `formatWords` / `formatRelativeTime` 工具函数
- `loadBookSettings` / `loadOutlineJobsForCreate` / `createBook` / `saveBookSettings` 业务函数
- `watch(showNewBook, ...)`

**留在 Writing.vue**：`selectBook`、`backToShelf`、`createChapterForBook`（跨模块耦合度高）

**步骤 13 修复的 Bug**：`showNewBook` ref 在之前的编辑过程中意外丢失，已在 composable 中正确定义。

**依赖**：`showToast`、`showSuccessToast`、`showFailToast`；API：`apiCreateBook`、`apiUpdateBook`、`fetchOutlineJobs`

**验证链路**：链路 A 全部 + I4

---

### 14. useChapterManagement.js（步骤 14）

**职责**：章节 CRUD + 右键菜单 + 导出

**搬移内容**：
- `chapters`、`activeChapter`、`chapterMenuOpenId`、`chapterMenuPosition` refs
- `formatDateTime`、`chapterName` 工具函数
- `addChapter`、`insertChapterAround`、`toggleChapterMenu`、`removeChapter`、`exportChapter`、`selectChapter` 业务函数

**留在 Writing.vue**：`saveCurrentChapter`、`setActiveChapterWrapper`（打破循环依赖）

**依赖**：`activeBook`、`aiForm`、`dirty`、`saveCurrentChapter`、`setActiveChapterWrapper`、toast 函数；API：`createChapter`、`deleteChapter`、`fetchChapters`

**验证链路**：链路 B 全部 — 章节 CRUD + 右键菜单 + 导出

---

### 15. useAiExecution.js（步骤 15）

**职责**：AI 面板状态 + 审稿状态 + 指令构建辅助函数

**设计**：拆分为两个导出函数以解决 `activeAiKey` ↔ `activeAiConfig` 循环依赖：
- `useAiState()` — 第一阶段调用，创建 AI/审稿相关 refs + 简单 setter 函数
- `useAiExecution(...)` — 第二阶段调用（在 `createActiveConfig` 之后），接收 computeds 返回指令构建函数 + `selectedPresetContent` computed

**搬移内容**：
- 7 个 refs：`aiPanelOpen`、`showPresetContent`、`activeAiKey`、`aiLoading`、`repairLoading`、`showRepairPanel`、`currentReviewIssues`
- 审稿状态函数：`onReviewDone`、`onStartRepair`、`onRepairDone`、`resetAiState`
- 指令构建函数：`buildAiInstruction`、`loadActiveLibraryPrompt`、`getToolInstruction`、`getSystemPromptContent`、`buildTextProcessInstruction`
- `openAiPanel(key)` — AI 面板打开逻辑
- `selectedPresetContent` computed

**留在 Writing.vue**：`runAi`（30+ 依赖，核心 AI 调用）、`onApplyRepair`（跨模块状态修改）、`replaceSelectionWithAiResult`/`applyInlinePreview`/`applyAiResult`/`scrollToReplacedText`（DOM 操作 + 编辑器耦合）

**依赖**：`aiForm`、`activeAiKey`、`aiPanelOpen`、`activeAiConfig`、`activeToolVariant`、`correctionRules`、`selectedCharacters`、`selectedRequirementPrompt`、`outlinePromptContent`、`activeLibraryPrompt`、`getPresetPromptSection`、`stylePresets`、`requirementPresets`、`ensureToolVariant`、`loadCharactersForWriting`、`refreshTextSelection`、`draftContent`、`draftTitle`、`AI_SOURCE_LIMIT`、`showToast`

**验证链路**：链路 C-H — 所有 AI 功能面板操作 + 审稿流程

---

## 进度数据

| 阶段 | Writing.vue 行数 | 减少 | 累计减少 | 提取文件数 |
|------|-----------------|------|---------|-----------|
| 原始 | 5,213 | — | — | 0 |
| 步骤 1-5（5 个基础 composable） | 4,870 | -343 | -343 | 5 |
| 步骤 6-8（角色/提示词/风格） | 4,705 | -165 | -508 | 8 |
| 步骤 9（Diff 预览） | 4,676 | -29 | -537 | 9 |
| 步骤 10（上下文感知） | 4,576 | -100 | -637 | 10 |
| 步骤 11（关键词替换） | 4,481 | -95 | -732 | 11 |
| 步骤 12（章节概要） | 4,397 | -84 | -816 | 12 |
| 步骤 13（书架管理） | 4,302 | -95 | -911 | 13 |
| 步骤 14（章节管理） | 4,193 | -109 | -1,020 | 14 |
| 步骤 15（AI 执行辅助） | 4,098 | -95 | **-1,115** | **15** |

**最终状态**：Writing.vue 从 **5,213 行 → 4,098 行**（减少 **1,115 行，-21.4%**），提取 **15 个 composable 文件**（共 1,490 行）。

## Writing.vue 当前保留内容

以下函数因跨模块高度耦合而保留在 Writing.vue 中：

| 函数 | 保留原因 |
|------|---------|
| `runAi()` | 30+ 外部依赖，是全部 composable 的汇聚点 |
| `onApplyRepair()` | 跨 `activeChapter`/`activeBook`/`chapters`/`draftContent`/`repairDiffData` 多个模块 |
| `replaceSelectionWithAiResult()` | DOM 操作 + `textSelection` + `draftContent` 耦合 |
| `applyInlinePreview()` | DOM 操作 + editor 状态 + API 调用 |
| `applyAiResult()` | 组合 `replaceSelectionWithAiResult` + editor 状态 |
| `scrollToReplacedText()` | 直接操作 `contentInputRef` DOM 元素 |
| `saveCurrentChapter()` | 打破 `useBookManagement` ↔ `useChapterManagement` 循环依赖 |
| `setActiveChapterWrapper()` | 桥接 `useEditor.setActiveChapter` + `useChapterManagement.activeChapter` + `formatDateTime` |
| `selectBook()` | 跨 5+ composable 的状态协调 |
| `backToShelf()` | 跨 6+ composable 的状态重置 |
| `createChapterForBook()` | 组合 `selectBook` + `addChapter` |
| `closeCharacterPicker()` | 跨 3 个 composable 的全局事件协调 |
| `init()` | 所有模块的初始化编排 |

## 关键设计模式

### 工厂函数模式（useAiConfig / useInit）
某些 computed 依赖在 Writing.vue 中创建的 ref/reactive，无法直接放入 composable。采用工厂函数模式，在 Writing.vue 中调用并传入依赖：

```js
// useInit 中定义工厂
function createCurrentStyleProfile(aiFormRef) {
  return computed(() => {
    const preset = stylePresets.value.find(s => s.title === aiFormRef.stylePreset);
    return preset?.content || '';
  });
}

// Writing.vue 中调用
const currentStyleProfile = createCurrentStyleProfile(aiForm);
```

### Wrapper 函数模式（useEditor）
Composable 的函数需要一个在父组件中才能访问的依赖，通过 wrapper 组合：

```js
// Writing.vue 中的 wrapper
function setActiveChapterWrapper(chapter) {
  activeChapter.value = chapter;           // Writing.vue 的 ref
  setActiveChapter(chapter, formatDateTime); // Composable 的函数
}
```

### 两阶段初始化模式（useAiExecution）
解决 `activeAiKey` ↔ `activeAiConfig` 循环依赖：先创建状态 refs（`useAiState`），等 `createActiveConfig` 创建 computeds 后，再注入函数（`useAiExecution`）：

```js
// 第一阶段：创建 refs
const { activeAiKey, aiPanelOpen, ... } = useAiState();

// 中间：创建 computeds（需要 activeAiKey）
const { activeAiConfig, activeToolVariant } = createActiveConfig(activeAiKey, aiForm);

// 第二阶段：创建函数（需要 activeAiConfig, activeToolVariant）
const { getToolInstruction, openAiPanel, ... } = useAiExecution(aiForm, activeAiKey, aiPanelOpen, activeAiConfig, activeToolVariant, ...);
```

### 高耦合函数保留（useBookManagement / useChapterManagement）
`saveCurrentChapter` 和 `setActiveChapterWrapper` 被保留在 Writing.vue 中以打破 `useBookManagement` → `saveCurrentChapter` → `useChapterManagement` → `activeBook` → `useBookManagement` 的循环依赖链。这是一个有意的架构决策，而非遗漏。

### 全局事件处理保留（closeCharacterPicker）
`closeCharacterPicker` 同时关闭角色选择器、提示词选择器和章节菜单，属于跨模块协调逻辑，保留在 Writing.vue 中：

```js
function closeCharacterPicker(event) {
  if (!event.target.closest?.('.character-picker-field')) {
    characterPickerOpen.value = false;      // 来自 useCharacterPicker
  }
  if (!event.target.closest?.('.prompt-picker-field')) {
    promptPickerOpen.value = false;         // 来自 usePromptPicker
    promptTooltip.value = null;             // 来自 usePromptPicker
  }
  if (!event.target.closest?.('.chapter-mini-actions')) {
    chapterMenuOpenId.value = null;         // 来自 useChapterManagement
  }
}
```

## 技术栈

- Vue 3.5 Composition API (`<script setup>`)
- Pinia 2.3（llmStore）
- Vant 4.9（showToast、van-dialog、van-popup 等）
- Vite 6.4（构建工具）

## 维护指南

### 添加新的 AI 功能
编辑 `useAiConfig.js`，在 `aiFunctions` 数组中添加新配置项即可，前端面板自动适配。

### 添加新的弹窗
1. 在 `src/composables/writing/` 创建 `useXxx.js`
2. 将弹窗的 refs、computed、functions 搬移到 composable
3. 在 Writing.vue 中 import 并调用，解构所需变量
4. 模板部分保持不动（待第二阶段 UI 组件提取）

### 修改现有功能
1. 找到对应的 composable 文件
2. 修改逻辑
3. 确保函数签名不变（避免影响 Writing.vue 的解构调用）
4. 运行 Vite build 验证编译通过

## 已修复的 Bug

- **`showNewBook` ref 丢失**（步骤 11/12 编辑过程中意外删除）：在 `useBookManagement.js` 中恢复定义。
- **行 1069 双 tab 缩进**：`useChapterSummary` 调用行存在 `\t\t` 双缩进，已修复为 `\t`。
