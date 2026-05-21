<template>
  <main class="page writing-page" :class="{ 'is-editor': activeBook }">
    <section v-if="!activeBook" class="bookshelf-view">
      <div class="notice-bar">
        <van-icon name="info-o" />
        <span>点击添加客服微信 可领取3万字字数包和交流群，五一特惠还有最后1天</span>
        <van-icon name="cross" class="notice-close" />
      </div>

      <section class="works-panel">
        <div class="works-tabs">
          <button class="tab active"><van-icon name="bookmark-o" />作品</button>
          <button class="tab"><van-icon name="archive-o" />已归档</button>
          <button class="tab"><van-icon name="delete-o" />回收站</button>
        </div>

        <div class="works-toolbar">
          <button class="folder-btn"><van-icon name="add" />新建文件夹</button>
          <div class="toolbar-spacer"></div>
          <button class="icon-btn active" title="宫格视图"><van-icon name="apps-o" /></button>
          <button class="icon-btn" title="列表视图"><van-icon name="bars" /></button>
          <button class="pill active">全部</button>
          <button class="pill"><van-icon name="bookmark-o" />小说</button>
          <button class="pill"><van-icon name="label-o" />剧本</button>
          <div class="search-box">
            <van-icon name="search" />
            <input v-model="bookKeyword" placeholder="搜索书籍..." />
          </div>
          <button class="manage-btn"><van-icon name="todo-list-o" />批量管理</button>
        </div>

        <div class="book-grid">
          <article class="create-card">
            <button class="create-plus" @click="showNewBook = true"><van-icon name="plus" /></button>
            <h2>新建作品</h2>
            <div class="create-actions">
              <button @click="showNewBook = true"><van-icon name="plus" />新建作品</button>
              <button @click="showToast('导入作品功能稍后接入')"><van-icon name="sign" />导入作品</button>
            </div>
          </article>

          <article
            v-for="book in filteredBooks"
            :key="book.id"
            class="work-card"
            @click="selectBook(book)"
          >
            <div class="book-cover" :style="book.cover_url ? { backgroundImage: `url(${book.cover_url})` } : null">
              <span v-if="!book.cover_url">星月<br />写作</span>
            </div>
            <div class="book-meta">
              <h3>{{ book.title }}</h3>
              <p>{{ book.description || '暂无简介' }}</p>
              <div class="book-tags">
                <span>{{ book.style || '小说' }}</span>
                <strong>{{ formatWords(book.total_words) }}字</strong>
              </div>
              <small>创建于{{ formatRelativeTime(book.created_at) }}</small>
            </div>
            <div class="book-actions">
              <button @click.stop="createChapterForBook(book)">新建章节</button>
              <button @click.stop="selectBook(book)">作品管理</button>
              <button class="delete-btn" @click.stop="confirmDeleteBook(book)">删除</button>
            </div>
          </article>
        </div>

        <div v-if="!filteredBooks.length && books.length" class="empty-line">没有匹配的作品</div>
      </section>
    </section>

    <section v-else class="editor-view">
      <header class="editor-top">
        <div class="editor-left-tools">
          <button class="top-icon" title="返回作品列表" @click="backToShelf"><van-icon name="arrow-left" /></button>
          <button class="top-icon" title="全屏"><van-icon name="expand-o" /></button>
          <button class="top-icon" title="目录"><van-icon name="notes-o" /></button>
        </div>

        <nav class="ai-function-bar">
          <button
            v-for="fn in aiFunctions"
            :key="fn.key"
            :class="{ active: aiPanelOpen && activeAiKey === fn.key }"
            @click="openAiPanel(fn.key)"
          >
            {{ fn.label }}
          </button>
        </nav>

        <div class="editor-right-tools">
          <span class="saved-at">最后保存：{{ lastSavedText }}</span>
          <button class="top-icon" title="保存" :disabled="saving" @click="saveCurrentChapter"><van-icon name="replay" /></button>
          <button class="top-icon" title="设置" @click="showBookSettings = true"><van-icon name="setting-o" /></button>
          <button class="top-icon" title="更多"><van-icon name="ellipsis" /></button>
        </div>
      </header>

      <div class="editor-body">
        <aside class="chapter-sidebar">
          <div class="book-strip">
            <span>{{ activeBook.style || '小说' }}</span>
            <strong>{{ activeBook.title }}</strong>
          </div>

          <div class="chapter-actions">
            <button @click="addChapter"><van-icon name="plus" />新建章节</button>
            <button @click="showToast('导入章节功能稍后接入')"><van-icon name="sign" /></button>
            <button><van-icon name="sort" /></button>
            <button><van-icon name="ellipsis" /></button>
          </div>

          <div class="chapter-list">
            <article
              v-for="ch in chapters"
              :key="ch.id"
              class="chapter-item"
              :class="{ active: activeChapter?.id === ch.id }"
              role="button"
              tabindex="0"
              @click="selectChapter(ch)"
              @keydown.enter="selectChapter(ch)"
            >
              <div>
                <strong>{{ chapterName(ch) }}</strong>
                <span>{{ ch.updated_at ? `创建于${formatDateTime(ch.updated_at)}` : '未保存' }}</span>
                <div v-if="activeChapter?.id === ch.id" class="chapter-mini-actions">
                  <button type="button" @click.stop="openChapterSummary(ch)">章节概要</button>
                  <button type="button" title="生成章节概要" :disabled="summaryGeneratingId === ch.id" @click.stop="generateChapterSummary(ch)">
                    <van-loading v-if="summaryGeneratingId === ch.id" size="12" color="#15945a" />
                    <van-icon v-else name="edit" />生成
                  </button>
                  <button type="button" class="danger" @click.stop="removeChapter(ch)">删除</button>
                  <button type="button" class="more-trigger" title="更多" @click.stop="toggleChapterMenu(ch, $event)">...</button>
                  <div v-if="chapterMenuOpenId === ch.id" class="chapter-more-menu" :style="{ top: chapterMenuPosition.top + 'px', left: chapterMenuPosition.left + 'px' }" @click.stop>
                    <button type="button" @click="insertChapterAround(ch, 'before')">向前插入一章</button>
                    <button type="button" @click="insertChapterAround(ch, 'after')">向后插入一章</button>
                    <button type="button" @click="chapterMenuOpenId = null; showToast('章节起名功能稍后接入')">章节起名</button>
                    <button type="button" @click="chapterMenuOpenId = null; showToast('章节起名（自动）功能稍后接入')">章节起名（自动）</button>
                    <button type="button" @click="chapterMenuOpenId = null; showToast('章节起名（批量）功能稍后接入')">章节起名（批量）</button>
                    <button type="button" @click="exportChapter(ch)">导出章节</button>
                  </div>
                </div>
              </div>
              <small>{{ ch.word_count || 0 }}字</small>
            </article>

            <div v-if="!chapters.length" class="chapter-empty">
              <p>还没有章节</p>
              <button @click="addChapter">新建第1章</button>
            </div>
          </div>
        </aside>

        <section class="chapter-editor">
          <div class="editor-card">
            <div class="inline-toolbar">
              <button><van-icon name="revoke" /></button>
              <button><van-icon name="exchange" /></button>
              <button><van-icon name="description-o" /></button>
              <i></i>
              <button><van-icon name="scan" /></button>
              <button><van-icon name="search" /></button>
              <i></i>
              <button><van-icon name="brush-o" /></button>
              <button><van-icon name="notes-o" /></button>
              <button><van-icon name="manager-o" /></button>
              <button><van-icon name="magic-o" /></button>
              <i></i>
              <button class="keyword-replace-btn" title="批量修改关键词" @click="openKeywordReplace"><van-icon name="replace" /><span>批量修改</span></button>
            </div>

            <div class="title-line">
              <van-icon name="magic-o" />
              <input
                v-model="draftTitle"
                placeholder="请输入章节标题"
                maxlength="35"
                @input="markDirty"
                @blur="saveCurrentChapter"
              />
              <span>{{ draftTitle.length }} / 35</span>
            </div>

            <!-- 富文本编辑器 -->
            <TiptapEditor
              ref="editorRef"
              v-model="draftContent"
              :read-only="isPreviewActive"
              :show-markers="true"
              :highlighted-range="highlightedParagraphRange"
              :placeholder="'请输入章节内容'"
              @selection-change="onEditorSelectionChange"
              @text-change="onEditorTextChange"
            />

            <!-- 修复对比预览（新版 Block 对比） -->
            <div v-if="repairDiffData" class="repair-diff-preview">
              <div class="repair-diff-header">
                <van-icon name="eye-o" />
                <strong>修复对比 — 审稿问题已自动修复</strong>
                <button class="repair-diff-dismiss" @click="repairDiffData = null">
                  <van-icon name="cross" />
                </button>
              </div>
              <BlockDiffView
                :diff-paragraphs="repairDiffParagraphs"
                :stats="repairDiffData.stats"
                :full-result-text="repairedContent || ''"
                :initial-visible="15"
              />
            </div>

            <!-- AI 改写预览（新版：候选版本 + 约束 + Block对比） -->
            <div v-if="showCandidatesPreview" class="ai-candidates-preview">
              <div class="candidates-preview-header">
                <van-icon name="eye-o" />
                <strong>AI 改写预览</strong>
                <span class="candidates-preview-hint">{{ candidates.length }} 个候选版本</span>
                <button class="candidates-preview-dismiss" @click="dismissCandidatesPreview">
                  <van-icon name="cross" />
                </button>
              </div>
              <div v-if="showConstraintBar" class="constraint-bar">
                <van-icon name="info-o" />
                <span>约束：{{ constraintSummary }}</span>
              </div>
              <CandidateSwitcher
                :candidates="candidates"
                :active-id="activeCandidateId"
                @select="selectCandidate"
              />
              <BlockDiffView
                v-if="activeCandidateDiff.paragraphs.length > 0"
                :diff-paragraphs="activeCandidateDiff.paragraphs"
                :stats="activeCandidateDiff.stats"
                :full-result-text="activeCandidate?.content || ''"
                :initial-visible="15"
              />
              <div class="candidates-preview-actions">
                <button class="candidates-apply-btn" @click="applyCandidatesResult('replace')">
                  {{ hasActiveSelection ? '替换选中段落' : '替换正文' }}
                </button>
                <button class="candidates-apply-btn secondary" @click="applyCandidatesResult('append')">追加到正文</button>
                <button class="candidates-dismiss-btn" @click="dismissCandidatesPreview">丢弃</button>
                <button class="candidates-regenerate-btn" @click="regenerateCandidates" :disabled="aiLoading">
                  <van-loading v-if="aiLoading" size="14" />
                  <van-icon v-else name="replay" />
                  再生成
                </button>
              </div>
            </div>

            <div class="word-counter">{{ draftWordCount }}</div>
          </div>
        </section>

        <aside v-if="aiPanelOpen" class="ai-panel" :class="{ 'ai-rule-panel': isCorrectionTool }">
          <div class="ai-panel-head">
            <div>
              <h2>{{ activeAiConfig.title }}</h2>
              <p>{{ activeAiConfig.description }}</p>
            </div>
            <button v-if="isCorrectionTool" class="plain-text-btn" @click="resetCorrectionRules">重置规则</button>
            <button title="关闭" @click="aiPanelOpen = false"><van-icon name="cross" /></button>
          </div>

          <template v-if="isCorrectionTool">
            <div class="ai-panel-body">
            <div class="correction-stats">
              <span>待检测文本字数：{{ aiForm.sourceText.length }}</span>
              <span>当前章正文会作为关联内容计算</span>
            </div>

            <label class="field">
              <span>模型</span>
              <select v-model="selectedProvider" class="provider-select">
                <option v-for="p in llmStore.activeProviders" :key="p.provider" :value="p.provider">
                  {{ p.displayName }}
                </option>
              </select>
              <div class="model-input-wrap">
                <input
                  v-model="aiForm.model"
                  list="correction-model-list"
                  class="model-input"
                  placeholder="输入或选择模型"
                />
                <datalist id="correction-model-list">
                  <option v-for="m in currentModels" :key="m" :value="m" />
                </datalist>
              </div>
            </label>

            <div class="correction-scope">
              <span>仅对已勾选规则生效</span>
              <div>
                <button @click="setCorrectionRules(true)">全选</button>
                <button @click="setCorrectionRules(false)">全不选</button>
              </div>
            </div>

            <div class="correction-rules">
              <article v-for="rule in correctionRules" :key="rule.key" class="correction-rule">
                <div>
                  <strong><i></i>{{ rule.title }}</strong>
                  <p>{{ rule.description }}</p>
                  <button>编辑</button>
                  <button class="danger">删除</button>
                </div>
                <label class="rule-check">
                  <input v-model="rule.enabled" type="checkbox" />
                  <span>启用</span>
                </label>
              </article>
            </div>

            </div>
            <div class="ai-panel-footer">
              <button class="secondary-btn" type="button" @click="showToast('自定义纠错规则稍后接入')">添加规则</button>
              <button :disabled="aiLoading" @click="runAi">
                <van-loading v-if="aiLoading" size="14" color="#fff" />
                <van-icon v-else name="edit" />
                {{ aiLoading ? '检查中' : '开始检查' }}
              </button>
            </div>
          </template>

          <template v-else-if="activeAiConfig.key === 'review'">
            <div class="ai-panel-body">
              <label class="field">
                <span>AI模型</span>
                <select v-model="selectedProvider" class="provider-select">
                  <option v-for="p in llmStore.activeProviders" :key="p.provider" :value="p.provider">
                    {{ p.displayName }}
                  </option>
                </select>
                <div class="model-input-wrap">
                  <input
                    v-model="aiForm.model"
                    list="ai-model-list"
                    class="model-input"
                    placeholder="输入或选择模型"
                  />
                  <datalist id="ai-model-list">
                    <option v-for="m in currentModels" :key="m" :value="m" />
                  </datalist>
                </div>
              </label>

              <ReviewPanel
                :novel-id="activeBook?.id"
                :chapter-id="activeChapter?.id"
                :content="draftContent"
                :provider="selectedProvider"
                :model="aiForm.model"
                :repair-loading="repairLoading"
                @repair="onStartRepair"
                @review-done="onReviewDone"
              />

              <RepairPanel
                v-if="showRepairPanel"
                :novel-id="activeBook?.id"
                :chapter-id="activeChapter?.id"
                :content="draftContent"
                :issues="currentReviewIssues"
                :provider="selectedProvider"
                :model="aiForm.model"
                @apply="onApplyRepair"
                @done="onRepairDone"
                @diff-ready="wrappedOnRepairDiffReady"
              />

              <QualityReportPanel
                :novel-id="activeBook?.id"
              />
            </div>
          </template>

          <template v-else>
          <div class="ai-panel-body">
          <label class="switch-row">
            <span>高级功能</span>
            <van-switch v-model="aiForm.advanced" size="22px" />
          </label>
          <p class="helper-text">通过提供角色、词条、关联知识库等元数据，能够有效提高 AI 创作内容的质量和相关性</p>

          <label class="field">
            <span>AI模型</span>
            <select v-model="selectedProvider" class="provider-select">
              <option v-for="p in llmStore.activeProviders" :key="p.provider" :value="p.provider">
                {{ p.displayName }}
              </option>
            </select>
            <div class="model-input-wrap">
              <input
                v-model="aiForm.model"
                list="ai-model-list"
                class="model-input"
                placeholder="输入或选择模型"
              />
              <datalist id="ai-model-list">
                <option v-for="m in currentModels" :key="m" :value="m" />
              </datalist>
            </div>
          </label>

          <div v-if="showVariantSelector" class="field">
            <span>功能细分</span>
            <div class="segmented variant-segmented">
              <button
                v-for="variant in activeToolVariants"
                :key="variant.key"
                type="button"
                :class="{ active: activeToolVariant?.key === variant.key }"
                @click="selectToolVariant(variant)"
              >
                {{ variant.label }}
              </button>
            </div>
            <p v-if="activeToolVariant" class="variant-hint">{{ activeToolVariant.instruction }}</p>
          </div>

          <div v-if="isOutlineTool" class="outline-grid">
            <div class="field compact character-picker-field">
              <span>需求角色</span>
              <button class="character-picker-trigger" type="button" @click.stop="openCharacterPicker">
                <span v-if="selectedCharacters.length" class="character-picker-tags">
                  <em v-for="character in selectedCharacters.slice(0, 3)" :key="character.id">{{ character.name }}</em>
                  <small v-if="selectedCharacters.length > 3">+{{ selectedCharacters.length - 3 }}</small>
                </span>
                <span v-else class="character-picker-placeholder">请选择角色</span>
              </button>
              <div v-if="characterPickerOpen" class="character-picker-popover" @click.stop>
                <div class="character-search">
                  <van-icon name="search" />
                  <input v-model="characterKeyword" placeholder="搜索角色" />
                </div>
                <div v-if="filteredCharacters.length" class="character-options">
                  <label v-for="character in filteredCharacters" :key="character.id" class="character-option">
                    <input type="checkbox" :checked="isCharacterSelected(character.id)" @change="toggleCharacter(character)" />
                    <span>
                      <strong>{{ character.name }}</strong>
                      <small>{{ character.personality || character.background || '暂无角色简介' }}</small>
                    </span>
                  </label>
                </div>
                <div v-else class="character-empty">
                  <i>!</i>
                  <span>无预设角色</span>
                </div>
                <div class="character-picker-actions">
                  <button type="button" @click="selectAllCharacters">全选</button>
                  <button type="button" @click="goCharacterManagement">角色管理</button>
                </div>
              </div>
            </div>
            <label class="field compact">
              <span>面板快捷键</span>
              <select v-model="aiForm.shortcut">
                <option>Alt+K/Command+K</option>
              </select>
            </label>
            <div class="field compact prompt-picker-field">
              <span>续写要求 <b>*</b></span>
              <button class="prompt-picker-trigger" type="button" @click.stop="openPromptPicker">
                <span v-if="selectedRequirementPrompt">{{ selectedRequirementPrompt.title }}</span>
                <span v-else class="prompt-picker-placeholder">请选择提示词</span>
              </button>
              <!-- 选中提示词后，下方展示内置Prompt完整内容 -->
              <div v-if="selectedRequirementPrompt" class="prompt-builtin-box">
                <div class="prompt-builtin-header">
                  <van-icon name="info-o" />
                  <span>内置Prompt：{{ selectedRequirementPrompt.title }}</span>
                </div>
                <div class="prompt-builtin-content">
                  <pre>{{ selectedRequirementPrompt.content }}</pre>
                </div>
              </div>
              <div v-if="promptPickerOpen" class="prompt-picker-popover" @click.stop>
                <div class="prompt-search">
                  <van-icon name="search" />
                  <input v-model="promptKeyword" placeholder="搜索提示词..." @input="loadRequirementPrompts" />
                  <button type="button" @click="loadRequirementPrompts">搜索</button>
                </div>
                <div v-if="availableRequirementPrompts.length" class="prompt-options">
                  <button
                    v-for="prompt in availableRequirementPrompts"
                    :key="prompt.id"
                    type="button"
                    :class="{ active: aiForm.relatedPromptId === prompt.id }"
                    @click="selectRequirementPrompt(prompt)"
                  >
                    <i @mouseenter="showPromptTooltip($event, prompt)" @mouseleave="hidePromptTooltip">详情</i>
                    <span>{{ prompt.title }}</span>
                    <van-icon v-if="aiForm.relatedPromptId === prompt.id" name="success" />
                  </button>
                </div>
                <div v-else class="prompt-empty">暂无可选提示词</div>
                <div v-if="promptTooltip" class="prompt-tooltip-popover" :style="promptTooltipStyle">
                  <pre>{{ promptTooltip.content }}</pre>
                </div>
                <div class="prompt-picker-actions">
                  <button type="button" @click="showCreatePromptTip">创建</button>
                  <button type="button" @click="goPromptLibrary">更多提示词</button>
                </div>
              </div>
            </div>
          </div>

          <label v-if="isTextProcessMode" class="field">
            <span>
              {{ activeAiConfig.sourceLabel || '处理文本' }}
              <small>（优先使用正文中划选的段落，超过2500字不会发送给AI）</small>
              <b>*</b>
            </span>
            <textarea
              v-model="aiForm.sourceText"
              maxlength="2500"
              :placeholder="`划选正文段落后点击 ${activeAiConfig.label}，或直接在这里输入要处理的文本`"
            ></textarea>
            <em>{{ aiForm.sourceText.length }}/2500</em>
          </label>

          <label v-else class="field">
            <span>{{ isOutlineTool ? '后续剧情' : '本章剧情' }}<small v-if="!isOutlineTool">（按 Alt+K/Command+K 可打开快捷输入）</small></span>
            <textarea v-model="aiForm.plot" maxlength="3000" :placeholder="isOutlineTool ? '请输入后续剧情' : '在这里输入你的剧情片段或者细纲'"></textarea>
            <em>{{ aiForm.plot.length }}/3000</em>
          </label>

          <!-- 上下文感知卡片（所有AI模式显示） -->
          <div v-if="!isTextProcessMode" class="context-awareness-card">
            <div class="context-card-header" @click="contextCardExpanded = !contextCardExpanded">
              <span class="context-card-title">📦 上下文感知</span>
              <span class="context-card-summary">{{ contextSummary }}</span>
              <van-icon :name="contextCardExpanded ? 'arrow-up' : 'arrow-down'" />
            </div>
            <div v-if="contextCardExpanded" class="context-card-body">
              <div v-if="currentStyleProfile || aiForm.style" class="context-item">
                <span class="context-label">风格</span>
                <span class="context-preview">{{ (currentStyleProfile || aiForm.style || '').slice(0, 80) }}{{ (currentStyleProfile || aiForm.style || '').length > 80 ? '...' : '' }}</span>
              </div>
              <div v-if="selectedCharactersForPrompt.length" class="context-item">
                <span class="context-label">角色</span>
                <span class="context-preview">{{ selectedCharactersForPrompt.map(c => c.name + '(' + [c.gender, c.age, c.personality].filter(Boolean).join(',') + ')').join('、').slice(0, 120) }}</span>
              </div>
              <div v-if="chapterOutlineChain.length" class="context-item">
                <span class="context-label">概要</span>
                <span class="context-preview">已收集 {{ chapterOutlineChain.length }} 章概要：{{ chapterOutlineChain.map(o => o.title).join(' → ').slice(0, 100) }}</span>
              </div>
              <div v-if="autoCollectEnabled && previousChapterExcerpt" class="context-item">
                <span class="context-label">参考</span>
                <span class="context-preview">上一章末尾 {{ previousChapterExcerpt.length }} 字（用于风格衔接）</span>
              </div>
              <div v-if="linkedChapterList.length" class="context-item">
                <span class="context-label">关联</span>
                <span class="context-preview">{{ linkedChapterList.map(c => (c.title || '第'+c.chapter_index+'章') + '(' + (c.content || '').slice(0, 2000).length + '字)').join('、').slice(0, 120) }}</span>
              </div>
              <div class="context-token-bar">
                <span class="context-label">预估</span>
                <span class="context-token-text">约 {{ contextTokenEstimate }} tokens / 上限 12,000</span>
                <div class="token-progress">
                  <div class="token-fill" :style="{ width: Math.min(contextTokenPercent, 100) + '%' }" :class="contextTokenClass"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 关联章节（所有AI模式显示，非文本处理模式） -->
          <div v-if="!isTextProcessMode" class="knowledge-block">
            <div class="knowledge-header">
              <h3>关联知识库 <small>（已选 {{ linkedChapterIds.size }} 章，{{ linkedChaptersWordCount }} 字）</small></h3>
              <label class="auto-collect-toggle">
                <input type="checkbox" v-model="autoCollectEnabled" />
                <span>自动收集前文上下文</span>
              </label>
            </div>
            <section>
              <div v-if="linkedChapterList.length === 0" class="knowledge-empty">未选择任何章节（开启自动收集后将自动关联最近3章）</div>
              <div v-else class="knowledge-chips">
                <span v-for="ch in linkedChapterList" :key="ch.id" class="knowledge-chip">
                  {{ ch.title || '第' + ch.chapter_index + '章' }}
                  <button class="chip-remove" @click="toggleChapterLink(ch)">x</button>
                </span>
              </div>
              <div class="knowledge-actions">
                <button @click="linkRecentChapters(3)" :disabled="chapters.length === 0">最近3章</button>
                <button @click="linkRecentChapters(5)" :disabled="chapters.length === 0">最近5章</button>
                <button @click="chapterPickerOpen = true" :disabled="chapters.length === 0">选择章节</button>
                <button v-if="linkedChapterIds.size > 0" class="btn-clear" @click="clearLinkedChapters">清除</button>
              </div>
            </section>
          </div>

          <div v-if="showTextProcessActions" class="field">
            <span>处理方式</span>
            <div class="segmented">
              <button
                v-for="action in textProcessActions"
                :key="action.value"
                type="button"
                :class="{ active: aiForm.expandAction === action.value }"
                @click="aiForm.expandAction = action.value"
              >
                {{ action.label }}
              </button>
            </div>
          </div>

          <!-- === 写作风格区域 === -->
          <div class="field">
            <span>写作风格</span>
            <div class="segmented">
              <button :class="{ active: aiForm.styleMode === 'preset' }"
                @click="aiForm.styleMode = 'preset'">快捷选项</button>
              <button :class="{ active: aiForm.styleMode === 'custom' }"
                @click="aiForm.styleMode = 'custom'">自定义</button>
              <button :class="{ active: aiForm.styleMode === 'more' }"
                @click="aiForm.styleMode = 'more'">更多</button>
            </div>

            <!-- 快捷选项模式 -->
            <template v-if="aiForm.styleMode === 'preset'">
              <select v-model="aiForm.stylePreset">
                <option v-for="item in displayStylePresets" :key="item">{{ item }}</option>
              </select>
              <div v-if="selectedStylePresetContent" class="preset-content-box">
                <div class="preset-content-header">
                  <van-icon name="info-o" />
                  <span>写作风格Prompt：{{ aiForm.stylePreset }}</span>
                </div>
                <div class="preset-content-body">
                  <pre>{{ selectedStylePresetContent }}</pre>
                </div>
              </div>
              <p class="orange-tip">使用方法：推荐使用细腻版，温度0.8　查看介绍</p>
            </template>

            <!-- 自定义模式 -->
            <div v-if="aiForm.styleMode === 'custom'" class="custom-input-group">
              <textarea v-model="aiForm.customStylePrompt"
                class="custom-textarea"
                placeholder="输入自定义写作风格指令，例如：&#10;- 多用短句，段落不超过3行&#10;- 减少形容词和副词&#10;- 对话占比30%以上&#10;- 第一人称视角，口语化表达"
                rows="5"></textarea>
              <div class="custom-input-actions">
                <button @click="openSaveStyleDialog" :disabled="!aiForm.customStylePrompt.trim()">
                  <van-icon name="add-o" /> 保存为预设
                </button>
              </div>
            </div>

            <!-- 更多模式：预设列表 -->
            <div v-if="aiForm.styleMode === 'more'" class="more-presets-panel">
              <div
                v-for="(preset, idx) in allStylePresets"
                :key="preset.title"
                class="preset-card"
                :class="{ 'is-selected': aiForm.stylePreset === preset.title }"
                @click="selectStylePreset(preset)"
              >
                <div class="preset-card-head">
                  <strong>{{ preset.title }}</strong>
                  <div class="preset-card-tags">
                    <van-tag v-if="preset.isCustom" type="warning" plain size="small">自定义</van-tag>
                    <van-tag v-if="aiForm.stylePreset === preset.title" type="primary" size="small">当前</van-tag>
                  </div>
                </div>
                <pre class="preset-card-body">{{ preset.content || '（暂无内容预览，选中后可查看）' }}</pre>
                <div class="preset-card-foot" v-if="preset.isCustom">
                  <button class="text-btn danger" @click.stop="deleteStylePreset(idx); if (aiForm.stylePreset === preset.title) { aiForm.stylePreset = ''; aiForm.customStylePrompt = ''; }">删除</button>
                </div>
              </div>
            </div>

            <!-- 从文本提取风格 -->
            <div class="extract-style-row" v-if="aiForm.styleMode !== 'more'">
              <button type="button" class="extract-style-btn" @click="openExtractStyleDialog">
                <van-icon name="fire-o" /> 从文本提取风格
              </button>
            </div>
          </div>

          <!-- === 写作要求区域 === -->
          <div class="field">
            <span>{{ requirementLabel }}<b v-if="isTextProcessMode || isOutlineTool">*</b></span>
            <div class="segmented">
              <button :class="{ active: aiForm.requirementMode === 'preset' }"
                @click="aiForm.requirementMode = 'preset'">快捷选项</button>
              <button :class="{ active: aiForm.requirementMode === 'custom' }"
                @click="aiForm.requirementMode = 'custom'">自定义</button>
              <button :class="{ active: aiForm.requirementMode === 'more' }"
                @click="aiForm.requirementMode = 'more'">更多</button>
            </div>

            <!-- 快捷选项模式 -->
            <template v-if="aiForm.requirementMode === 'preset'">
              <select v-model="aiForm.requirementPreset">
                <option v-for="item in displayRequirementPresets" :key="item">{{ item }}</option>
              </select>
              <div v-if="selectedRequirementPresetContent" class="preset-content-box">
                <div class="preset-content-header">
                  <van-icon name="info-o" />
                  <span>{{ requirementLabel }}Prompt：{{ aiForm.requirementPreset }}</span>
                </div>
                <div class="preset-content-body">
                  <pre>{{ selectedRequirementPresetContent }}</pre>
                </div>
              </div>
              <p class="orange-tip">使用方法：必须搭配一整章才是完整的提示词，推荐使用细腻版，温度0.8　查看介绍</p>
            </template>

            <!-- 自定义模式 -->
            <div v-if="aiForm.requirementMode === 'custom'" class="custom-input-group">
              <textarea v-model="aiForm.customRequirementPrompt"
                class="custom-textarea"
                placeholder="输入自定义写作要求指令，例如：&#10;- 开头必须在三段内抛出悬念&#10;- 每段控制在5行以内&#10;- 结尾必须留钩子&#10;- 保持与前文一致的人称和时态"
                rows="5"></textarea>
              <div class="custom-input-actions">
                <button @click="openSaveRequirementDialog" :disabled="!aiForm.customRequirementPrompt.trim()">
                  <van-icon name="add-o" /> 保存为预设
                </button>
              </div>
            </div>

            <!-- 更多模式：预设列表 -->
            <div v-if="aiForm.requirementMode === 'more'" class="more-presets-panel">
              <div
                v-for="(preset, idx) in allRequirementPresets"
                :key="preset.title"
                class="preset-card"
                :class="{ 'is-selected': aiForm.requirementPreset === preset.title }"
                @click="selectRequirementPreset(preset)"
              >
                <div class="preset-card-head">
                  <strong>{{ preset.title }}</strong>
                  <div class="preset-card-tags">
                    <van-tag v-if="preset.isCustom" type="warning" plain size="small">自定义</van-tag>
                    <van-tag v-if="aiForm.requirementPreset === preset.title" type="primary" size="small">当前</van-tag>
                  </div>
                </div>
                <pre class="preset-card-body">{{ preset.content || '（暂无内容预览，选中后可查看）' }}</pre>
                <div class="preset-card-foot" v-if="preset.isCustom">
                  <button class="text-btn danger" @click.stop="deleteRequirementPreset(idx); if (aiForm.requirementPreset === preset.title) { aiForm.requirementPreset = ''; aiForm.customRequirementPrompt = ''; }">删除</button>
                </div>
              </div>
            </div>
          </div>
          <!-- 提示词内容预览 -->
          <div class="prompt-preview-box" v-if="selectedPresetContent" :class="{ expanded: showPresetContent }">
            <div class="prompt-preview-head" @click="showPresetContent = !showPresetContent">
              <van-icon :name="showPresetContent ? 'arrow-down' : 'arrow-up'" />
              <span>当前提示词内容预览</span>
              <small>{{ selectedPresetContent.length }} 字</small>
            </div>
            <pre class="prompt-preview-body" v-show="showPresetContent">{{ selectedPresetContent }}</pre>
          </div>

          <div class="field-row">
            <label class="field compact">
              <span>风格</span>
              <select v-model="aiForm.style">
                <option v-for="style in styles" :key="style.name" :value="style.name">{{ style.name }}</option>
              </select>
            </label>
            <label class="field compact">
              <span>字数</span>
              <input v-model.number="aiForm.wordCount" type="number" min="200" max="5000" />
            </label>
          </div>

          <!-- 结构化约束（文本处理模式下显示） -->
          <div v-if="isTextProcessMode" class="constraint-section">
            <div class="constraint-header" @click="constraints.advancedOpen = !constraints.advancedOpen">
              <span>修改约束</span>
              <small>{{ constraints.enabledCount }}/4 项启用</small>
              <van-icon :name="constraints.advancedOpen ? 'arrow-up' : 'arrow-down'" />
            </div>
            <div v-if="constraints.advancedOpen" class="constraint-list">
              <label v-for="(desc, key) in constraints.constraintLabels" :key="key" class="constraint-item">
                <input type="checkbox" :checked="constraints.constraints[key]" @change="constraints.toggleConstraint(key)" />
                <span>
                  <strong>{{ desc }}</strong>
                  <small>{{ constraints.constraintDescriptions[key] }}</small>
                </span>
              </label>
            </div>
          </div>

          <label class="field">
            <span>补充要求</span>
            <textarea v-model="aiForm.customRequirement" class="short" placeholder="可选：输入本次 AI 处理的额外要求"></textarea>
          </label>

          <div v-if="aiForm.result && !isTextProcessMode" class="ai-result">
            <strong>生成结果</strong>
            <p>{{ aiForm.result }}</p>
            <div class="result-actions">
              <button @click="applyAiResult('replace')">{{ hasActiveSelection ? '替换选中段落' : '替换正文' }}</button>
              <button @click="applyAiResult('append')">追加到正文</button>
            </div>
          </div>

          </div>
          <div class="ai-panel-footer">
            <span>以上内容均由AI生成，仅供参考和借鉴</span>
            <button :disabled="aiLoading" @click="runAi">
              <van-loading v-if="aiLoading" size="14" color="#fff" />
              <van-icon v-else name="edit" />
              {{ aiLoading ? `${runButtonText}中` : runButtonText }}
            </button>
          </div>
          </template>
        </aside>
      </div>
    </section>

    <van-overlay :show="showNewBook" @click="showNewBook = false">
      <div class="popup" @click.stop>
        <h3>新建作品</h3>
        <van-field v-model="newBookTitle" label="书名" placeholder="给你的作品起个名字" clearable />
        <van-field v-model="newBookDesc" label="简介" placeholder="一句话描述（可选）" clearable />
        <div class="field-row">
          <span class="field-label">风格</span>
          <select v-model="newBookStyle" class="popup-select">
            <option v-for="style in styles" :key="style.name" :value="style.name">{{ style.name }}</option>
          </select>
        </div>
        <div class="field-row import-row">
          <span class="field-label">导入细纲</span>
          <select v-model="newBookOutlineJobId" class="popup-select">
            <option :value="0">不导入</option>
            <option v-for="job in savedOutlineJobs" :key="job.id" :value="job.id">
              {{ job.novel_title }}（{{ job.chapter_count }}章）
            </option>
          </select>
          <van-loading v-if="loadingOutlineJobs" size="14" />
        </div>
        <van-button type="primary" block :loading="creating" @click="createBook">创建</van-button>
        <van-button block @click="showNewBook = false">取消</van-button>
      </div>
    </van-overlay>

    <van-overlay :show="summaryModalOpen" @click="summaryModalOpen = false">
      <div class="summary-popup" @click.stop>
        <header>
          <h3>编辑章节概要</h3>
          <button type="button" @click="generateChapterSummary(summaryChapter, { keepOpen: true })"><van-icon name="replay" />刷新</button>
          <button type="button" class="ok-icon" @click="saveChapterSummary"><van-icon name="success" /></button>
          <button type="button" @click="summaryModalOpen = false"><van-icon name="cross" /></button>
        </header>
        <textarea v-model="summaryDraft" maxlength="1200" placeholder="请输入章节概要"></textarea>
        <em>{{ summaryDraft.length }}</em>
        <p>AI生成概要功能会以关联本章节的形式扣除字数</p>
        <footer>
          <button type="button" class="primary" :disabled="summaryGeneratingId === summaryChapter?.id" @click="generateChapterSummary(summaryChapter, { keepOpen: true })">
            <van-loading v-if="summaryGeneratingId === summaryChapter?.id" size="13" color="#fff" />
            <van-icon v-else name="magic-o" />一键生成
          </button>
          <button type="button" class="success" :disabled="batchSummaryLoading" @click="batchGenerateSummaries"><van-icon name="bars" />批量生成</button>
          <button type="button" class="warning" :disabled="summaryGeneratingId === summaryChapter?.id" @click="generateChapterSummary(summaryChapter, { keepOpen: true })">生成概要</button>
          <button type="button" class="save" @click="saveChapterSummary">保存</button>
        </footer>
      </div>
    </van-overlay>

    <!-- 批量修改关键词弹窗 -->
    <van-overlay :show="keywordReplaceOpen" @click="keywordReplaceOpen = false">
      <div class="keyword-replace-popup" @click.stop>
        <header>
          <h3>批量修改关键词</h3>
          <button type="button" @click="keywordReplaceOpen = false"><van-icon name="cross" /></button>
        </header>

        <div class="keyword-replace-body">
          <div class="keyword-replace-scope">
            <span>修改范围</span>
            <div class="segmented">
              <button :class="{ active: keywordReplaceScope === 'current' }" @click="keywordReplaceScope = 'current'">当前章节</button>
              <button :class="{ active: keywordReplaceScope === 'all' }" @click="keywordReplaceScope = 'all'">全部章节</button>
            </div>
          </div>

          <div class="keyword-replace-entries">
            <div v-for="(entry, i) in keywordReplaceEntries" :key="i" class="keyword-replace-row">
              <div class="keyword-replace-field">
                <label>查找</label>
                <input v-model="entry.find" placeholder="输入要查找的关键词" />
              </div>
              <div class="keyword-replace-field">
                <label>替换为</label>
                <input v-model="entry.replace" placeholder="输入替换后的关键词" />
              </div>
              <button type="button" class="keyword-replace-remove" @click="removeKeywordReplaceEntry(i)" :disabled="keywordReplaceEntries.length <= 1">
                <van-icon name="cross" />
              </button>
            </div>
          </div>

          <button type="button" class="keyword-replace-add" @click="addKeywordReplaceEntry">
            <van-icon name="plus" />添加规则
          </button>

          <div v-if="keywordReplacePreview.length" class="keyword-replace-preview">
            <strong>匹配预览（{{ keywordReplaceScope === 'current' ? '当前章节' : '全部章节' }}）</strong>
            <div v-for="item in keywordReplacePreview" :key="item.find" class="keyword-replace-preview-item">
              <span class="preview-find">"{{ item.find }}"</span>
              <van-icon name="arrow" />
              <span class="preview-replace">"{{ item.replace }}"</span>
              <small>{{ item.count }}处</small>
            </div>
          </div>
        </div>

        <footer>
          <button type="button" class="keyword-replace-cancel" @click="keywordReplaceOpen = false">取消</button>
          <button type="button" class="keyword-replace-preview-btn" :disabled="!hasValidKeywordEntries" @click="previewKeywordReplace">预览匹配</button>
          <button type="button" class="keyword-replace-execute" :disabled="keywordReplacing || !hasValidKeywordEntries" @click="executeKeywordReplace">
            <van-loading v-if="keywordReplacing" size="14" color="#fff" />
            <van-icon v-else name="replace" />
            {{ keywordReplacing ? '修改中...' : '执行替换' }}
          </button>
        </footer>
      </div>
    </van-overlay>

    <van-popup v-model:show="chapterPickerOpen" round position="bottom" :style="{ height: '70vh' }">
      <div class="chapter-picker">
        <header class="picker-header">
          <h3>选择关联章节</h3>
          <button @click="chapterPickerOpen = false">完成</button>
        </header>
        <p class="picker-hint">已选 {{ linkedChapterIds.size }} 章，共 {{ linkedChaptersWordCount }} 字</p>
        <div class="picker-list">
          <div
            v-for="ch in chapters"
            :key="ch.id"
            class="picker-item"
            :class="{ checked: linkedChapterIds.has(ch.id) }"
            @click="toggleChapterLink(ch)"
          >
            <span class="picker-check">{{ linkedChapterIds.has(ch.id) ? '☑' : '☐' }}</span>
            <span class="picker-title">{{ ch.title || '第' + ch.chapter_index + '章' }}</span>
            <span class="picker-words">{{ ch.word_count || 0 }}字</span>
          </div>
          <div v-if="chapters.length === 0" class="picker-empty">暂无章节，请先在左侧创建章节</div>
        </div>
        <footer class="picker-footer">
          <button @click="linkRecentChapters(3)">最近3章</button>
          <button @click="linkRecentChapters(5)">最近5章</button>
          <button @click="clearLinkedChapters">清除全部</button>
        </footer>
      </div>
    </van-popup>

    <!-- 全书设定弹窗 -->
    <van-popup v-model:show="showBookSettings" round position="bottom" :style="{ height: '60vh' }">
      <div class="book-settings-panel">
        <header class="picker-header">
          <h3>作品设定</h3>
          <button @click="showBookSettings = false">完成</button>
        </header>
        <div class="book-settings-body">
          <label class="field">
            <span>全书大纲（可选）</span>
            <textarea v-model="bookOutlineDraft" maxlength="5000" placeholder="输入整本书的框架设定，如：主角成长路线、重大事件节点、世界观核心规则等"></textarea>
            <em>{{ (bookOutlineDraft || '').length }}/5000</em>
          </label>
          <label class="field">
            <span>风格详细描述（可选）</span>
            <textarea v-model="bookStyleProfileDraft" maxlength="3000" placeholder="比风格预设更具体的写法要求，如：对话占比>40%、段落不超过5行、多用短句..."></textarea>
            <em>{{ (bookStyleProfileDraft || '').length }}/3000</em>
          </label>
          <div v-if="currentStyleProfile" class="field">
            <span>当前风格预设（只读）</span>
            <div class="preset-readonly">{{ currentStyleProfile.slice(0, 200) }}{{ currentStyleProfile.length > 200 ? '...' : '' }}</div>
          </div>
        </div>
        <footer class="picker-footer">
          <button @click="showBookSettings = false">取消</button>
          <button class="btn-primary" @click="saveBookSettings">保存</button>
        </footer>
      </div>
    </van-popup>
  </main>
  <van-dialog v-model:show="extractStyleDialogOpen" title="从文本提取写作风格"
    show-cancel-button :show-confirm-button="false" @cancel="extractStyleDialogOpen = false">
    <div class="extract-style-dialog">
      <textarea v-model="extractStyleInput" placeholder="粘贴一段参考文本（建议≥200字），AI将分析其写作风格特征..."
        rows="6" maxlength="4000" :disabled="extractStyleLoading" />
      <small>{{ extractStyleInput.length }}/4000</small>

      <div class="extract-style-actions">
        <button type="button" class="extract-style-start-btn" :disabled="extractStyleLoading || !extractStyleInput.trim()" @click="doExtractStyle">
          <van-loading v-if="extractStyleLoading" size="16" color="#fff" />
          {{ extractStyleLoading ? '正在分析写作风格...' : '开始分析' }}
        </button>
      </div>

      <div v-if="extractStyleResult" class="extract-style-result">
        <div class="result-header">
          <strong>{{ extractStyleResult.styleName }}</strong>
          <button type="button" class="apply-style-btn" @click="applyExtractedStyle">应用此风格</button>
        </div>
        <pre>{{ extractStyleResult.styleContent }}</pre>
      </div>
    </div>
  </van-dialog>

  <!-- 保存自定义写作风格预设弹窗 -->
  <van-dialog v-model:show="showSaveStyleDialog" title="保存写作风格预设"
    :close-on-click-overlay="false" show-cancel-button @confirm="doSaveStylePreset">
    <div class="save-preset-dialog">
      <van-field v-model="newStylePresetTitle" label="预设名称"
        placeholder="例如：我的古风写法" size="large" />
      <div class="preset-preview-block">
        <small>内容预览（{{ aiForm.customStylePrompt.length }} 字）</small>
        <pre>{{ aiForm.customStylePrompt }}</pre>
      </div>
    </div>
  </van-dialog>

  <!-- 保存自定义写作要求预设弹窗 -->
  <van-dialog v-model:show="showSaveRequirementDialog" title="保存写作要求预设"
    :close-on-click-overlay="false" show-cancel-button @confirm="doSaveRequirementPreset">
    <div class="save-preset-dialog">
      <van-field v-model="newRequirementPresetTitle" label="预设名称"
        placeholder="例如：高冲突续写法" size="large" />
      <div class="preset-preview-block">
        <small>内容预览（{{ aiForm.customRequirementPrompt.length }} 字）</small>
        <pre>{{ aiForm.customRequirementPrompt }}</pre>
      </div>
    </div>
  </van-dialog>

  <van-dialog v-model:show="showDeleteBookDialog" title="确认删除"
    show-cancel-button @confirm="doDeleteBook">
    <div style="padding: 16px; text-align: center;">
      确定要删除作品「{{ deletingBook?.title }}」吗？<br/>此操作不可撤销。
    </div>
  </van-dialog>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { showSuccessToast, showToast, showFailToast } from 'vant';
import { fetchChapters, fetchProjects as fetchBooks, updateChapter, createChapter } from '../api/books.js';
import { fetchProviders } from '../api/aiSettings.js';
import { useLlmStore } from '../stores/llmStore.js';
import { continueText, expandText, fetchWritingStyles, generateText } from '../api/writing.js';
import { fetchStylePresets } from '../api/prompts.js';
import { countChineseWords, getTodayStats, recordUsage } from '../utils/usageStats.js';
import ReviewPanel from './ReviewPanel.vue';
import RepairPanel from './RepairPanel.vue';
import QualityReportPanel from './QualityReportPanel.vue';

import { useCorrectionRules } from '../composables/writing/useCorrectionRules.js';
import { useAiConfig } from '../composables/writing/useAiConfig.js';
import { useAiForm } from '../composables/writing/useAiForm.js';
import { useInit } from '../composables/writing/useInit.js';
import { useEditor } from '../composables/writing/useEditor.js';
import { useCharacterPicker } from '../composables/writing/useCharacterPicker.js';
import { usePromptPicker } from '../composables/writing/usePromptPicker.js';
import { useExtractStyle } from '../composables/writing/useExtractStyle.js';
import { useDiffPreview } from '../composables/writing/useDiffPreview.js';
import { useContextAwareness } from '../composables/writing/useContextAwareness.js';
import { useKeywordReplace } from '../composables/writing/useKeywordReplace.js';
import { useCustomPresets } from '../composables/writing/useCustomPresets.js';
import { useChapterSummary } from '../composables/writing/useChapterSummary.js';
import { useBookManagement } from '../composables/writing/useBookManagement.js';
import { useChapterManagement } from '../composables/writing/useChapterManagement.js';
import { useAiState, useAiExecution } from '../composables/writing/useAiExecution.js';
import { useConstraints } from '../composables/writing/useConstraints.js';
import { useIntentParsing } from '../composables/writing/useIntentParsing.js';
import { useChapterSnapshot } from '../composables/writing/useChapterSnapshot.js';
import { expandTextV2 } from '../api/writing.js';
import { createSnapshot } from '../api/snapshots.js';
import { computeTextDiff } from '../utils/diff.js';
import TiptapEditor from '../components/TiptapEditor.vue';
import BlockDiffView from '../components/BlockDiffView.vue';
import CandidateSwitcher from '../components/CandidateSwitcher.vue';

const router = useRouter();
const styles = ref([{ name: '玄幻' }]);
const llmStore = useLlmStore();
const { selectedProvider, aiForm, currentModels, ensureToolVariant, selectToolVariant } = useAiForm(llmStore);

const { customStylePresets, customRequirementPresets, loadAll: loadCustomPresetsData, saveStylePreset, saveRequirementPreset, deleteStylePreset, deleteRequirementPreset, updateStylePreset, updateRequirementPreset } = useCustomPresets();
const { todayStats, stylePresets, requirementPresets, activeLibraryPrompt, displayStylePresets, displayRequirementPresets, allStylePresets, allRequirementPresets, createCurrentStyleProfile, createSelectedStylePresetContent, createSelectedRequirementPresetContent, createMergedStyleProfile, getPresetContent, getPresetPromptSection } = useInit(customStylePresets, customRequirementPresets);

const { draftTitle, draftContent, dirty, saving, lastSavedAt, contentInputRef, textSelection, draftWordCount, lastSavedText, hasActiveSelection, setActiveChapter, markDirty, handleContentInput, syncTextSelection, refreshTextSelection } = useEditor();

const { books, activeBook, bookKeyword, showNewBook, showBookSettings, bookOutlineDraft, bookStyleProfileDraft, creating, newBookTitle, newBookDesc, newBookStyle, newBookOutlineJobId, savedOutlineJobs, loadingOutlineJobs, filteredBooks, formatWords, formatRelativeTime, loadBookSettings, loadOutlineJobsForCreate, createBook, deleteBook, saveBookSettings } = useBookManagement(showToast, showSuccessToast, showFailToast);

const { chapters, activeChapter, chapterMenuOpenId, chapterMenuPosition, formatDateTime, chapterName, addChapter, insertChapterAround, toggleChapterMenu, removeChapter, exportChapter, selectChapter } = useChapterManagement(activeBook, aiForm, dirty, saveCurrentChapter, setActiveChapterWrapper, showToast, showSuccessToast);

const chapterPickerOpen = ref(false);

const { keywordReplaceOpen, keywordReplaceScope, keywordReplacing, keywordReplaceEntries, keywordReplacePreview, hasValidKeywordEntries, addKeywordReplaceEntry, removeKeywordReplaceEntry, openKeywordReplace, previewKeywordReplace, executeKeywordReplace } = useKeywordReplace(chapters, activeChapter, activeBook, draftContent, markDirty, fetchChapters, showToast, showSuccessToast, showFailToast);
	const { summaryModalOpen, summaryChapter, summaryDraft, summaryGeneratingId, batchSummaryLoading, openChapterSummary, saveChapterSummary, generateChapterSummary, batchGenerateSummaries } = useChapterSummary(chapters, activeChapter, activeBook, draftContent, draftTitle, dirty, aiForm, chapterMenuOpenId, saveCurrentChapter, showToast, showSuccessToast);

const { aiPanelOpen, showPresetContent, activeAiKey, aiLoading, repairLoading, showRepairPanel, currentReviewIssues, onReviewDone, onStartRepair, onRepairDone, resetAiState } = useAiState();

async function onApplyRepair(repairedContent) {
  if (!activeChapter.value?.id || !repairedContent) return;
  repairLoading.value = true;
  try {
    await updateChapter(activeChapter.value.id, { project_id: activeBook.value.id, content: repairedContent, word_count: repairedContent.length });
    draftContent.value = repairedContent;
    if (activeBook.value?.id) {
      chapters.value = await fetchChapters(activeBook.value.id);
      const fresh = chapters.value.find(c => c.id === activeChapter.value.id);
      if (fresh) {
        activeChapter.value = fresh;
        draftContent.value = fresh.content || '';
      }
    }
    showRepairPanel.value = false;
    repairDiffData.value = null;
    showSuccessToast('修复内容已应用到章节');
  } catch (err) {
    showFailToast('应用修复失败');
  } finally {
    repairLoading.value = false;
  }
}
const { correctionRules, setCorrectionRules, resetCorrectionRules } = useCorrectionRules();

const { aiFunctions, textProcessActions, AI_SOURCE_LIMIT, createActiveConfig } = useAiConfig();
const { availableCharacters, characterKeyword, characterPickerOpen, filteredCharacters, selectedCharacters, selectedCharactersForPrompt, syncSelectedCharacterNames, loadCharactersForWriting, openCharacterPicker, isCharacterSelected, toggleCharacter, selectAllCharacters, goCharacterManagement } = useCharacterPicker(aiForm);
const { availableRequirementPrompts, promptKeyword, promptPickerOpen, selectedRequirementPrompt, promptTooltip, promptTooltipStyle, outlinePromptContent, loadRequirementPrompts, openPromptPicker, selectRequirementPrompt, showPromptTooltip, hidePromptTooltip, goPromptLibrary, showCreatePromptTip } = usePromptPicker(aiForm, showToast);
const { extractStyleDialogOpen, extractStyleInput, extractStyleLoading, extractStyleResult, openExtractStyleDialog, doExtractStyle, applyExtractedStyle } = useExtractStyle(aiForm, draftContent, stylePresets, showToast, showFailToast);

const { activeAiConfig, activeToolVariants, activeToolVariant, isTextProcessMode, isCorrectionTool, isOutlineTool, showVariantSelector, showTextProcessActions, requirementLabel, runButtonText } = createActiveConfig(activeAiKey, aiForm);
const { repairDiffData, repairDiffTab, repairDiffParagraphs, showInlinePreview, inlineDiffTab, inlineDiffResult, inlineDiffParagraphs, inlineDiffStats, onRepairDiffReady, dismissInlinePreview } = useDiffPreview(aiForm, isTextProcessMode, textSelection);

// 保存修复后的完整内容（用于 BlockDiffView 的"完整结果"tab）
const repairedContent = ref('');

// 包装 onRepairDiffReady，同时保存修复内容
const wrappedOnRepairDiffReady = (data) => {
  onRepairDiffReady(data);
  // 尝试从 diff 段落重建完整结果
  if (data.paragraphs && data.paragraphs.length > 0) {
    repairedContent.value = data.paragraphs
      .filter(p => p.type !== 'delete')
      .map(p => p.type === 'modified' ? (p.newText || '') : (p.text || ''))
      .join('\n');
  }
};

// 新版：约束系统
const constraints = useConstraints();
const showConstraintBar = computed(() => isTextProcessMode.value && constraints.enabledCount.value > 0);
const constraintSummary = computed(() =>
  Object.entries(constraints.constraints)
    .filter(([, v]) => v)
    .map(([k]) => constraints.constraintLabels[k])
    .join('、')
);

// 新版：意图解析
const { intentResult, parsingIntent, parseUserIntent, clearIntent } = useIntentParsing();

// 新版：快照管理
const { takeSnapshot, restoreToSnapshot } = useChapterSnapshot();

// 新版：候选版本状态
const candidates = ref([]);
const activeCandidateId = ref(null);
const candidateSourceText = ref('');
const showCandidatesPreview = ref(false);
const lastPreviewRequest = ref(null); // 保存上一次请求用于"再生成"

const isPreviewActive = computed(() =>
  showCandidatesPreview.value || repairDiffData.value !== null
);

const highlightedParagraphRange = computed(() => {
  if (!textSelection.value.start && !textSelection.value.end) return null;
  return { start: textSelection.value.start, end: textSelection.value.end };
});

const activeCandidate = computed(() =>
  candidates.value.find(c => c.id === activeCandidateId.value) || candidates.value[0] || null
);

const activeCandidateDiff = computed(() => {
  if (!activeCandidate.value || !candidateSourceText.value) {
    return { paragraphs: [], stats: { added: 0, removed: 0, modified: 0, unchanged: 0, total: 0 } };
  }
  const diff = computeTextDiff(candidateSourceText.value, activeCandidate.value.content);
  return {
    ...diff,
    stats: { ...diff.stats, total: diff.stats.added + diff.stats.removed + diff.stats.modified + diff.stats.unchanged },
  };
});

const editorRef = ref(null);

const { buildAiInstruction, loadActiveLibraryPrompt, getToolInstruction, getSystemPromptContent, buildTextProcessInstruction, openAiPanel, selectedPresetContent } = useAiExecution(aiForm, activeAiKey, aiPanelOpen, activeAiConfig, activeToolVariant, correctionRules, selectedCharacters, selectedRequirementPrompt, outlinePromptContent, activeLibraryPrompt, getPresetPromptSection, stylePresets, requirementPresets, ensureToolVariant, loadCharactersForWriting, refreshTextSelection, draftContent, draftTitle, AI_SOURCE_LIMIT, showToast);

const currentStyleProfile = createCurrentStyleProfile(aiForm);
const selectedStylePresetContent = createSelectedStylePresetContent(aiForm, currentStyleProfile);
const selectedRequirementPresetContent = createSelectedRequirementPresetContent(aiForm);
const mergedStyleProfile = createMergedStyleProfile(currentStyleProfile, activeBook);

const { linkedChapterIds, autoCollectEnabled, contextCardExpanded, linkedChapterList, linkedChaptersWordCount, linkedChaptersContent, previousChapterExcerpt, chapterOutlineChain, contextBlockCount, contextSummary, contextTotalChars, contextTokenEstimate, contextTokenPercent, contextTokenClass, linkRecentChapters, toggleChapterLink, clearLinkedChapters } = useContextAwareness(chapters, activeChapter, aiForm, currentStyleProfile, selectedCharactersForPrompt);

// 编辑器事件处理
function onEditorSelectionChange(sel) {
  if (sel && !sel.isEmpty) {
    textSelection.value = { start: sel.from, end: sel.to, text: sel.text };
  } else {
    textSelection.value = { start: 0, end: 0, text: '' };
  }
}

function onEditorTextChange(text) {
  handleContentInput();
  markDirty();
}

// 候选版本管理
function selectCandidate(id) {
  activeCandidateId.value = id;
}

function dismissCandidatesPreview() {
  showCandidatesPreview.value = false;
  candidates.value = [];
  activeCandidateId.value = null;
  candidateSourceText.value = '';
  clearIntent();
}

async function regenerateCandidates() {
  if (!lastPreviewRequest.value) return;
  const req = lastPreviewRequest.value;
  await runAiWithIntent(req.text, req.action, req.config, req.intent);
}

async function applyCandidatesResult(mode) {
  const candidate = activeCandidate.value;
  if (!candidate?.content) return;

  // 应用前自动创建快照
  if (activeChapter.value?.id && draftContent.value) {
    await takeSnapshot(activeChapter.value.id, draftContent.value, `AI改写前 - ${activeAiConfig.value?.label || '未知工具'}`);
  }

  if (mode === 'replace') {
    if (hasActiveSelection.value) {
      const { start, end } = textSelection.value;
      draftContent.value = draftContent.value.slice(0, start) + candidate.content + draftContent.value.slice(end);
    } else {
      draftContent.value = candidate.content;
    }
  } else {
    draftContent.value = [draftContent.value.trim(), candidate.content.trim()].filter(Boolean).join('\n\n');
  }
  markDirty();
  showSuccessToast(mode === 'replace'
    ? (hasActiveSelection.value ? '已替换选中段落（已自动保存快照）' : '已替换正文（已自动保存快照）')
    : '已追加到正文（已自动保存快照）');
  dismissCandidatesPreview();
}

// V2: 带意图解析和约束的 AI 处理
async function runAiWithIntent(text, action, config, customInstruction) {
  let intent = null;

  // 如果有自定义指令且不是预设操作，先解析意图
  if (customInstruction?.trim() && config.mode !== 'expand') {
    intent = await parseUserIntent(customInstruction, {
      provider: selectedProvider.value,
      model: aiForm.model,
    });
  }

  const style = aiForm.style || activeBook.value?.style || styles.value[0]?.name || '玄幻';
  const toolInstruction = getToolInstruction(config);

  const result = await expandTextV2({
    text,
    action,
    style,
    prompt_content: buildTextProcessInstruction(config),
    tool_instruction: toolInstruction,
    provider: selectedProvider.value,
    model: aiForm.model,
    constraints: constraints.buildConstraintsPayload(),
    intent,
  });

  lastPreviewRequest.value = { text, action, config, intent };
  return { ...result, intent };
}

function closeCharacterPicker(event) {
  if (!event.target.closest?.('.character-picker-field')) {
    characterPickerOpen.value = false;
  }
  if (!event.target.closest?.('.prompt-picker-field')) {
    promptPickerOpen.value = false;
    promptTooltip.value = null;
  }
  if (!event.target.closest?.('.chapter-mini-actions')) {
    chapterMenuOpenId.value = null;
  }
}

// 保存自定义预设弹窗状态
const showSaveStyleDialog = ref(false);
const showSaveRequirementDialog = ref(false);
const newStylePresetTitle = ref('');
const newRequirementPresetTitle = ref('');
const savingPreset = ref(false);

function selectStylePreset(preset) {
  aiForm.stylePreset = preset.title;
  aiForm.styleMode = 'preset';
}

function selectRequirementPreset(preset) {
  aiForm.requirementPreset = preset.title;
  aiForm.requirementMode = 'preset';
}

function doSaveStylePreset() {
  const title = newStylePresetTitle.value.trim();
  if (!title || !aiForm.customStylePrompt.trim()) return;
  savingPreset.value = true;
  try {
    saveStylePreset(title, aiForm.customStylePrompt);
    showSuccessToast('写作风格预设已保存');
    newStylePresetTitle.value = '';
    showSaveStyleDialog.value = false;
  } catch { showFailToast('保存失败'); }
  finally { savingPreset.value = false; }
}

function doSaveRequirementPreset() {
  const title = newRequirementPresetTitle.value.trim();
  if (!title || !aiForm.customRequirementPrompt.trim()) return;
  savingPreset.value = true;
  try {
    saveRequirementPreset(title, aiForm.customRequirementPrompt);
    showSuccessToast('写作要求预设已保存');
    newRequirementPresetTitle.value = '';
    showSaveRequirementDialog.value = false;
  } catch { showFailToast('保存失败'); }
  finally { savingPreset.value = false; }
}

function openSaveStyleDialog() {
  if (!aiForm.customStylePrompt.trim()) { showToast('请先输入自定义写作风格内容'); return; }
  newStylePresetTitle.value = '';
  showSaveStyleDialog.value = true;
}

function openSaveRequirementDialog() {
  if (!aiForm.customRequirementPrompt.trim()) { showToast('请先输入自定义写作要求内容'); return; }
  newRequirementPresetTitle.value = '';
  showSaveRequirementDialog.value = true;
}

async function init() {
  todayStats.value = getTodayStats();
  loadCustomPresetsData();
  loadActiveLibraryPrompt();
  try { books.value = await fetchBooks(); } catch { books.value = []; }
  loadCharactersForWriting();
  loadRequirementPrompts();
  try {
    const loadedStyles = await fetchWritingStyles();
    styles.value = loadedStyles.length ? loadedStyles : styles.value;
    aiForm.style = styles.value[0]?.name || '玄幻';
    newBookStyle.value = styles.value[0]?.name || '玄幻';
  } catch {}
  try {
    await llmStore.refresh();  // 强制刷新，确保拿到 AI 设置中最新的模型配置
    const def = llmStore.defaultSelection;
    selectedProvider.value = def.provider;
    aiForm.model = def.model;
  } catch {}
  // Fetch style presets from label system (dynamic)
  try {
    const presets = await fetchStylePresets();
    if (presets && presets.length) {
      stylePresets.value = presets;
      requirementPresets.value = presets;
    }
  } catch { /* keep fallback defaults */ }
}

async function selectBook(book) {
  if (dirty.value) await saveCurrentChapter(false);
  activeBook.value = book;
  aiForm.style = book.style || aiForm.style || '玄幻';
  loadBookSettings();
  try { chapters.value = await fetchChapters(book.id); } catch { chapters.value = []; }
  linkedChapterIds.value = new Set();
  const chapter = chapters.value[chapters.value.length - 1] || null;
  setActiveChapterWrapper(chapter);
}

async function backToShelf() {
  if (dirty.value) await saveCurrentChapter(false);
  activeBook.value = null;
  activeChapter.value = null;
  draftTitle.value = '';
  draftContent.value = '';
  dirty.value = false;
  aiPanelOpen.value = false;
  linkedChapterIds.value = new Set();
  try { books.value = await fetchBooks(); } catch {}
}

async function createChapterForBook(book) {
  await selectBook(book);
  await addChapter();
}

const showDeleteBookDialog = ref(false);
const deletingBook = ref(null);

function confirmDeleteBook(book) {
  deletingBook.value = book;
  showDeleteBookDialog.value = true;
}

async function doDeleteBook() {
  if (!deletingBook.value) return;
  showDeleteBookDialog.value = false;
  await deleteBook(deletingBook.value);
  deletingBook.value = null;
}

// 包装 composable 的 setActiveChapter，额外设置 activeChapter ref
function setActiveChapterWrapper(chapter) {
  activeChapter.value = chapter;
  setActiveChapter(chapter, formatDateTime);
}

async function saveCurrentChapter(showMessage = true) {
  if (!activeBook.value || saving.value) return;
  if (!activeChapter.value && !draftTitle.value.trim() && !draftContent.value.trim()) return;

  saving.value = true;
  const payload = {
    project_id: activeBook.value.id,
    title: draftTitle.value.trim() || `第${chapters.value.length + 1}章`,
    content: draftContent.value,
    summary: activeChapter.value?.summary || '',
    word_count: draftWordCount.value,
    ai_model: aiForm.model,
  };

  try {
    let saved;
    if (activeChapter.value) {
      saved = await updateChapter(activeChapter.value.id, payload);
      const index = chapters.value.findIndex((item) => item.id === saved.id);
      if (index >= 0) chapters.value.splice(index, 1, saved);
    } else {
      saved = await createChapter({
        ...payload,
        chapter_index: chapters.value.length + 1,
      });
      chapters.value.push(saved);
    }
    setActiveChapterWrapper(saved);
    lastSavedAt.value = formatDateTime(saved.updated_at || new Date());
    if (showMessage) showSuccessToast('已保存');
  } catch (error) {
    showToast('保存失败：' + error.message);
  } finally {
    saving.value = false;
  }
}


async function runAi() {
  const config = activeAiConfig.value;
  const instruction = buildAiInstruction(config);
  const style = aiForm.style || activeBook.value?.style || styles.value[0]?.name || '玄幻';
  const toolInstruction = getToolInstruction(config);
  aiLoading.value = true;
  aiForm.result = '';

  try {
    let result;
    if (config.mode === 'continue') {
      const context = [draftContent.value.trim(), instruction ? `【续写方向】\n${instruction}` : ''].filter(Boolean).join('\n\n');
      if (!context.trim()) {
        showToast('请先输入正文或续写要求');
        resetAiState(); return;
      }
      // 自动收集前文上下文（参考51码字策略）
      if (autoCollectEnabled.value && linkedChapterIds.value.size === 0 && chapters.value.length > 0) {
        linkRecentChapters(3);
      }
      result = await continueText({
        context,
        style,
        word_count: Number(aiForm.wordCount) || 800,
        characters: selectedCharactersForPrompt.value,
        prompt_content: getSystemPromptContent(config, { includeToolInstruction: true }),
        provider: selectedProvider.value,
        model: aiForm.model,
        previous_chapter_excerpt: autoCollectEnabled.value ? previousChapterExcerpt.value : '',
        chapter_outlines: autoCollectEnabled.value ? chapterOutlineChain.value : [],
        linked_content: linkedChaptersContent.value,
        style_profile: mergedStyleProfile.value,
        book_outline: activeBook.value?.outline || '',
      });
    } else if (config.mode === 'generate') {
      if (config.key === 'outline' && !selectedRequirementPrompt.value) {
        showToast('请先选择续写要求提示词');
        resetAiState(); return;
      }
      const theme = instruction || draftTitle.value || `${activeBook.value.title} 的新章节`;
      if (!(instruction || draftTitle.value)) { showToast('请输入创作主题'); resetAiState(); return; }
      // 所有模式都传递上下文，不再限定 isOutlineTool
      if (autoCollectEnabled.value && linkedChapterIds.value.size === 0 && chapters.value.length > 0) {
        linkRecentChapters(3);
      }
      result = await generateText({
        theme,
        style,
        word_count: Number(aiForm.wordCount) || 800,
        characters: selectedCharactersForPrompt.value,
        prompt_content: getSystemPromptContent(config),
        tool_instruction: toolInstruction,
        linked_content: linkedChaptersContent.value,
        provider: selectedProvider.value,
        model: aiForm.model,
        previous_chapter_excerpt: autoCollectEnabled.value ? previousChapterExcerpt.value : '',
        chapter_outlines: autoCollectEnabled.value ? chapterOutlineChain.value : [],
        style_profile: mergedStyleProfile.value,
        book_outline: activeBook.value?.outline || '',
      });
    } else if (config.mode === 'review') {
      // 审稿由 ReviewPanel 组件独立处理，此处无需操作
      showToast('请在审稿面板中点击"执行审稿"');
      resetAiState(); return;
    } else {
      const text = (aiForm.sourceText || refreshTextSelection() || draftContent.value).trim().slice(0, AI_SOURCE_LIMIT);
      if (!text) {
        showToast('请先划选或输入要处理的文本');
        resetAiState(); return;
      }
      aiForm.sourceText = text;
      candidateSourceText.value = text;

      // V2: 意图解析 + 多候选生成
      const customInstruction = aiForm.customRequirement?.trim() || '';
      const hasCustomInstruction = customInstruction.length > 0;

      let intent = null;
      if (hasCustomInstruction) {
        intent = await parseUserIntent(customInstruction, {
          provider: selectedProvider.value,
          model: aiForm.model,
        });
      }

      result = await expandTextV2({
        text,
        action: aiForm.expandAction,
        style,
        prompt_content: buildTextProcessInstruction(config),
        tool_instruction: toolInstruction,
        provider: selectedProvider.value,
        model: aiForm.model,
        constraints: constraints.buildConstraintsPayload(),
        intent,
      });

      // 保存请求用于再生成
      lastPreviewRequest.value = { text, action: aiForm.expandAction, config, intent };
    }

    // 处理文本处理模式的结果（V2 多候选）
    if (result.candidates && result.candidates.length > 0) {
      candidates.value = result.candidates;
      activeCandidateId.value = result.candidates[0].id;
      showCandidatesPreview.value = true;
      aiForm.result = result.candidates[0].content || '';

      if (result.candidates[0].content) {
        recordUsage(countChineseWords(result.candidates[0].content));
      }
    } else {
      aiForm.result = result.text || '';
      if (!aiForm.result) { showToast('AI 已处理完毕但返回空内容，请确认 API Key 已配置'); }
    }

    if (!result.candidates) {
      recordUsage(countChineseWords(aiForm.result));
    }
    todayStats.value = getTodayStats();
  } catch (error) {
    showFailToast('生成失败：' + error.message);
  } finally {
    aiLoading.value = false;
  }
}

function replaceSelectionWithAiResult() {
  const { start, end } = textSelection.value;
  draftContent.value = draftContent.value.slice(0, start) + aiForm.result + draftContent.value.slice(end);
  textSelection.value = { start, end: start + aiForm.result.length, text: aiForm.result };
  markDirty();
}

async function applyInlinePreview() {
  if (!aiForm.result) return;
  if (hasActiveSelection.value) {
    replaceSelectionWithAiResult();
  } else {
    draftContent.value = aiForm.result;
  }
  showSuccessToast('???????');
  await nextTick();
  scrollToReplacedText();
  aiForm.result = '';
}
function scrollToReplacedText() {
  const { start, end } = textSelection.value;
  const el = contentInputRef.value;
  if (!el || start === end) return;
  el.focus();
  el.setSelectionRange(start, end);
  const lineHeight = 36;
  const linesBefore = draftContent.value.slice(0, start).split('\n').length - 1;
  el.scrollTop = Math.max(0, linesBefore * lineHeight - 60);
  setTimeout(() => {
    if (el.selectionStart === start && el.selectionEnd === end) {
      el.setSelectionRange(0, 0);
    }
  }, 3000);
}

function applyAiResult(mode) {
  if (!aiForm.result) return;
  if (mode === 'replace') {
    if (hasActiveSelection.value) {
      replaceSelectionWithAiResult();
    } else {
      draftContent.value = aiForm.result;
      markDirty();
    }
  } else {
    draftContent.value = [draftContent.value.trim(), aiForm.result.trim()].filter(Boolean).join('\n\n');
    markDirty();
  }
  showSuccessToast(mode === 'replace' ? (hasActiveSelection.value ? '已替换选中段落' : '已替换正文') : '已追加到正文');
}

onMounted(() => {
  init();
  document.addEventListener('mousedown', closeCharacterPicker);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', closeCharacterPicker);
});
</script>

<style scoped>
.writing-page {
  min-height: calc(100vh - var(--header-h));
  padding: 0 16px 18px;
  background: linear-gradient(90deg, #f0fbf7 0, #f4f7ff 42%, #f7f5ff 100%);
}

.bookshelf-view {
  display: grid;
  gap: 16px;
  padding-top: 12px;
}

.notice-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 12px;
  color: #0f3556;
  background: #eaf4ff;
  border: 1px solid #bddcff;
  font-size: 15px;
}

.notice-bar .van-icon:first-child {
  color: #2f80ed;
  font-size: 22px;
}

.notice-close {
  margin-left: auto;
  color: #667085;
}

.works-panel {
  min-height: calc(100vh - var(--header-h) - 90px);
  padding: 0 16px 28px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid #e9ecf5;
  border-radius: 14px;
  box-shadow: 0 12px 30px rgba(30, 41, 59, 0.05);
}

.works-tabs {
  display: flex;
  gap: 32px;
  min-height: 52px;
  align-items: end;
  border-bottom: 1px solid #edf0f7;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 0 28px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #374151;
  cursor: pointer;
}

.tab.active {
  color: #16a05d;
  border-color: #16a05d;
  font-weight: 700;
}

.works-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  border-bottom: 1px solid #edf0f7;
}

.toolbar-spacer {
  flex: 1;
}

.folder-btn,
.manage-btn,
.pill,
.icon-btn,
.create-actions button,
.book-actions button,
.chapter-actions button,
.top-icon,
.inline-toolbar button,
.ai-panel-head button {
  border: 1px solid #e4e7ef;
  background: #fff;
  color: #111827;
  cursor: pointer;
}

.folder-btn,
.manage-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  border-radius: 4px;
  padding: 0 12px;
}

.folder-btn {
  color: #10b981;
  border-color: #fff3d8;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 40px;
  height: 32px;
  border-radius: 8px;
}

.icon-btn.active {
  color: #fff;
  background: #19a866;
  border-color: #19a866;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 12px;
  border-radius: 14px;
  font-size: 12px;
}

.pill.active {
  color: #fff;
  background: #1f2937;
  border-color: #1f2937;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 170px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid #e4e7ef;
  border-radius: 4px;
  background: #fff;
  color: #9ca3af;
}

.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  font-size: 12px;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  padding-top: 12px;
}

.create-card,
.work-card {
  min-height: 198px;
  border-radius: 14px;
  background: #fff;
}

.create-card {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 14px;
  border: 2px dashed #d9dde7;
}

.create-plus {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  border: 4px solid #5f6368;
  border-radius: 50%;
  color: #5f6368;
  background: transparent;
  font-size: 46px;
  cursor: pointer;
}

.create-card h2 {
  margin: 0;
  color: #333;
  font-size: 18px;
  font-weight: 500;
}

.create-actions,
.book-actions {
  display: flex;
  justify-content: center;
  gap: 48px;
  width: 100%;
  padding-top: 8px;
  border-top: 1px solid #eef1f6;
}

.create-actions button,
.book-actions button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 6px;
  background: #f7f8fb;
}

.book-actions .delete-btn {
  color: #e74c3c;
  background: #fef0ef;
}

.work-card {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 14px;
  padding: 14px 14px 0;
  border: 1px solid #ecf0f7;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
  cursor: pointer;
}

.work-card:hover {
  border-color: #b9d7ff;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.1);
}

.book-cover {
  width: 92px;
  height: 116px;
  border-radius: 8px;
  background: #eef3fb center/cover no-repeat;
  display: grid;
  place-items: center;
  color: #f6a21a;
  font-weight: 700;
  line-height: 1.5;
  text-align: center;
}

.book-meta {
  min-width: 0;
}

.book-meta h3 {
  margin: 2px 0 10px;
  font-size: 17px;
}

.book-meta p {
  height: 34px;
  margin: 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.4;
  overflow: hidden;
}

.book-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  color: #6b7280;
  font-size: 12px;
}

.book-tags span {
  color: #2f80ed;
  background: #eaf4ff;
  border-radius: 12px;
  padding: 2px 7px;
}

.book-meta small {
  display: block;
  margin-top: 14px;
  color: #8a94a6;
}

.book-actions {
  grid-column: 1 / -1;
  justify-content: space-between;
  gap: 8px;
  margin: 0 -14px;
  padding: 10px 14px;
}

.book-actions button {
  flex: 1;
  justify-content: center;
}

.empty-line {
  padding: 48px 0;
  color: #8a94a6;
  text-align: center;
}

.editor-view {
  height: calc(100vh - var(--header-h));
  margin: 0 -16px -18px;
  background: #eef1f5;
}

.editor-top {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  height: 52px;
  padding: 0 10px;
  border-bottom: 1px solid #dce3ef;
  background: #f3f6f9;
}

.editor-left-tools,
.editor-right-tools {
  display: flex;
  align-items: center;
  gap: 6px;
}

.top-icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #374151;
  font-size: 20px;
}

.top-icon:hover {
  background: #e5eaf1;
}

.ai-function-bar {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.ai-function-bar button {
  flex: 0 0 auto;
  height: 34px;
  padding: 0 18px;
  border: 1px solid #ff9800;
  border-radius: 18px;
  background: #fff;
  color: #ff8a00;
  font-weight: 700;
  cursor: pointer;
}

.ai-function-bar button.active {
  color: #fff;
  background: #ff9800;
}

.saved-at {
  color: #737b88;
  font-size: 13px;
  white-space: nowrap;
}

.editor-body {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) auto;
  gap: 10px;
  height: calc(100% - 52px);
  padding: 0 8px 10px;
}

.chapter-sidebar {
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-top: 0;
  background: #fff;
  border-radius: 0 0 10px 10px;
  box-shadow: 2px 0 10px rgba(15, 23, 42, 0.08);
}

.book-strip {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 48px;
  padding: 0 14px;
  border-bottom: 1px solid #eef1f5;
  font-size: 13px;
}

.book-strip span {
  color: #2f80ed;
  background: #eaf4ff;
  border-radius: 12px;
  padding: 1px 6px;
}

.chapter-actions {
  display: grid;
  grid-template-columns: 1fr 44px 44px 44px;
  height: 44px;
  border-bottom: 1px solid #eef1f5;
}

.chapter-actions button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-right: 1px solid #eef1f5;
  border-radius: 0;
}

.chapter-list {
  overflow-y: auto;
  border-radius: 0 0 10px 10px;
}

.chapter-item {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  width: 100%;
  min-height: 46px;
  padding: 12px 14px;
  border: 0;
  border-bottom: 1px solid #eef1f5;
  border-left: 4px solid transparent;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.chapter-item.active {
  border-left-color: #7c3aed;
  background: #fbfbff;
}

.chapter-item strong {
  display: block;
  color: #111827;
  font-size: 14px;
}

.chapter-item span,
.chapter-item small {
  color: #8a94a6;
  font-size: 12px;
}

.chapter-mini-actions {
  display: flex;
  position: relative;
  flex-wrap: nowrap;
  gap: 6px;
  margin-top: 8px;
}

.chapter-mini-actions > button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 26px;
  padding: 0 9px;
  border: 1px solid #cfe2ff;
  border-radius: 4px;
  background: #e8f1ff;
  color: #1d4ed8;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}

.chapter-mini-actions > button:nth-child(2) {
  border-color: #bbf7d0;
  background: #dcfce7;
  color: #16834a;
}

.chapter-mini-actions > button.danger {
  border-color: #fecaca;
  background: #fee2e2;
  color: #dc2626;
}

.chapter-mini-actions > button.more-trigger {
  width: 30px;
  padding: 0;
  border-color: #e5e7eb;
  background: #fff;
  color: #4b5563;
  font-weight: 700;
}

.chapter-mini-actions > button:disabled {
  opacity: 0.65;
  cursor: wait;
}

.chapter-more-menu {
  position: fixed;
  z-index: 100;
  display: grid;
  min-width: 150px;
  padding: 6px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
}

.chapter-more-menu button {
  justify-content: flex-start;
  min-height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #374151;
  font-size: 13px;
  white-space: nowrap;
}

.chapter-more-menu button:hover {
  background: #f3f6fb;
  color: #16a05d;
}

.chapter-empty {
  padding: 30px 16px;
  color: #8a94a6;
  text-align: center;
}

.chapter-empty button {
  height: 32px;
  padding: 0 14px;
  border: 1px solid #16a05d;
  border-radius: 6px;
  background: #fff;
  color: #16a05d;
}

.chapter-editor {
  min-width: 0;
  padding-top: 0;
}

.editor-card {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  background: #fff;
  border-radius: 0 0 10px 10px;
  box-shadow: 0 0 10px rgba(15, 23, 42, 0.06);
}

.inline-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  padding: 0 16px;
  border-bottom: 1px solid #eef1f5;
}

.inline-toolbar button {
  border: 0;
  background: transparent;
  color: #374151;
  font-size: 18px;
}

.inline-toolbar i {
  width: 1px;
  height: 18px;
  background: #e5e7eb;
}

.keyword-replace-btn {
  display: flex !important;
  align-items: center;
  gap: 4px;
  color: var(--accent, #6366f1) !important;
  font-size: 13px !important;
  white-space: nowrap;
}

.keyword-replace-btn span {
  font-size: 12px;
  font-weight: 500;
}

/* 批量修改关键词弹窗 */
.keyword-replace-popup {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(640px, 92vw);
  max-height: 85vh;
  background: #fff;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
}

.keyword-replace-popup > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eef1f5;
}

.keyword-replace-popup > header h3 {
  margin: 0;
  font-size: 17px;
  color: #111827;
}

.keyword-replace-popup > header button {
  border: 0;
  background: transparent;
  color: #9ca3af;
  font-size: 18px;
  cursor: pointer;
}

.keyword-replace-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.keyword-replace-scope {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.keyword-replace-scope > span {
  font-size: 14px;
  color: #374151;
  white-space: nowrap;
}

.keyword-replace-entries {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
}

.keyword-replace-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.keyword-replace-field {
  flex: 1;
  display: grid;
  gap: 4px;
}

.keyword-replace-field label {
  font-size: 12px;
  color: #6b7280;
}

.keyword-replace-field input {
  height: 38px;
  padding: 0 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.keyword-replace-field input:focus {
  border-color: var(--accent, #6366f1);
}

.keyword-replace-remove {
  border: 0;
  background: transparent;
  color: #9ca3af;
  font-size: 16px;
  cursor: pointer;
  padding: 8px 4px;
  flex-shrink: 0;
}

.keyword-replace-remove:hover {
  color: #ef4444;
}

.keyword-replace-remove:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.keyword-replace-add {
  border: 1px dashed #d1d5db;
  background: transparent;
  color: var(--accent, #6366f1);
  font-size: 13px;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  justify-content: center;
}

.keyword-replace-add:hover {
  border-color: var(--accent, #6366f1);
  background: #f5f3ff;
}

.keyword-replace-preview {
  margin-top: 16px;
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.keyword-replace-preview > strong {
  font-size: 13px;
  color: #374151;
  display: block;
  margin-bottom: 10px;
}

.keyword-replace-preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
}

.keyword-replace-preview-item:last-child {
  border-bottom: none;
}

.preview-find {
  color: #ef4444;
  font-weight: 600;
}

.preview-replace {
  color: #16a34a;
  font-weight: 600;
}

.keyword-replace-preview-item small {
  margin-left: auto;
  color: #6b7280;
}

.keyword-replace-popup > footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #eef1f5;
}

.keyword-replace-cancel {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  font-size: 14px;
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
}

.keyword-replace-preview-btn {
  border: 1px solid var(--accent, #6366f1);
  background: #fff;
  color: var(--accent, #6366f1);
  font-size: 14px;
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
}

.keyword-replace-preview-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.keyword-replace-execute {
  border: 0;
  background: var(--accent, #6366f1);
  color: #fff;
  font-size: 14px;
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.keyword-replace-execute:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.keyword-replace-execute:hover:not(:disabled) {
  background: #4f46e5;
}

.title-line {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  height: 40px;
  padding: 0 12px;
  border-bottom: 1px solid #eef1f5;
  color: #9ca3af;
}

.title-line input {
  width: 100%;
  border: 0;
  outline: 0;
  color: #111827;
  font-size: 24px;
  font-weight: 650;
}

.title-line input::placeholder,
.content-input::placeholder {
  color: #c4c8cf;
}

.title-line span {
  color: #9ca3af;
  font-size: 20px;
}

.content-input {
  flex: 1;
  width: 100%;
  padding: 18px 12px 40px;
  border: 0;
  outline: 0;
  resize: none;
  color: #111827;
  font: inherit;
  font-size: 20px;
  line-height: 1.9;
}

.word-counter {
  position: absolute;
  right: 8px;
  bottom: 0;
  color: #9ca3af;
  font-size: 18px;
}

/* ===== 新版组件样式 ===== */
.ai-candidates-preview {
  margin-top: 12px;
  border: 1px solid #d1fae5;
  border-radius: 12px;
  overflow: hidden;
  background: #f9fefb;
}

.candidates-preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #ecfdf5;
  border-bottom: 1px solid #d1fae5;
  font-size: 14px;
}

.candidates-preview-hint {
  font-size: 12px;
  color: #059669;
  margin-left: 4px;
}

.candidates-preview-dismiss {
  margin-left: auto;
  border: none;
  background: none;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
}

.constraint-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #eff6ff;
  border-bottom: 1px solid #bfdbfe;
  font-size: 12px;
  color: #1d4ed8;
}

.candidates-preview-actions {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid #e5e7eb;
  flex-wrap: wrap;
}

.candidates-apply-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 8px;
  background: #10b981;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
}

.candidates-apply-btn.secondary {
  background: #6366f1;
}

.candidates-dismiss-btn {
  padding: 6px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #6b7280;
  font-size: 13px;
  cursor: pointer;
}

.candidates-regenerate-btn {
  padding: 6px 16px;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  background: #fffbeb;
  color: #92400e;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.candidates-regenerate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.constraint-section {
  margin-bottom: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
}

.constraint-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f9fafb;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
}

.constraint-header small {
  color: #9ca3af;
  margin-left: auto;
}

.constraint-list {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.constraint-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  cursor: pointer;
}

.constraint-item input[type="checkbox"] {
  margin-top: 2px;
  accent-color: #10b981;
}

.constraint-item strong {
  display: block;
  font-size: 13px;
  color: #374151;
}

.constraint-item small {
  display: block;
  color: #9ca3af;
  margin-top: 1px;
}

.ai-inline-preview {
  margin: 12px 12px 8px;
  border: 2px solid #86efac;
  border-radius: 10px;
  background: #f0fdf4;
  overflow: hidden;
  flex-shrink: 0;
}

.ai-inline-preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid #a7f3d0;
  background: #ecfdf5;
}

.ai-inline-preview-header .van-icon {
  color: #059669;
  font-size: 18px;
}

.ai-inline-preview-header strong {
  color: #065f46;
  font-size: 14px;
  flex: 1;
}

.ai-inline-preview-hint {
  color: #047857;
  font-size: 12px;
}

.ai-inline-diff-tabs {
  display: flex;
  border-bottom: 1px solid #a7f3d0;
}

.ai-inline-diff-tab {
  flex: 1;
  padding: 7px 8px;
  font-size: 13px;
  background: none;
  border: none;
  color: #047857;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-inline-diff-tab.active {
  color: #065f46;
  font-weight: 700;
  background: #ecfdf5;
  box-shadow: inset 0 -2px 0 #10b981;
}

.ai-inline-preview-content {
  max-height: 400px;
  margin: 0;
  padding: 10px 14px;
  overflow-y: auto;
  background: #f0fdf4;
}

/* 行内 diff 段落块 */
.inline-diff-block {
  margin-bottom: 10px;
  padding: 6px 10px;
  border-radius: 6px;
}

.idb-equal {
  background: transparent;
  padding: 2px 10px;
}

.idb-delete {
  background: #fef2f2;
  border-left: 3px solid #ef4444;
}

.idb-insert {
  background: #ecfdf5;
  border-left: 3px solid #22c55e;
}

.idb-modified {
  background: #fff7ed;
  border-left: 3px solid #f97316;
}

.idb-marker {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  margin-bottom: 3px;
}

.idb-del { background: #fecaca; color: #991b1b; }
.idb-ins { background: #bbf7d0; color: #166534; }
.idb-mod { background: #fed7aa; color: #9a3412; }

.idb-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.9;
  color: #374151;
  white-space: pre-wrap;
  word-break: break-word;
}

.idb-text-del {
  color: #9ca3af;
  text-decoration: line-through;
}

.idb-text-ins {
  color: #374151;
}

.idb-text-eq {
  color: #6b7280;
}

.idb-empty {
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
  padding: 20px 0;
}

.idb-chunk {
  line-height: 1.9;
  border-radius: 2px;
  padding: 0 1px;
}

.idbc-equal { color: #6b7280; }
.idbc-delete { background: #fecaca; color: #9ca3af; text-decoration: line-through; }
.idbc-insert { background: #bbf7d0; color: #374151; }

/* 行内 diff 统计 */
.ai-inline-diff-stats {
  display: flex;
  gap: 0;
  border-top: 1px solid #a7f3d0;
  padding: 6px 14px;
  background: #ecfdf5;
}

.aids-item {
  flex: 1;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
}

.aids-del { color: #dc2626; }
.aids-ins { color: #16a34a; }
.aids-eq { color: #9ca3af; }

.ai-inline-preview-actions {
  display: flex;
  gap: 10px;
  padding: 8px 14px;
  border-top: 1px solid #a7f3d0;
  background: #ecfdf5;
}

.ai-inline-apply-btn {
  height: 32px;
  padding: 0 16px;
  border: 0;
  border-radius: 6px;
  background: #10b981;
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}

.ai-inline-apply-btn:hover {
  background: #059669;
}

.ai-inline-dismiss-btn {
  height: 32px;
  padding: 0 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  color: #6b7280;
  font-size: 13px;
  cursor: pointer;
}

.ai-inline-dismiss-btn:hover {
  background: #f3f4f6;
}

/* 修复对比预览（正文区） */
.repair-diff-preview {
  margin: 12px 12px 8px;
  border: 2px solid #fcd34d;
  border-radius: 10px;
  background: #fffbeb;
  overflow: hidden;
  flex-shrink: 0;
}

.repair-diff-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid #fde68a;
  background: #fef9c3;
}

.repair-diff-header .van-icon {
  color: #d97706;
  font-size: 18px;
}

.repair-diff-header strong {
  color: #92400e;
  font-size: 14px;
}

.repair-diff-dismiss {
  margin-left: auto;
  padding: 2px;
  border: 0;
  background: none;
  color: #a16207;
  cursor: pointer;
  font-size: 16px;
}

.repair-diff-tabs {
  display: flex;
  border-bottom: 1px solid #fde68a;
}

.repair-diff-tab {
  flex: 1;
  padding: 8px;
  font-size: 13px;
  background: none;
  border: none;
  color: #a16207;
  cursor: pointer;
  transition: all 0.2s;
}

.repair-diff-tab.active {
  color: #92400e;
  font-weight: 700;
  background: #fef9c3;
}

.repair-diff-body {
  max-height: 500px;
  overflow-y: auto;
  padding: 12px 14px;
}

.repair-diff-block {
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  position: relative;
}

.diff-block-equal {
  background: transparent;
  padding: 4px 12px;
}

.diff-block-delete {
  background: #fef2f2;
  border-left: 3px solid #ef4444;
}

.diff-block-insert {
  background: #f0fdf4;
  border-left: 3px solid #22c55e;
}

.diff-block-modified {
  background: #fff7ed;
  border-left: 3px solid #f97316;
}

.block-marker {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.del-marker { background: #fecaca; color: #991b1b; }
.ins-marker { background: #bbf7d0; color: #166534; }
.mod-marker { background: #fed7aa; color: #9a3412; }

.block-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.9;
  color: #374151;
  white-space: pre-wrap;
  word-break: break-word;
}

.del-text {
  color: #9ca3af;
  text-decoration: line-through;
}

.ins-text {
  color: #374151;
}

.equal-block {
  color: #6b7280;
}

/* 句子级行内标记 */
.inline-chunk {
  line-height: 1.9;
  border-radius: 2px;
  padding: 0 1px;
}

.ic-equal {
  color: #6b7280;
}

.ic-delete {
  background: #fecaca;
  color: #9ca3af;
  text-decoration: line-through;
}

.ic-insert {
  background: #bbf7d0;
  color: #374151;
}

/* 差异统计摘要 */
.repair-diff-stats {
  display: flex;
  gap: 0;
  border-top: 1px solid #fde68a;
  padding: 8px 14px;
  background: #fef9c3;
}

.rds-item {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.rds-del { color: #dc2626; }
.rds-ins { color: #16a34a; }
.rds-eq { color: #9ca3af; }

.ai-panel {
  display: flex;
  flex-direction: column;
  width: 480px;
  min-width: 420px;
  overflow-y: auto;
  background: #fff;
  border-left: 1px solid #e5e7eb;
  border-radius: 10px 0 0 10px;
  box-shadow: -4px 0 16px rgba(15, 23, 42, 0.08);
}

.ai-panel-body {
  overflow-y: auto;
  min-height: 0;
}

.ai-rule-panel {
  background: #f7f8fb;
}

.ai-panel-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 10px;
}

.ai-panel-head h2 {
  margin: 0;
  font-size: 16px;
}

.ai-panel-head p,
.helper-text {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
}

.plain-text-btn {
  margin-left: auto;
  width: auto !important;
  padding: 0 8px;
  color: #202534 !important;
  font-size: 14px !important;
}

.correction-stats {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 0 16px 10px;
  color: #6b7280;
  font-size: 13px;
}

.correction-scope {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 10px 16px 0;
  padding: 10px;
  border-radius: 8px;
  background: #fff;
  color: #6b7280;
  font-size: 13px;
}

.correction-scope button,
.correction-rule button,
.knowledge-actions button {
  height: 26px;
  border: 1px solid #e1e5ee;
  border-radius: 4px;
  background: #fff;
  color: #4b5563;
  cursor: pointer;
}

.correction-rules {
  display: grid;
  gap: 8px;
  padding: 8px 16px 74px;
  overflow-y: auto;
}

.correction-rule {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 10px;
  border-radius: 8px;
  background: #fff;
}

.correction-rule strong {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #202534;
  font-size: 14px;
}

.correction-rule i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff4d5e;
}

.correction-rule p {
  margin: 8px 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.55;
}

.correction-rule .danger {
  margin-left: 6px;
  color: #e23d5a;
  background: #fff5f7;
}

.rule-check {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.rule-check input {
  width: 14px;
  height: 14px;
  accent-color: #18a45f;
}

.outline-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  padding: 10px 16px 0;
}

.outline-grid .field:nth-child(3) {
  grid-column: 1 / -1;
}

.knowledge-block {
  padding: 8px 16px 0;
}

.knowledge-block h3 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 18px;
}

.knowledge-block h3 small,
.knowledge-block p {
  color: #6b7280;
  font-size: 13px;
  font-weight: 400;
}

.knowledge-block section {
  padding: 8px 0 10px;
}

.knowledge-empty {
  display: grid;
  place-items: center;
  min-height: 54px;
  color: #b5bbc6;
  font-size: 13px;
}

.knowledge-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.knowledge-actions button {
  min-width: 76px;
  height: 30px;
  border: 0;
  border-radius: 16px;
  background: #dcf7eb;
  color: #15945a;
  font-size: 13px;
}

.knowledge-actions button:disabled {
  opacity: 0.4;
}

.knowledge-actions button.btn-clear {
  background: #fee2e2;
  color: #dc2626;
}

.knowledge-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0 8px;
}

.knowledge-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 12px;
  background: #e9f3ff;
  color: #2563eb;
  font-size: 12px;
}

.knowledge-chip .chip-remove {
  border: 0;
  background: none;
  color: #93a3b8;
  font-size: 13px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}

/* Knowledge header with auto-collect toggle */
.knowledge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.auto-collect-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
}

.auto-collect-toggle input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: #15945a;
}

/* 上下文感知卡片 */
.context-awareness-card {
  margin: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.context-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
}

.context-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
}

.context-card-summary {
  flex: 1;
  font-size: 12px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.context-card-body {
  padding: 0 12px 10px;
  border-top: 1px solid #e5e7eb;
}

.context-item {
  display: flex;
  gap: 8px;
  padding: 6px 0;
  font-size: 12px;
  border-bottom: 1px dashed #f3f4f6;
}

.context-item:last-of-type {
  border-bottom: none;
}

.context-label {
  flex-shrink: 0;
  width: 36px;
  color: #9ca3af;
  font-weight: 500;
}

.context-preview {
  color: #374151;
  word-break: break-all;
}

.context-token-bar {
  padding: 8px 0 4px;
}

.context-token-text {
  font-size: 11px;
  color: #9ca3af;
  display: block;
  margin-bottom: 4px;
}

.token-progress {
  height: 4px;
  border-radius: 2px;
  background: #e5e7eb;
  overflow: hidden;
}

.token-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.token-fill.token-green { background: #10b981; }
.token-fill.token-yellow { background: #f59e0b; }
.token-fill.token-red { background: #ef4444; }

/* 全书设定弹窗 */
.book-settings-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.book-settings-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
}

.book-settings-body .field {
  margin-bottom: 12px;
}

.book-settings-body .field span {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}

.book-settings-body textarea {
  width: 100%;
  min-height: 80px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 8px;
  font-size: 13px;
  resize: vertical;
}

.book-settings-body em {
  display: block;
  text-align: right;
  font-size: 11px;
  color: #9ca3af;
}

.preset-readonly {
  padding: 8px;
  background: #f3f4f6;
  border-radius: 6px;
  font-size: 12px;
  color: #6b7280;
  max-height: 80px;
  overflow-y: auto;
}

/* Chapter Picker */
.chapter-picker {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px 8px;
  border-bottom: 1px solid #f0f0f0;
}

.picker-header h3 {
  margin: 0;
  font-size: 16px;
}

.picker-header button {
  border: 0;
  background: none;
  color: #16a05d;
  font-size: 15px;
  font-weight: 600;
}

.picker-hint {
  margin: 0;
  padding: 6px 16px;
  font-size: 12px;
  color: #9ca3af;
}

.picker-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.picker-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.picker-item:active {
  background: #f5f5f5;
}

.picker-item.checked {
  background: #e9fff3;
}

.picker-check {
  font-size: 18px;
  width: 22px;
  text-align: center;
  flex-shrink: 0;
}

.picker-item.checked .picker-check {
  color: #16a05d;
}

.picker-title {
  flex: 1;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-words {
  font-size: 11px;
  color: #9ca3af;
  flex-shrink: 0;
}

.picker-empty {
  text-align: center;
  color: #9ca3af;
  padding: 40px 0;
  font-size: 14px;
}

.picker-footer {
  display: flex;
  gap: 8px;
  padding: 10px 16px 16px;
  border-top: 1px solid #f0f0f0;
}

.picker-footer button {
  flex: 1;
  height: 34px;
  border: 1px solid #dfe3eb;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: #374151;
}

.picker-footer .btn-primary,
.picker-footer button.btn-primary {
  background: #15945a;
  color: #fff;
  border-color: #15945a;
  font-weight: 600;
}

.ai-panel-head button {
  width: 30px;
  height: 30px;
  border: 0;
  background: transparent;
  font-size: 18px;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
}

.helper-text {
  padding: 0 16px 14px;
  border-bottom: 1px solid #eef1f5;
}

.field,
.field-row {
  padding: 10px 16px 0;
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  color: #202534;
  font-size: 14px;
}

.field small {
  color: #202534;
  font-weight: 400;
}

.field select,
.field input,
.field textarea,
.popup-select {
  width: 100%;
  border: 1px solid #dfe3eb;
  border-radius: 4px;
  background: #fff;
  color: #374151;
  font: inherit;
  outline: 0;
}

.field select,
.field input,
.popup-select {
  height: 32px;
  padding: 0 10px;
}

.provider-select {
  margin-bottom: 4px;
}

.model-input-wrap {
  position: relative;
}

.model-input {
  width: 100%;
  border: 1px solid #dfe3eb;
  border-radius: 4px;
  background: #fff;
  color: #374151;
  font: inherit;
  outline: 0;
  height: 32px;
  padding: 0 10px;
}

.field textarea {
  min-height: 104px;
  padding: 10px;
  resize: vertical;
  line-height: 1.6;
}

.field textarea.short {
  min-height: 68px;
}

.field em {
  justify-self: end;
  margin-top: -30px;
  padding-right: 10px;
  color: #8a94a6;
  font-style: normal;
  font-size: 12px;
}

.segmented {
  display: flex;
  gap: 8px;
}

.variant-segmented {
  flex-wrap: wrap;
}

.segmented button {
  height: 28px;
  padding: 0 12px;
  border: 1px solid #16a05d;
  background: #fff;
  color: #16a05d;
  border-radius: 4px;
  cursor: pointer;
}

.segmented button.active {
  background: #e9fff3;
}

.orange-tip {
  margin: -2px 0 0;
  color: #ff8a00;
  font-size: 13px;
}

.variant-hint {
  margin: 0;
  color: #5f6675;
  font-size: 12px;
  line-height: 1.6;
}

.field-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 10px;
}

.field.compact {
  padding: 0;
}

.character-picker-field {
  position: relative;
}

.character-picker-trigger {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid #dfe3eb;
  border-radius: 4px;
  background: #fff;
  color: #374151;
  cursor: pointer;
  text-align: left;
}

.character-picker-placeholder {
  color: #9ca3af !important;
}

.character-picker-tags {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  flex-wrap: wrap;
}

.character-picker-tags em,
.character-picker-tags small {
  margin: 0;
  padding: 2px 7px;
  border-radius: 12px;
  background: #ecfdf5;
  color: #15945a;
  font-style: normal;
  font-size: 12px;
  line-height: 1.3;
}

.character-picker-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 20;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
  overflow: hidden;
}

.character-search {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 10px;
  height: 32px;
  padding: 0 9px;
  border: 1px solid #dfe3eb;
  border-radius: 4px;
  color: #9ca3af;
}

.character-search:focus-within {
  border-color: #18a45f;
  box-shadow: 0 0 0 2px rgba(24, 164, 95, 0.12);
}

.character-search input {
  height: 28px;
  padding: 0;
  border: 0;
}

.character-options {
  max-height: 180px;
  overflow-y: auto;
}

.character-option {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
}

.character-option:hover {
  background: #f6fbf8;
}

.character-option input {
  width: 14px;
  height: 14px;
  margin-top: 2px;
  accent-color: #18a45f;
}

.character-option strong,
.character-option small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.character-option strong {
  color: #202534;
  font-size: 13px;
}

.character-option small {
  margin-top: 2px;
  color: #8a94a6;
  font-size: 12px;
}

.character-empty {
  display: grid;
  place-items: center;
  gap: 7px;
  min-height: 116px;
  color: #9ca3af;
  font-size: 13px;
}

.character-empty i {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #fff4e6;
  color: #ff8a00;
  font-style: normal;
  font-weight: 700;
}

.character-picker-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-top: 1px solid #eef1f5;
}

.character-picker-actions button {
  height: 28px;
  border: 0;
  background: transparent;
  color: #15945a;
  cursor: pointer;
  font-size: 13px;
}

.prompt-picker-field {
  position: relative;
}

.prompt-picker-field b {
  color: #ff4d5e;
}

.prompt-picker-trigger {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid #dfe3eb;
  border-radius: 4px;
  background: #fff;
  color: #374151;
  cursor: pointer;
  text-align: left;
}

.prompt-picker-trigger span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt-picker-placeholder {
  color: #9ca3af !important;
}

.prompt-picker-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 19;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
  overflow: hidden;
}

.prompt-search {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) 62px;
  align-items: center;
  gap: 6px;
  margin: 10px;
  height: 34px;
  padding-left: 9px;
  border: 1px solid #18a45f;
  border-radius: 18px;
  color: #9ca3af;
}

.prompt-search input {
  height: 28px;
  padding: 0;
  border: 0;
}

.prompt-search button {
  align-self: stretch;
  border: 0;
  border-radius: 0 18px 18px 0;
  background: #18a45f;
  color: #fff;
  cursor: pointer;
}

.prompt-options {
  max-height: 220px;
  overflow-y: auto;
}

.prompt-options button {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 6px 10px;
  border: 0;
  border-bottom: 1px solid #eef1f5;
  background: #fff;
  color: #202534;
  cursor: pointer;
  text-align: left;
}

.prompt-options button:hover,
.prompt-options button.active {
  background: #f4f7f5;
}

.prompt-options i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  border-radius: 12px;
  background: #fff7ec;
  color: #ff8a00;
  font-style: normal;
  font-size: 12px;
}

.prompt-options span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.prompt-options .van-icon {
  color: #16a05d;
}

.prompt-tooltip-popover {
  position: fixed;
  z-index: 9999;
  width: 340px;
  max-height: 200px;
  overflow-y: auto;
  padding: 10px 12px;
  border-radius: 8px;
  background: #2c2c2c;
  color: #f0f0f0;
  font-size: 12px;
  line-height: 1.6;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  pointer-events: none;
}

.prompt-tooltip-popover pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: inherit;
}

/* 内置Prompt展示框 */
.prompt-builtin-box {
  margin-top: 8px;
  border: 1px solid #d9f1e4;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.prompt-builtin-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f6fffa;
  border-bottom: 1px solid #d9f1e4;
  font-size: 13px;
  color: #16a05d;
  font-weight: 600;
}

.prompt-builtin-content {
  padding: 10px 12px;
  max-height: 180px;
  overflow-y: auto;
  background: #fafafa;
}

.prompt-builtin-content pre {
  margin: 0;
  font-size: 12px;
  color: var(--ink);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
}

/* 预设内容展示框 */
.preset-content-box {
  margin-top: 8px;
  border: 1px solid #d4d4d8;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.preset-content-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
  color: #52525b;
  font-weight: 600;
}

.preset-content-body {
  padding: 10px 12px;
  max-height: 180px;
  overflow-y: auto;
  background: #fffef5;
}

.preset-content-body pre {
  margin: 0;
  font-size: 12px;
  color: var(--ink);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
}

.prompt-empty {
  display: grid;
  place-items: center;
  min-height: 116px;
  color: #9ca3af;
  font-size: 13px;
}

.prompt-picker-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 10px;
  border-top: 1px solid #eef1f5;
}

.prompt-picker-actions button {
  min-width: 92px;
  height: 32px;
  border: 0;
  border-radius: 16px;
  background: #dcf7eb;
  color: #15945a;
  cursor: pointer;
  font-size: 13px;
}

.prompt-picker-actions button:first-child {
  background: #e8f2ff;
  color: #2f80ed;
}

.prompt-picker-actions button:last-child {
  background: #fff3d8;
  color: #f59e0b;
}

.ai-result {
  margin: 12px 16px 72px;
  padding: 12px;
  border: 1px solid #d9f1e4;
  border-radius: 8px;
  background: #f6fffa;
}

.ai-result strong {
  display: block;
  margin-bottom: 8px;
}

.ai-result p {
  max-height: 180px;
  margin: 0;
  overflow-y: auto;
  color: #374151;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.result-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.result-actions button {
  height: 30px;
  border: 1px solid #16a05d;
  border-radius: 4px;
  background: #fff;
  color: #16a05d;
  cursor: pointer;
}

.ai-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 56px;
  padding: 10px 16px;
  border-top: 1px solid #eef1f5;
  background: #fff;
}

.ai-panel-footer span {
  color: #6b7280;
  font-size: 13px;
}

.ai-panel-footer button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 88px;
  height: 34px;
  border: 0;
  border-radius: 18px;
  background: #2f80ed;
  color: #fff;
  cursor: pointer;
}

.ai-panel-footer button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.ai-panel-footer .secondary-btn {
  background: #eef0f3;
  color: #202534;
}

.summary-popup {
  position: fixed;
  left: 50%;
  top: 50%;
  z-index: 32;
  display: grid;
  gap: 12px;
  width: min(620px, calc(100vw - 28px));
  max-height: calc(100vh - 40px);
  padding: 18px;
  overflow-y: auto;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.25);
}

.summary-popup header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-popup h3 {
  flex: 1;
  margin: 0;
  color: #111827;
  font-size: 17px;
}

.summary-popup header button,
.summary-popup footer button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid #dfe3eb;
  border-radius: 5px;
  background: #fff;
  color: #374151;
  cursor: pointer;
}

.summary-popup header button {
  padding: 0 9px;
}

.summary-popup header .ok-icon {
  border-color: #16a05d;
  background: #16a05d;
  color: #fff;
}

.summary-popup textarea {
  width: 100%;
  min-height: 220px;
  padding: 12px;
  border: 1px solid #dfe3eb;
  border-radius: 6px;
  background: #fff;
  color: #202534;
  font: inherit;
  line-height: 1.65;
  resize: vertical;
  outline: 0;
}

.summary-popup textarea:focus {
  border-color: #16a05d;
  box-shadow: 0 0 0 3px rgba(22, 160, 93, 0.1);
}

.summary-popup em {
  justify-self: end;
  margin-top: -38px;
  padding-right: 10px;
  color: #8a94a6;
  font-style: normal;
  font-size: 12px;
  pointer-events: none;
}

.summary-popup p {
  margin: 0;
  color: #ff8a00;
  font-size: 13px;
}

.summary-popup footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.summary-popup footer .primary {
  border-color: #16a05d;
  background: #16a05d;
  color: #fff;
}

.summary-popup footer .success {
  border-color: #2f80ed;
  background: #2f80ed;
  color: #fff;
}

.summary-popup footer .warning {
  border-color: #ff9800;
  background: #ff9800;
  color: #fff;
}

.summary-popup footer .save {
  border-color: #7c3aed;
  background: #7c3aed;
  color: #fff;
}

.summary-popup button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.popup {
  position: fixed;
  left: 50%;
  top: 50%;
  z-index: 31;
  display: grid;
  gap: 12px;
  width: min(520px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  padding: 20px 16px;
  overflow-y: auto;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.25);
}

.popup h3 {
  margin: 0;
  font-size: 16px;
}

.field-label {
  font-size: 13px;
  font-weight: 700;
}

.import-row {
  align-items: center;
}

.import-row .van-loading {
  flex-shrink: 0;
}

@media (max-width: 1280px) {
  .editor-body {
    grid-template-columns: 260px minmax(0, 1fr);
  }

  .ai-panel {
    position: absolute;
    top: 52px;
    right: 0;
    bottom: 10px;
    z-index: 5;
  }
}

@media (max-width: 760px) {
  .writing-page {
    padding: 0 10px 70px;
  }

  .works-toolbar {
    flex-wrap: wrap;
    padding: 10px 0;
  }

  .toolbar-spacer {
    display: none;
  }

  .book-grid {
    grid-template-columns: 1fr;
  }

  .editor-view {
    height: auto;
    min-height: calc(100vh - var(--header-h));
  }

  .editor-top,
  .editor-body {
    display: flex;
    flex-direction: column;
    height: auto;
  }

  .chapter-sidebar,
  .ai-panel {
    width: 100%;
    min-width: 0;
  }

  .ai-panel {
    position: static;
  }

  .editor-card {
    min-height: 70vh;
  }
}

/* 提示词内容预览 */
.prompt-preview-box {
  margin: 8px 16px 0;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}

.prompt-preview-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #f9fafb;
  cursor: pointer;
  user-select: none;
}

.prompt-preview-head span {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.prompt-preview-head small {
  color: #9ca3af;
  font-size: 11px;
}

.prompt-preview-body {
  margin: 0;
  padding: 10px 12px;
  background: #fffef5;
  color: #374151;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
  border-top: 1px solid #eef1f5;
}

/* 提取风格 */
.extract-style-btn {
  display: inline-flex; align-items: center; gap: 4px;
  background: none; border: 1px dashed #07c160; color: #07c160;
  padding: 4px 10px; border-radius: 4px; font-size: 13px; cursor: pointer;
}
.extract-style-row { margin-top: 8px; }
.extract-style-dialog { padding: 16px; }
.extract-style-dialog textarea {
  width: 100%; border: 1px solid #ebedf0; border-radius: 4px;
  padding: 8px; font-size: 13px; resize: vertical;
}
.extract-style-dialog small { color: #999; font-size: 11px; }
.extract-style-actions { margin-top: 12px; text-align: center; }
.extract-style-start-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: #07c160; color: #fff; border: none;
  padding: 8px 24px; border-radius: 6px; font-size: 14px; cursor: pointer;
}
.extract-style-start-btn:disabled { background: #a5d6b7; cursor: not-allowed; }
.extract-style-result { margin-top: 12px; }
.extract-style-result .result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.extract-style-result pre { background: #f7f8fa; padding: 10px; border-radius: 4px; font-size: 12px; white-space: pre-wrap; max-height: 200px; overflow-y: auto; }
.apply-style-btn { background: #07c160; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; }

/* === 自定义模式输入区域 === */
.custom-input-group {
  margin-top: 2px;
}

.custom-textarea {
  width: 100%;
  border: 1px solid var(--line, #ebedf0);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  font-family: inherit;
  background: #fffef9;
  color: #374151;
}
.custom-textarea:focus {
  outline: none;
  border-color: var(--brand, #1989fa);
  box-shadow: 0 0 0 2px rgba(25, 137, 250, 0.1);
}
.custom-textarea::placeholder {
  color: #bbb;
  font-size: 12px;
}

.custom-input-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.custom-input-actions button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px dashed var(--brand, #1989fa);
  color: var(--brand, #1989fa);
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.custom-input-actions button:disabled {
  border-color: #ddd;
  color: #ccc;
  cursor: not-allowed;
}

/* === 更多预设面板 === */
.more-presets-panel {
  display: grid;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
  margin-top: 6px;
  padding-right: 4px;
}

.preset-card {
  background: #fff;
  border: 1px solid var(--line, #ebedf0);
  border-radius: 8px;
  padding: 12px 14px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.preset-card:hover {
  border-color: var(--brand, #1989fa);
  box-shadow: 0 1px 6px rgba(0,0,0,0.06);
}
.preset-card.is-selected {
  border-color: var(--brand, #1989fa);
  background: #f0f7ff;
}

.preset-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.preset-card-head strong {
  font-size: 14px;
  color: #1f2937;
}
.preset-card-tags {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.preset-card-body {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #6b7280;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 80px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}

.preset-card-foot {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.text-btn {
  background: none;
  border: none;
  padding: 2px 8px;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
}
.text-btn.danger {
  color: #ee0a24;
}
.text-btn.danger:hover {
  background: #fef2f2;
}

/* === 保存预设弹窗 === */
.save-preset-dialog {
  padding: 12px 16px 16px;
}
.preset-preview-block {
  margin-top: 12px;
}
.preset-preview-block small {
  color: #999;
  font-size: 11px;
}
.preset-preview-block pre {
  margin: 6px 0 0;
  background: #f7f8fa;
  padding: 10px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 160px;
  overflow-y: auto;
  color: #374151;
}
</style>
