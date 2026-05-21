<template>
  <main class="page tutorial-page">
    <header class="topbar">
      <h1 class="title">使用教程</h1>
      <p class="subtitle">快速上手Ai智能写作系统的各项功能</p>
    </header>

    <div class="toc">
      <span v-for="s in sections" :key="s.id" class="toc-item" @click="scrollTo(s.id)">{{ s.title }}</span>
    </div>

    <article class="tutorial-content" v-html="renderedHtml"></article>
  </main>
</template>

<script setup>
import { computed } from 'vue';
import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

const sections = [
  { id: 'welcome', title: '欢迎' },
  { id: 'writing', title: '写作' },
  { id: 'books', title: '书籍管理' },
  { id: 'chapters', title: '章节管理' },
  { id: 'characters', title: '角色卡' },
  { id: 'wordcards', title: '词条卡' },
  { id: 'creative', title: '创意工具箱' },
  { id: 'prompts', title: '提示词库' },
  { id: 'ai-scan', title: 'AI扫榜' },
  { id: 'ai-settings', title: 'AI设置' },
];

const rawMarkdown = `
## <a id="welcome"></a>欢迎使用Ai智能写作系统

Ai智能写作系统是一款专为网文作者打造的AI辅助写作工具，集成了**AI写作**、**角色管理**、**词条卡系统**、**AI扫榜分析**等功能，帮助你高效创作。

---

## <a id="writing"></a>写作模块

写作模块是核心功能，支持三种模式：

### 写作（全新创作）
选择书籍后，描述你想要的剧情方向，AI会根据你的**角色卡**、**词条卡**和**剧情指令**生成内容。

### 续写（接续前文）
选择已有章节后，AI会读取前文内容作为上下文，根据你的续写要求生成连贯的后续内容。

### 扩写（扩展优化）
对已写内容进行扩展、润色、增加细节描写。

### 写作配置说明

- **风格选择**：选择你想要的写作风格（古风、现代、轻小说等）
- **字数控制**：设置期望的生成字数范围
- **模型切换**：点击模型名称可以切换不同的AI模型（DeepSeek、OpenAI、Claude、Kimi）
- **角色选择**：勾选本章出场的角色，AI会将角色信息作为上下文
- **词条卡选择**：选择要应用的风格/要求/指令词条卡，可多类型组合
- **剧情指令**：额外的分步剧情指导，AI会参考执行

---

## <a id="books"></a>书籍管理

在写作页左侧边栏可以：

- **创建新书**：点击"+"按钮，填写书名和简介
- **切换书籍**：点击已有书籍名即可切换
- **书籍信息**：每本书独立管理自己的章节和字数统计

---

## <a id="chapters"></a>章节管理

- **保存为章节**：生成满意的内容后，点击"保存为章节"将当前内容保存
- **章节列表**：左侧边栏显示当前书籍的所有章节，按章节序号排列
- **点击切换**：点击已保存的章节可以加载到编辑区，方便回顾或续写
- **字数统计**：书籍总字数会自动累计所有章节的字数

---

## <a id="characters"></a>角色卡

角色卡用于系统化管理你的小说角色：

### 创建角色
点击"新增"按钮，填写角色的基本信息：
- **基础信息**：姓名、性别、年龄
- **形象设定**：外貌特征、核心性格
- **背景设定**：出身、关键经历
- **能力设定**：技能、异能、功法（逗号分隔）
- **角色关系**：与其他角色的关系（师徒、敌对、爱慕等）

### 用于写作
在角色卡详情页点击"用于写作"，该角色即被选中。在写作对话框的角色选择器中可以看到已选角色，勾选后AI会了解这些角色。

---

## <a id="wordcards"></a>词条卡

词条卡是独立的微型提示词单元，分为三种类型：

| 类型 | 说明 | 示例 |
|------|------|------|
| **写作风格** | 控制文风 | 古风、轻松、悬疑、热血 |
| **写作要求** | 具体约束 | 开头吸引人、每段不超过3行 |
| **剧情指令** | 情节方向 | 先写冲突再解决、加入反转 |

### 使用方法
1. 在创意工具箱中管理词条卡
2. 写作时在词条卡选择器中选择，支持三种类型组合使用
3. 词条卡内容会自动拼接到AI提示词中

---

## <a id="creative"></a>创意工具箱

包含多种辅助创作的工具：
- **词条卡管理**：创建、编辑、删除词条卡
- **灵感记录**：随时记录创作灵感

---

## <a id="prompts"></a>提示词库

预置和自定义的提示词模板库，支持：
- **搜索提示词**：按关键词查找
- **使用提示词**：点击即可将提示词模板带入写作
- **自定义提示词**：创建自己的提示词模板

---

## <a id="ai-scan"></a>AI扫榜

AI扫榜功能帮你分析热门小说的成功要素：

- **排行榜浏览**：查看热门、新书、完结等多种榜单
- **分类筛选**：按男频/女频及细分品类筛选
- **AI拆书**：点击任意书籍的"AI拆书"按钮，查看AI对本书的详细分析
  - 金手指分析
  - 核心爽点/梗概
  - 人物设定分析
  - 开篇钩子解析
- **细纲抓取**：从书籍详情页进入，支持粘贴文本或链接抓取两种模式
- **热词分析**：查看热门品类的高频关键词

---

## <a id="ai-settings"></a>AI设置

在AI设置页面配置你的AI模型接口：
- **API Key**：填入你的模型API密钥
- **API地址**：自定义API端点地址
- **模型名称**：选择或输入模型名称
- **参数调整**：温度、最大长度等生成参数

目前支持的模型：DeepSeek、OpenAI、Claude、Kimi
`;

const renderedHtml = computed(() => marked(rawMarkdown));

function scrollTo(id) {
  const el = document.querySelector(`a[id="${id}"]`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<style scoped>
.tutorial-page { padding-bottom: 40px; }

.toc {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
}

.toc-item {
  padding: 2px 10px;
  font-size: 12px;
  color: var(--accent);
  background: #f0f5ff;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}

.toc-item:active { background: #dbe4ff; }

.tutorial-content {
  font-size: 14px;
  line-height: 1.8;
  color: var(--ink);
}

.tutorial-content :deep(h2) {
  font-size: 18px;
  margin: 24px 0 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--line);
}

.tutorial-content :deep(h3) {
  font-size: 15px;
  margin: 16px 0 4px;
}

.tutorial-content :deep(ul), .tutorial-content :deep(ol) {
  padding-left: 18px;
  margin: 4px 0;
}

.tutorial-content :deep(li) { margin-bottom: 2px; }

.tutorial-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 13px;
}

.tutorial-content :deep(th) {
  text-align: left;
  padding: 6px 8px;
  background: #f5f7fa;
  border: 1px solid var(--line);
  font-weight: 600;
}

.tutorial-content :deep(td) {
  padding: 4px 8px;
  border: 1px solid var(--line);
}

.tutorial-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--line);
  margin: 16px 0;
}

.tutorial-content :deep(strong) { color: #333; }

.tutorial-content :deep(code) {
  padding: 1px 5px;
  background: #f5f5f5;
  border-radius: 3px;
  font-size: 13px;
}
</style>
