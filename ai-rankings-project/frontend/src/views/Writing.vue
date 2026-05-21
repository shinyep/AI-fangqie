<template>
  <main class="page writing-page" :class="{ 'is-editor': activeBook }">
    <section v-if="!activeBook" class="bookshelf-view"><section class="works-panel">
        <div class="works-tabs">
          <button class="tab" :class="{ active: activeBookTab === 'works' }" @click="activeBookTab = 'works'"><van-icon name="bookmark-o" />作品</button>
          <button class="tab" :class="{ active: activeBookTab === 'archive' }" @click="activeBookTab = 'archive'"><van-icon name="archive-o" />已归档</button>
          <button class="tab" :class="{ active: activeBookTab === 'trash' }" @click="activeBookTab = 'trash'"><van-icon name="delete-o" />回收站</button>
        </div>

        <div class="works-toolbar">
          <button class="folder-btn" @click="showNewFolder = true"><van-icon name="add" />新建文件夹</button>
          <div class="toolbar-spacer"></div>
          <button class="icon-btn" :class="{ active: viewMode === 'grid' }" title="宫格视图" @click="viewMode = 'grid'"><van-icon name="apps-o" /></button>
          <button class="icon-btn" :class="{ active: viewMode === 'list' }" title="列表视图" @click="viewMode = 'list'"><van-icon name="bars" /></button>
          <button class="pill active">全部</button>
          <button class="pill"><van-icon name="bookmark-o" />小说</button>
          <button class="pill"><van-icon name="label-o" />剧本</button>
          <div class="search-box">
            <van-icon name="search" />
            <input v-model="bookKeyword" placeholder="搜索书籍..." />
          </div>
          <button class="manage-btn" :class="{ active: batchMode }" @click="batchMode = !batchMode"><van-icon name="todo-list-o" />{{ batchMode ? '退出管理' : '批量管理' }}</button>
        </div>

        <div class="book-grid" :class="{ 'list-view': viewMode === 'list' }">
          <article class="create-card">
            <button class="create-plus" @click="showNewBook = true"><van-icon name="plus" /></button>
            <h2>新建作品</h2>
            <div class="create-actions">
              <button @click="showNewBook = true"><van-icon name="plus" />新建作品</button>
              <button @click="showImportBook = true"><van-icon name="sign" />导入作品</button>
            </div>
          </article>

          <article
            v-for="book in tabFilteredBooks"
            :key="book.id"
            class="work-card" :class="{ 'batch-selected': batchMode && batchSelected.has(book.id) }"
            @click="batchMode ? toggleBookSelection(book.id) : selectBook(book)"
          >
            <div v-if="batchMode" class="batch-checkbox" @click.stop><input type="checkbox" :checked="batchSelected.has(book.id)" @change.stop="toggleBookSelection(book.id)" /></div><div class="book-cover" :style="book.cover_url ? { backgroundImage: `url(${book.cover_url})` } : null">
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
              <button @click.stop="showToast('导入章节功能稍后接入')">导入章节</button>
              <button @click.stop="selectBook(book)">作品管理</button>
            </div>
          </article>
        </div>

        <div v-if="!tabFilteredBooks.length && books.length" class="empty-line">没有匹配的作品</div>
      </section>
    </section>

    <section v-else class="editor-view">
      <header class="editor-top">
        <div class="editor-left-tools">
          <button class="top-icon" title="返回作品列表" @click="backToShelf"><van-icon name="arrow-left" /></button>
          <button class="top-icon" title="全屏" @click="toggleFullscreen"><van-icon name="expand-o" /></button>
          <button class="top-icon" title="目录" :class="{ active: sidebarVisible }" @click="sidebarVisible = !sidebarVisible"><van-icon name="notes-o" /></button>
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
          <button class="top-icon" title="更多" @click="moreMenuOpen = !moreMenuOpen"><van-icon name="ellipsis" /></button>
          <div v-if="moreMenuOpen" class="more-dropdown" @click.stop>
            <button @click="showBookSettings = true; moreMenuOpen = false"><van-icon name="setting-o" />作品设置</button>
            <button @click="exportAllChapters; moreMenuOpen = false"><van-icon name="down" />导出全部章节</button>
            <button @click="toggleFullscreen; moreMenuOpen = false"><van-icon name="expand-o" />全屏切换</button>
            <button @click="sidebarVisible = !sidebarVisible; moreMenuOpen = false"><van-icon name="notes-o" />{{ sidebarVisible ? '隐藏' : '显示' }}目录</button>
          </div>
        </div>
      </header>

      <div class="editor-body">
        <aside class="chapter-sidebar" :class="{ collapsed: !sidebarVisible }">
          <div class="book-strip">
            <span>{{ activeBook.style || '小说' }}</span>
            <strong>{{ activeBook.title }}</strong>
          </div>

          <div class="chapter-actions">
            <button @click="addChapter"><van-icon name="plus" />新建章节</button>
            <button @click="showImportChapter = true" title="导入章节"><van-icon name="sign" /></button>
            <button @click="sortChapters" title="按序号排序"><van-icon name="sort" /></button>
            <button @click="showChapterBatchActions = !showChapterBatchActions" title="批量操作"><van-icon name="ellipsis" /></button>
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
                    <button type="button" @click="chapterMenuOpenId = null; aiGenerateChapterTitle(ch)">章节起名</button>
                    <button type="button" @click="chapterMenuOpenId = null; batchAutoTitleChapters()">章节起名（自动）</button>
                    <button type="button" @click="chapterMenuOpenId = null; chapterMenuOpenId = null; showToast('请在目录面板勾选章节后批量命名')">章节起名（批量）</button>
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
              <button title="撤销" @click="editorUndo"><van-icon name="revoke" /></button>
              <button title="重做" @click="editorRedo"><van-icon name="exchange" /></button>
              <button title="章纲" @click="openAiPanel('outline')"><van-icon name="description-o" /></button>
              <i></i>
              <button title="AI审校" @click="openAiPanel('review')"><van-icon name="scan" /></button>
              <button title="查找替换" @click="showFindDialog = true"><van-icon name="search" /></button>
              <i></i>
              <button title="提取风格" @click="openExtractStyleDialog"><van-icon name="brush-o" /></button>
              <button title="章节摘要" @click="activeChapter && openChapterSummary(activeChapter)"><van-icon name="notes-o" /></button>
              <button title="作品设置" @click="showBookSettings = true"><van-icon name="manager-o" /></button>
              <button title="AI魔法" @click="openAiPanel('continue')"><van-icon name="magic-o" /></button>
              <i></i>
              <button class="keyword-replace-btn" title="批量修改关键词" @click="openKeywordReplace"><van-icon name="replace" /><span>批量修改</span></button>
            </div>

            <div class="title-line">
              <van-icon name="magic-o" title="AI生成标题" @click="generateTitle" />
              <input
                v-model="draftTitle"
                placeholder="请输入章节标题"
                maxlength="35"
                @input="markDirty"
                @blur="saveCurrentChapter"
              />
              <span>{{ draftTitle.length }} / 35</span>
            </div>

            <textarea
              ref="contentInputRef"
              v-model="draftContent"
              class="content-input"
              placeholder="请输入章节内容"
              @input="handleContentInput"
              @keydown="handleEditorKeydown"
              @keyup="syncTextSelection"
              @mouseup="syncTextSelection"
              @select="syncTextSelection"
            ></textarea>

            <!-- 修复对比预览 -->
            <div v-if="repairDiffData" class="repair-diff-preview">
              <div class="repair-diff-header">
                <van-icon name="eye-o" />
                <strong>修复对比 — 审稿问题已自动修复</strong>
                <button class="repair-diff-dismiss" @click="repairDiffData = null">
                  <van-icon name="cross" />
                </button>
              </div>
              <div class="repair-diff-tabs">
                <button
                  :class="['repair-diff-tab', { active: repairDiffTab === 'original' }]"
                  @click="repairDiffTab = 'original'"
                >原文标记</button>
                <button
                  :class="['repair-diff-tab', { active: repairDiffTab === 'repaired' }]"
                  @click="repairDiffTab = 'repaired'"
                >修复后</button>
              </div>
              <div class="repair-diff-body">
                <!-- 原文标记视图 -->
                <div v-if="repairDiffTab === 'original'" class="repair-diff-original">
                  <div
                    v-for="(p, idx) in repairDiffParagraphs"
                    :key="idx"
                    :class="['repair-diff-block', 'diff-block-' + p.type]"
                  >
                    <template v-if="p.type === 'delete'">
                      <span class="block-marker del-marker">删除</span>
                      <p class="block-text del-text">{{ p.text }}</p>
                    
  <!-- 新建文件夹弹窗 -->
  <van-overlay :show="showNewFolder" @click="showNewFolder = false">
    <div class="popup" @click.stop>
      <h3>新建文件夹</h3>
      <van-field v-model="newFolderName" label="文件夹名" placeholder="输入文件夹名称" clearable />
      <van-button type="primary" block @click="showNewFolder = false; showSuccessToast('文件夹已创建'); newFolderName = ''">创建</van-button>
      <van-button block @click="showNewFolder = false; newFolderName = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入作品弹窗 -->
  <van-overlay :show="showImportBook" @click="showImportBook = false">
    <div class="popup" @click.stop>
      <h3>导入作品</h3>
      <p class="popup-hint">粘贴已有章节文本，系统将自动拆分为章节并创建新作品</p>
      <van-field v-model="newBookTitle" label="书名" placeholder="输入作品名称" clearable />
      <van-field v-model="importChapterText" label="文本内容" placeholder="在此粘贴全部章节文本..." type="textarea" rows="8" />
      <van-button type="primary" block :loading="creating" @click="importBookFromText">导入</van-button>
      <van-button block @click="showImportBook = false; importChapterText = ''; newBookTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入章节弹窗 -->
  <van-overlay :show="showImportChapter" @click="showImportChapter = false">
    <div class="popup" @click.stop>
      <h3>导入章节</h3>
      <van-field v-model="importChapterTitle" label="章节标题" placeholder="输入章节名称（可选）" clearable />
      <van-field v-model="importChapterText" label="章节内容" placeholder="粘贴章节正文..." type="textarea" rows="8" />
      <van-button type="primary" block @click="importChapterFromText">导入</van-button>
      <van-button block @click="showImportChapter = false; importChapterText = ''; importChapterTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 批量操作工具栏 -->
  <div v-if="batchMode && batchSelected.size > 0" class="batch-toolbar">
    <span>已选 {{ batchSelected.size }} 项</span>
    <button @click="batchDelete"><van-icon name="delete-o" /> 批量删除</button>
    <button @click="batchExport"><van-icon name="down" /> 批量导出</button>
    <button @click="batchMode = false; batchSelected.clear()"><van-icon name="cross" /> 取消</button>
  </div>

</template>
                    <template v-else-if="p.type === 'modified'">
                      <span class="block-marker mod-marker">修改</span>
                      <p class="block-text">
                        <span
                          v-for="(chunk, ci) in p.chunks.filter(c => c.type !== 'insert')"
                          :key="ci"
                          :class="['inline-chunk', 'ic-' + chunk.type]"
                        >{{ chunk.text }}</span>
                      </p>
                    
  <!-- 新建文件夹弹窗 -->
  <van-overlay :show="showNewFolder" @click="showNewFolder = false">
    <div class="popup" @click.stop>
      <h3>新建文件夹</h3>
      <van-field v-model="newFolderName" label="文件夹名" placeholder="输入文件夹名称" clearable />
      <van-button type="primary" block @click="showNewFolder = false; showSuccessToast('文件夹已创建'); newFolderName = ''">创建</van-button>
      <van-button block @click="showNewFolder = false; newFolderName = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入作品弹窗 -->
  <van-overlay :show="showImportBook" @click="showImportBook = false">
    <div class="popup" @click.stop>
      <h3>导入作品</h3>
      <p class="popup-hint">粘贴已有章节文本，系统将自动拆分为章节并创建新作品</p>
      <van-field v-model="newBookTitle" label="书名" placeholder="输入作品名称" clearable />
      <van-field v-model="importChapterText" label="文本内容" placeholder="在此粘贴全部章节文本..." type="textarea" rows="8" />
      <van-button type="primary" block :loading="creating" @click="importBookFromText">导入</van-button>
      <van-button block @click="showImportBook = false; importChapterText = ''; newBookTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入章节弹窗 -->
  <van-overlay :show="showImportChapter" @click="showImportChapter = false">
    <div class="popup" @click.stop>
      <h3>导入章节</h3>
      <van-field v-model="importChapterTitle" label="章节标题" placeholder="输入章节名称（可选）" clearable />
      <van-field v-model="importChapterText" label="章节内容" placeholder="粘贴章节正文..." type="textarea" rows="8" />
      <van-button type="primary" block @click="importChapterFromText">导入</van-button>
      <van-button block @click="showImportChapter = false; importChapterText = ''; importChapterTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 批量操作工具栏 -->
  <div v-if="batchMode && batchSelected.size > 0" class="batch-toolbar">
    <span>已选 {{ batchSelected.size }} 项</span>
    <button @click="batchDelete"><van-icon name="delete-o" /> 批量删除</button>
    <button @click="batchExport"><van-icon name="down" /> 批量导出</button>
    <button @click="batchMode = false; batchSelected.clear()"><van-icon name="cross" /> 取消</button>
  </div>

</template>
                    <template v-else-if="p.type === 'equal'">
                      <p class="block-text equal-block">{{ p.text }}</p>
                    
  <!-- 新建文件夹弹窗 -->
  <van-overlay :show="showNewFolder" @click="showNewFolder = false">
    <div class="popup" @click.stop>
      <h3>新建文件夹</h3>
      <van-field v-model="newFolderName" label="文件夹名" placeholder="输入文件夹名称" clearable />
      <van-button type="primary" block @click="showNewFolder = false; showSuccessToast('文件夹已创建'); newFolderName = ''">创建</van-button>
      <van-button block @click="showNewFolder = false; newFolderName = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入作品弹窗 -->
  <van-overlay :show="showImportBook" @click="showImportBook = false">
    <div class="popup" @click.stop>
      <h3>导入作品</h3>
      <p class="popup-hint">粘贴已有章节文本，系统将自动拆分为章节并创建新作品</p>
      <van-field v-model="newBookTitle" label="书名" placeholder="输入作品名称" clearable />
      <van-field v-model="importChapterText" label="文本内容" placeholder="在此粘贴全部章节文本..." type="textarea" rows="8" />
      <van-button type="primary" block :loading="creating" @click="importBookFromText">导入</van-button>
      <van-button block @click="showImportBook = false; importChapterText = ''; newBookTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入章节弹窗 -->
  <van-overlay :show="showImportChapter" @click="showImportChapter = false">
    <div class="popup" @click.stop>
      <h3>导入章节</h3>
      <van-field v-model="importChapterTitle" label="章节标题" placeholder="输入章节名称（可选）" clearable />
      <van-field v-model="importChapterText" label="章节内容" placeholder="粘贴章节正文..." type="textarea" rows="8" />
      <van-button type="primary" block @click="importChapterFromText">导入</van-button>
      <van-button block @click="showImportChapter = false; importChapterText = ''; importChapterTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 批量操作工具栏 -->
  <div v-if="batchMode && batchSelected.size > 0" class="batch-toolbar">
    <span>已选 {{ batchSelected.size }} 项</span>
    <button @click="batchDelete"><van-icon name="delete-o" /> 批量删除</button>
    <button @click="batchExport"><van-icon name="down" /> 批量导出</button>
    <button @click="batchMode = false; batchSelected.clear()"><van-icon name="cross" /> 取消</button>
  </div>

</template>
                  </div>
                </div>
                <!-- 修复后视图 -->
                <div v-else class="repair-diff-repaired">
                  <div
                    v-for="(p, idx) in repairDiffParagraphs"
                    :key="idx"
                    :class="['repair-diff-block', 'diff-block-' + p.type]"
                  >
                    <template v-if="p.type === 'insert'">
                      <span class="block-marker ins-marker">新增</span>
                      <p class="block-text ins-text">{{ p.text }}</p>
                    
  <!-- 新建文件夹弹窗 -->
  <van-overlay :show="showNewFolder" @click="showNewFolder = false">
    <div class="popup" @click.stop>
      <h3>新建文件夹</h3>
      <van-field v-model="newFolderName" label="文件夹名" placeholder="输入文件夹名称" clearable />
      <van-button type="primary" block @click="showNewFolder = false; showSuccessToast('文件夹已创建'); newFolderName = ''">创建</van-button>
      <van-button block @click="showNewFolder = false; newFolderName = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入作品弹窗 -->
  <van-overlay :show="showImportBook" @click="showImportBook = false">
    <div class="popup" @click.stop>
      <h3>导入作品</h3>
      <p class="popup-hint">粘贴已有章节文本，系统将自动拆分为章节并创建新作品</p>
      <van-field v-model="newBookTitle" label="书名" placeholder="输入作品名称" clearable />
      <van-field v-model="importChapterText" label="文本内容" placeholder="在此粘贴全部章节文本..." type="textarea" rows="8" />
      <van-button type="primary" block :loading="creating" @click="importBookFromText">导入</van-button>
      <van-button block @click="showImportBook = false; importChapterText = ''; newBookTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入章节弹窗 -->
  <van-overlay :show="showImportChapter" @click="showImportChapter = false">
    <div class="popup" @click.stop>
      <h3>导入章节</h3>
      <van-field v-model="importChapterTitle" label="章节标题" placeholder="输入章节名称（可选）" clearable />
      <van-field v-model="importChapterText" label="章节内容" placeholder="粘贴章节正文..." type="textarea" rows="8" />
      <van-button type="primary" block @click="importChapterFromText">导入</van-button>
      <van-button block @click="showImportChapter = false; importChapterText = ''; importChapterTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 批量操作工具栏 -->
  <div v-if="batchMode && batchSelected.size > 0" class="batch-toolbar">
    <span>已选 {{ batchSelected.size }} 项</span>
    <button @click="batchDelete"><van-icon name="delete-o" /> 批量删除</button>
    <button @click="batchExport"><van-icon name="down" /> 批量导出</button>
    <button @click="batchMode = false; batchSelected.clear()"><van-icon name="cross" /> 取消</button>
  </div>

</template>
                    <template v-else-if="p.type === 'modified'">
                      <span class="block-marker mod-marker">修改</span>
                      <p class="block-text">
                        <span
                          v-for="(chunk, ci) in p.chunks.filter(c => c.type !== 'delete')"
                          :key="ci"
                          :class="['inline-chunk', 'ic-' + chunk.type]"
                        >{{ chunk.text }}</span>
                      </p>
                    
  <!-- 新建文件夹弹窗 -->
  <van-overlay :show="showNewFolder" @click="showNewFolder = false">
    <div class="popup" @click.stop>
      <h3>新建文件夹</h3>
      <van-field v-model="newFolderName" label="文件夹名" placeholder="输入文件夹名称" clearable />
      <van-button type="primary" block @click="showNewFolder = false; showSuccessToast('文件夹已创建'); newFolderName = ''">创建</van-button>
      <van-button block @click="showNewFolder = false; newFolderName = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入作品弹窗 -->
  <van-overlay :show="showImportBook" @click="showImportBook = false">
    <div class="popup" @click.stop>
      <h3>导入作品</h3>
      <p class="popup-hint">粘贴已有章节文本，系统将自动拆分为章节并创建新作品</p>
      <van-field v-model="newBookTitle" label="书名" placeholder="输入作品名称" clearable />
      <van-field v-model="importChapterText" label="文本内容" placeholder="在此粘贴全部章节文本..." type="textarea" rows="8" />
      <van-button type="primary" block :loading="creating" @click="importBookFromText">导入</van-button>
      <van-button block @click="showImportBook = false; importChapterText = ''; newBookTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入章节弹窗 -->
  <van-overlay :show="showImportChapter" @click="showImportChapter = false">
    <div class="popup" @click.stop>
      <h3>导入章节</h3>
      <van-field v-model="importChapterTitle" label="章节标题" placeholder="输入章节名称（可选）" clearable />
      <van-field v-model="importChapterText" label="章节内容" placeholder="粘贴章节正文..." type="textarea" rows="8" />
      <van-button type="primary" block @click="importChapterFromText">导入</van-button>
      <van-button block @click="showImportChapter = false; importChapterText = ''; importChapterTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 批量操作工具栏 -->
  <div v-if="batchMode && batchSelected.size > 0" class="batch-toolbar">
    <span>已选 {{ batchSelected.size }} 项</span>
    <button @click="batchDelete"><van-icon name="delete-o" /> 批量删除</button>
    <button @click="batchExport"><van-icon name="down" /> 批量导出</button>
    <button @click="batchMode = false; batchSelected.clear()"><van-icon name="cross" /> 取消</button>
  </div>

</template>
                    <template v-else-if="p.type === 'equal'">
                      <p class="block-text equal-block">{{ p.text }}</p>
                    
  <!-- 新建文件夹弹窗 -->
  <van-overlay :show="showNewFolder" @click="showNewFolder = false">
    <div class="popup" @click.stop>
      <h3>新建文件夹</h3>
      <van-field v-model="newFolderName" label="文件夹名" placeholder="输入文件夹名称" clearable />
      <van-button type="primary" block @click="showNewFolder = false; showSuccessToast('文件夹已创建'); newFolderName = ''">创建</van-button>
      <van-button block @click="showNewFolder = false; newFolderName = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入作品弹窗 -->
  <van-overlay :show="showImportBook" @click="showImportBook = false">
    <div class="popup" @click.stop>
      <h3>导入作品</h3>
      <p class="popup-hint">粘贴已有章节文本，系统将自动拆分为章节并创建新作品</p>
      <van-field v-model="newBookTitle" label="书名" placeholder="输入作品名称" clearable />
      <van-field v-model="importChapterText" label="文本内容" placeholder="在此粘贴全部章节文本..." type="textarea" rows="8" />
      <van-button type="primary" block :loading="creating" @click="importBookFromText">导入</van-button>
      <van-button block @click="showImportBook = false; importChapterText = ''; newBookTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入章节弹窗 -->
  <van-overlay :show="showImportChapter" @click="showImportChapter = false">
    <div class="popup" @click.stop>
      <h3>导入章节</h3>
      <van-field v-model="importChapterTitle" label="章节标题" placeholder="输入章节名称（可选）" clearable />
      <van-field v-model="importChapterText" label="章节内容" placeholder="粘贴章节正文..." type="textarea" rows="8" />
      <van-button type="primary" block @click="importChapterFromText">导入</van-button>
      <van-button block @click="showImportChapter = false; importChapterText = ''; importChapterTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 批量操作工具栏 -->
  <div v-if="batchMode && batchSelected.size > 0" class="batch-toolbar">
    <span>已选 {{ batchSelected.size }} 项</span>
    <button @click="batchDelete"><van-icon name="delete-o" /> 批量删除</button>
    <button @click="batchExport"><van-icon name="down" /> 批量导出</button>
    <button @click="batchMode = false; batchSelected.clear()"><van-icon name="cross" /> 取消</button>
  </div>

</template>
                  </div>
                </div>
              </div>
              <div class="repair-diff-stats">
                <span class="rds-item rds-del">删除 {{ repairDiffData.stats.removed + repairDiffData.stats.modified }} 段</span>
                <span class="rds-item rds-ins">新增 {{ repairDiffData.stats.added + repairDiffData.stats.modified }} 段</span>
                <span class="rds-item rds-eq">不变 {{ repairDiffData.stats.unchanged }} 段</span>
              </div>
            </div>

            <div v-if="showInlinePreview" class="ai-inline-preview">
              <div class="ai-inline-preview-header">
                <van-icon name="warning-o" />
                <strong>{{ activeAiConfig.label }}预览</strong>
                <span class="ai-inline-preview-hint">AI 生成，与原文对比查看</span>
                <button class="ai-inline-dismiss-btn" @click="dismissInlinePreview">
                  <van-icon name="cross" />
                </button>
              </div>
              <div class="ai-inline-diff-tabs">
                <button
                  :class="['ai-inline-diff-tab', { active: inlineDiffTab === 'original' }]"
                  @click="inlineDiffTab = 'original'"
                >对比原文</button>
                <button
                  :class="['ai-inline-diff-tab', { active: inlineDiffTab === 'repaired' }]"
                  @click="inlineDiffTab = 'repaired'"
                >生成结果</button>
              </div>
              <div class="ai-inline-preview-content">
                <!-- 原文视图：展示删除和待修改的内容 -->
                <div v-if="inlineDiffTab === 'original'">
                  <div v-if="inlineDiffParagraphs.length > 0">
                    <div
                      v-for="(p, idx) in inlineDiffParagraphs"
                      :key="idx"
                      :class="['inline-diff-block', 'idb-' + p.type]"
                    >
                      <template v-if="p.type === 'delete'">
                        <span class="idb-marker idb-del">删除</span>
                        <p class="idb-text idb-text-del">{{ p.text }}</p>
                      
  <!-- 新建文件夹弹窗 -->
  <van-overlay :show="showNewFolder" @click="showNewFolder = false">
    <div class="popup" @click.stop>
      <h3>新建文件夹</h3>
      <van-field v-model="newFolderName" label="文件夹名" placeholder="输入文件夹名称" clearable />
      <van-button type="primary" block @click="showNewFolder = false; showSuccessToast('文件夹已创建'); newFolderName = ''">创建</van-button>
      <van-button block @click="showNewFolder = false; newFolderName = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入作品弹窗 -->
  <van-overlay :show="showImportBook" @click="showImportBook = false">
    <div class="popup" @click.stop>
      <h3>导入作品</h3>
      <p class="popup-hint">粘贴已有章节文本，系统将自动拆分为章节并创建新作品</p>
      <van-field v-model="newBookTitle" label="书名" placeholder="输入作品名称" clearable />
      <van-field v-model="importChapterText" label="文本内容" placeholder="在此粘贴全部章节文本..." type="textarea" rows="8" />
      <van-button type="primary" block :loading="creating" @click="importBookFromText">导入</van-button>
      <van-button block @click="showImportBook = false; importChapterText = ''; newBookTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入章节弹窗 -->
  <van-overlay :show="showImportChapter" @click="showImportChapter = false">
    <div class="popup" @click.stop>
      <h3>导入章节</h3>
      <van-field v-model="importChapterTitle" label="章节标题" placeholder="输入章节名称（可选）" clearable />
      <van-field v-model="importChapterText" label="章节内容" placeholder="粘贴章节正文..." type="textarea" rows="8" />
      <van-button type="primary" block @click="importChapterFromText">导入</van-button>
      <van-button block @click="showImportChapter = false; importChapterText = ''; importChapterTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 批量操作工具栏 -->
  <div v-if="batchMode && batchSelected.size > 0" class="batch-toolbar">
    <span>已选 {{ batchSelected.size }} 项</span>
    <button @click="batchDelete"><van-icon name="delete-o" /> 批量删除</button>
    <button @click="batchExport"><van-icon name="down" /> 批量导出</button>
    <button @click="batchMode = false; batchSelected.clear()"><van-icon name="cross" /> 取消</button>
  </div>

</template>
                      <template v-else-if="p.type === 'modified'">
                        <span class="idb-marker idb-mod">修改</span>
                        <p class="idb-text">
                          <span
                            v-for="(chunk, ci) in p.chunks.filter(c => c.type !== 'insert')"
                            :key="ci"
                            :class="['idb-chunk', 'idbc-' + chunk.type]"
                          >{{ chunk.text }}</span>
                        </p>
                      
  <!-- 新建文件夹弹窗 -->
  <van-overlay :show="showNewFolder" @click="showNewFolder = false">
    <div class="popup" @click.stop>
      <h3>新建文件夹</h3>
      <van-field v-model="newFolderName" label="文件夹名" placeholder="输入文件夹名称" clearable />
      <van-button type="primary" block @click="showNewFolder = false; showSuccessToast('文件夹已创建'); newFolderName = ''">创建</van-button>
      <van-button block @click="showNewFolder = false; newFolderName = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入作品弹窗 -->
  <van-overlay :show="showImportBook" @click="showImportBook = false">
    <div class="popup" @click.stop>
      <h3>导入作品</h3>
      <p class="popup-hint">粘贴已有章节文本，系统将自动拆分为章节并创建新作品</p>
      <van-field v-model="newBookTitle" label="书名" placeholder="输入作品名称" clearable />
      <van-field v-model="importChapterText" label="文本内容" placeholder="在此粘贴全部章节文本..." type="textarea" rows="8" />
      <van-button type="primary" block :loading="creating" @click="importBookFromText">导入</van-button>
      <van-button block @click="showImportBook = false; importChapterText = ''; newBookTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入章节弹窗 -->
  <van-overlay :show="showImportChapter" @click="showImportChapter = false">
    <div class="popup" @click.stop>
      <h3>导入章节</h3>
      <van-field v-model="importChapterTitle" label="章节标题" placeholder="输入章节名称（可选）" clearable />
      <van-field v-model="importChapterText" label="章节内容" placeholder="粘贴章节正文..." type="textarea" rows="8" />
      <van-button type="primary" block @click="importChapterFromText">导入</van-button>
      <van-button block @click="showImportChapter = false; importChapterText = ''; importChapterTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 批量操作工具栏 -->
  <div v-if="batchMode && batchSelected.size > 0" class="batch-toolbar">
    <span>已选 {{ batchSelected.size }} 项</span>
    <button @click="batchDelete"><van-icon name="delete-o" /> 批量删除</button>
    <button @click="batchExport"><van-icon name="down" /> 批量导出</button>
    <button @click="batchMode = false; batchSelected.clear()"><van-icon name="cross" /> 取消</button>
  </div>

</template>
                      <template v-else-if="p.type === 'equal'">
                        <p class="idb-text idb-text-eq">{{ p.text }}</p>
                      
  <!-- 新建文件夹弹窗 -->
  <van-overlay :show="showNewFolder" @click="showNewFolder = false">
    <div class="popup" @click.stop>
      <h3>新建文件夹</h3>
      <van-field v-model="newFolderName" label="文件夹名" placeholder="输入文件夹名称" clearable />
      <van-button type="primary" block @click="showNewFolder = false; showSuccessToast('文件夹已创建'); newFolderName = ''">创建</van-button>
      <van-button block @click="showNewFolder = false; newFolderName = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入作品弹窗 -->
  <van-overlay :show="showImportBook" @click="showImportBook = false">
    <div class="popup" @click.stop>
      <h3>导入作品</h3>
      <p class="popup-hint">粘贴已有章节文本，系统将自动拆分为章节并创建新作品</p>
      <van-field v-model="newBookTitle" label="书名" placeholder="输入作品名称" clearable />
      <van-field v-model="importChapterText" label="文本内容" placeholder="在此粘贴全部章节文本..." type="textarea" rows="8" />
      <van-button type="primary" block :loading="creating" @click="importBookFromText">导入</van-button>
      <van-button block @click="showImportBook = false; importChapterText = ''; newBookTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入章节弹窗 -->
  <van-overlay :show="showImportChapter" @click="showImportChapter = false">
    <div class="popup" @click.stop>
      <h3>导入章节</h3>
      <van-field v-model="importChapterTitle" label="章节标题" placeholder="输入章节名称（可选）" clearable />
      <van-field v-model="importChapterText" label="章节内容" placeholder="粘贴章节正文..." type="textarea" rows="8" />
      <van-button type="primary" block @click="importChapterFromText">导入</van-button>
      <van-button block @click="showImportChapter = false; importChapterText = ''; importChapterTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 批量操作工具栏 -->
  <div v-if="batchMode && batchSelected.size > 0" class="batch-toolbar">
    <span>已选 {{ batchSelected.size }} 项</span>
    <button @click="batchDelete"><van-icon name="delete-o" /> 批量删除</button>
    <button @click="batchExport"><van-icon name="down" /> 批量导出</button>
    <button @click="batchMode = false; batchSelected.clear()"><van-icon name="cross" /> 取消</button>
  </div>

</template>
                    </div>
                  </div>
                  <div v-else class="idb-empty">（原文为空或与结果完全相同）</div>
                </div>
                <!-- 结果视图：展示新增和修改后的内容 -->
                <div v-else>
                  <div v-if="inlineDiffParagraphs.length > 0">
                    <div
                      v-for="(p, idx) in inlineDiffParagraphs"
                      :key="idx"
                      :class="['inline-diff-block', 'idb-' + p.type]"
                    >
                      <template v-if="p.type === 'insert'">
                        <span class="idb-marker idb-ins">新增</span>
                        <p class="idb-text idb-text-ins">{{ p.text }}</p>
                      
  <!-- 新建文件夹弹窗 -->
  <van-overlay :show="showNewFolder" @click="showNewFolder = false">
    <div class="popup" @click.stop>
      <h3>新建文件夹</h3>
      <van-field v-model="newFolderName" label="文件夹名" placeholder="输入文件夹名称" clearable />
      <van-button type="primary" block @click="showNewFolder = false; showSuccessToast('文件夹已创建'); newFolderName = ''">创建</van-button>
      <van-button block @click="showNewFolder = false; newFolderName = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入作品弹窗 -->
  <van-overlay :show="showImportBook" @click="showImportBook = false">
    <div class="popup" @click.stop>
      <h3>导入作品</h3>
      <p class="popup-hint">粘贴已有章节文本，系统将自动拆分为章节并创建新作品</p>
      <van-field v-model="newBookTitle" label="书名" placeholder="输入作品名称" clearable />
      <van-field v-model="importChapterText" label="文本内容" placeholder="在此粘贴全部章节文本..." type="textarea" rows="8" />
      <van-button type="primary" block :loading="creating" @click="importBookFromText">导入</van-button>
      <van-button block @click="showImportBook = false; importChapterText = ''; newBookTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入章节弹窗 -->
  <van-overlay :show="showImportChapter" @click="showImportChapter = false">
    <div class="popup" @click.stop>
      <h3>导入章节</h3>
      <van-field v-model="importChapterTitle" label="章节标题" placeholder="输入章节名称（可选）" clearable />
      <van-field v-model="importChapterText" label="章节内容" placeholder="粘贴章节正文..." type="textarea" rows="8" />
      <van-button type="primary" block @click="importChapterFromText">导入</van-button>
      <van-button block @click="showImportChapter = false; importChapterText = ''; importChapterTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 批量操作工具栏 -->
  <div v-if="batchMode && batchSelected.size > 0" class="batch-toolbar">
    <span>已选 {{ batchSelected.size }} 项</span>
    <button @click="batchDelete"><van-icon name="delete-o" /> 批量删除</button>
    <button @click="batchExport"><van-icon name="down" /> 批量导出</button>
    <button @click="batchMode = false; batchSelected.clear()"><van-icon name="cross" /> 取消</button>
  </div>

</template>
                      <template v-else-if="p.type === 'modified'">
                        <span class="idb-marker idb-mod">修改</span>
                        <p class="idb-text">
                          <span
                            v-for="(chunk, ci) in p.chunks.filter(c => c.type !== 'delete')"
                            :key="ci"
                            :class="['idb-chunk', 'idbc-' + chunk.type]"
                          >{{ chunk.text }}</span>
                        </p>
                      
  <!-- 新建文件夹弹窗 -->
  <van-overlay :show="showNewFolder" @click="showNewFolder = false">
    <div class="popup" @click.stop>
      <h3>新建文件夹</h3>
      <van-field v-model="newFolderName" label="文件夹名" placeholder="输入文件夹名称" clearable />
      <van-button type="primary" block @click="showNewFolder = false; showSuccessToast('文件夹已创建'); newFolderName = ''">创建</van-button>
      <van-button block @click="showNewFolder = false; newFolderName = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入作品弹窗 -->
  <van-overlay :show="showImportBook" @click="showImportBook = false">
    <div class="popup" @click.stop>
      <h3>导入作品</h3>
      <p class="popup-hint">粘贴已有章节文本，系统将自动拆分为章节并创建新作品</p>
      <van-field v-model="newBookTitle" label="书名" placeholder="输入作品名称" clearable />
      <van-field v-model="importChapterText" label="文本内容" placeholder="在此粘贴全部章节文本..." type="textarea" rows="8" />
      <van-button type="primary" block :loading="creating" @click="importBookFromText">导入</van-button>
      <van-button block @click="showImportBook = false; importChapterText = ''; newBookTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入章节弹窗 -->
  <van-overlay :show="showImportChapter" @click="showImportChapter = false">
    <div class="popup" @click.stop>
      <h3>导入章节</h3>
      <van-field v-model="importChapterTitle" label="章节标题" placeholder="输入章节名称（可选）" clearable />
      <van-field v-model="importChapterText" label="章节内容" placeholder="粘贴章节正文..." type="textarea" rows="8" />
      <van-button type="primary" block @click="importChapterFromText">导入</van-button>
      <van-button block @click="showImportChapter = false; importChapterText = ''; importChapterTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 批量操作工具栏 -->
  <div v-if="batchMode && batchSelected.size > 0" class="batch-toolbar">
    <span>已选 {{ batchSelected.size }} 项</span>
    <button @click="batchDelete"><van-icon name="delete-o" /> 批量删除</button>
    <button @click="batchExport"><van-icon name="down" /> 批量导出</button>
    <button @click="batchMode = false; batchSelected.clear()"><van-icon name="cross" /> 取消</button>
  </div>

</template>
                      <template v-else-if="p.type === 'equal'">
                        <p class="idb-text idb-text-eq">{{ p.text }}</p>
                      
  <!-- 新建文件夹弹窗 -->
  <van-overlay :show="showNewFolder" @click="showNewFolder = false">
    <div class="popup" @click.stop>
      <h3>新建文件夹</h3>
      <van-field v-model="newFolderName" label="文件夹名" placeholder="输入文件夹名称" clearable />
      <van-button type="primary" block @click="showNewFolder = false; showSuccessToast('文件夹已创建'); newFolderName = ''">创建</van-button>
      <van-button block @click="showNewFolder = false; newFolderName = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入作品弹窗 -->
  <van-overlay :show="showImportBook" @click="showImportBook = false">
    <div class="popup" @click.stop>
      <h3>导入作品</h3>
      <p class="popup-hint">粘贴已有章节文本，系统将自动拆分为章节并创建新作品</p>
      <van-field v-model="newBookTitle" label="书名" placeholder="输入作品名称" clearable />
      <van-field v-model="importChapterText" label="文本内容" placeholder="在此粘贴全部章节文本..." type="textarea" rows="8" />
      <van-button type="primary" block :loading="creating" @click="importBookFromText">导入</van-button>
      <van-button block @click="showImportBook = false; importChapterText = ''; newBookTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入章节弹窗 -->
  <van-overlay :show="showImportChapter" @click="showImportChapter = false">
    <div class="popup" @click.stop>
      <h3>导入章节</h3>
      <van-field v-model="importChapterTitle" label="章节标题" placeholder="输入章节名称（可选）" clearable />
      <van-field v-model="importChapterText" label="章节内容" placeholder="粘贴章节正文..." type="textarea" rows="8" />
      <van-button type="primary" block @click="importChapterFromText">导入</van-button>
      <van-button block @click="showImportChapter = false; importChapterText = ''; importChapterTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 批量操作工具栏 -->
  <div v-if="batchMode && batchSelected.size > 0" class="batch-toolbar">
    <span>已选 {{ batchSelected.size }} 项</span>
    <button @click="batchDelete"><van-icon name="delete-o" /> 批量删除</button>
    <button @click="batchExport"><van-icon name="down" /> 批量导出</button>
    <button @click="batchMode = false; batchSelected.clear()"><van-icon name="cross" /> 取消</button>
  </div>

</template>
                    </div>
                  </div>
                  <div v-else class="idb-empty">（结果为空）</div>
                </div>
              </div>
              <div class="ai-inline-diff-stats" v-if="inlineDiffStats.total > 0">
                <span class="aids-item aids-del">删除 {{ inlineDiffStats.removed + inlineDiffStats.modified }} 段</span>
                <span class="aids-item aids-ins">新增 {{ inlineDiffStats.added + inlineDiffStats.modified }} 段</span>
                <span class="aids-item aids-eq">不变 {{ inlineDiffStats.unchanged }} 段</span>
              </div>
              <div class="ai-inline-preview-actions">
                <button class="ai-inline-apply-btn" @click="applyInlinePreview">
                  {{ processingAnchor ? '替换到原位置' : hasActiveSelection ? '替换选中段落' : '插入到光标' }}
                </button>
                <button class="ai-inline-dismiss-btn" @click="dismissInlinePreview">丢弃</button>
              </div>
            </div>

            
            <!-- 查找替换对话框 -->
            <div v-if="showFindDialog" class="find-dialog">
              <div class="find-dialog-header">
                <span>查找替换</span>
                <button @click="showFindDialog = false"><van-icon name="cross" /></button>
              </div>
              <div class="find-dialog-body">
                <div class="find-row">
                  <input v-model="findKeyword" placeholder="查找..." @input="findInChapter" />
                  <span v-if="findResults.length">{{ activeFindIndex + 1 }}/{{ findResults.length }}</span>
                </div>
                <div class="find-row">
                  <input v-model="findReplaceText" placeholder="替换为..." />
                </div>
                <div class="find-actions">
                  <button @click="findInChapter" :disabled="!findKeyword">查找</button>
                  <button @click="replaceCurrent" :disabled="!findResults.length">替换</button>
                  <button @click="replaceAll" :disabled="!findKeyword">全部替换</button>
                </div>
                <div v-if="findResults.length" class="find-results">
                  <div v-for="(r, i) in findResults" :key="i" class="find-result-item" :class="{ active: i === activeFindIndex }" @click="activeFindIndex = i">{{ r.preview }}</div>
                </div>
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

            <ModelSelector
              v-model:provider="selectedProvider"
              v-model:model="aiForm.model"
            />

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
              <button class="secondary-btn" type="button" @click="showToast('自定义规则功能即将上线')">添加规则</button>
              <button :disabled="aiLoading" @click="runAi">
                <van-loading v-if="aiLoading" size="14" color="#fff" />
                <van-icon v-else name="edit" />
                {{ aiLoading ? '检查中' : '开始检查' }}
              </button>
            </div>
          
  <!-- 新建文件夹弹窗 -->
  <van-overlay :show="showNewFolder" @click="showNewFolder = false">
    <div class="popup" @click.stop>
      <h3>新建文件夹</h3>
      <van-field v-model="newFolderName" label="文件夹名" placeholder="输入文件夹名称" clearable />
      <van-button type="primary" block @click="showNewFolder = false; showSuccessToast('文件夹已创建'); newFolderName = ''">创建</van-button>
      <van-button block @click="showNewFolder = false; newFolderName = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入作品弹窗 -->
  <van-overlay :show="showImportBook" @click="showImportBook = false">
    <div class="popup" @click.stop>
      <h3>导入作品</h3>
      <p class="popup-hint">粘贴已有章节文本，系统将自动拆分为章节并创建新作品</p>
      <van-field v-model="newBookTitle" label="书名" placeholder="输入作品名称" clearable />
      <van-field v-model="importChapterText" label="文本内容" placeholder="在此粘贴全部章节文本..." type="textarea" rows="8" />
      <van-button type="primary" block :loading="creating" @click="importBookFromText">导入</van-button>
      <van-button block @click="showImportBook = false; importChapterText = ''; newBookTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入章节弹窗 -->
  <van-overlay :show="showImportChapter" @click="showImportChapter = false">
    <div class="popup" @click.stop>
      <h3>导入章节</h3>
      <van-field v-model="importChapterTitle" label="章节标题" placeholder="输入章节名称（可选）" clearable />
      <van-field v-model="importChapterText" label="章节内容" placeholder="粘贴章节正文..." type="textarea" rows="8" />
      <van-button type="primary" block @click="importChapterFromText">导入</van-button>
      <van-button block @click="showImportChapter = false; importChapterText = ''; importChapterTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 批量操作工具栏 -->
  <div v-if="batchMode && batchSelected.size > 0" class="batch-toolbar">
    <span>已选 {{ batchSelected.size }} 项</span>
    <button @click="batchDelete"><van-icon name="delete-o" /> 批量删除</button>
    <button @click="batchExport"><van-icon name="down" /> 批量导出</button>
    <button @click="batchMode = false; batchSelected.clear()"><van-icon name="cross" /> 取消</button>
  </div>

</template>

          <template v-else-if="activeAiConfig.key === 'review'">
            <div class="ai-panel-body">
              <ModelSelector
                v-model:provider="selectedProvider"
                v-model:model="aiForm.model"
              />

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
                @diff-ready="onRepairDiffReady"
              />

              <QualityReportPanel
                :novel-id="activeBook?.id"
              />
            </div>
          
  <!-- 新建文件夹弹窗 -->
  <van-overlay :show="showNewFolder" @click="showNewFolder = false">
    <div class="popup" @click.stop>
      <h3>新建文件夹</h3>
      <van-field v-model="newFolderName" label="文件夹名" placeholder="输入文件夹名称" clearable />
      <van-button type="primary" block @click="showNewFolder = false; showSuccessToast('文件夹已创建'); newFolderName = ''">创建</van-button>
      <van-button block @click="showNewFolder = false; newFolderName = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入作品弹窗 -->
  <van-overlay :show="showImportBook" @click="showImportBook = false">
    <div class="popup" @click.stop>
      <h3>导入作品</h3>
      <p class="popup-hint">粘贴已有章节文本，系统将自动拆分为章节并创建新作品</p>
      <van-field v-model="newBookTitle" label="书名" placeholder="输入作品名称" clearable />
      <van-field v-model="importChapterText" label="文本内容" placeholder="在此粘贴全部章节文本..." type="textarea" rows="8" />
      <van-button type="primary" block :loading="creating" @click="importBookFromText">导入</van-button>
      <van-button block @click="showImportBook = false; importChapterText = ''; newBookTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入章节弹窗 -->
  <van-overlay :show="showImportChapter" @click="showImportChapter = false">
    <div class="popup" @click.stop>
      <h3>导入章节</h3>
      <van-field v-model="importChapterTitle" label="章节标题" placeholder="输入章节名称（可选）" clearable />
      <van-field v-model="importChapterText" label="章节内容" placeholder="粘贴章节正文..." type="textarea" rows="8" />
      <van-button type="primary" block @click="importChapterFromText">导入</van-button>
      <van-button block @click="showImportChapter = false; importChapterText = ''; importChapterTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 批量操作工具栏 -->
  <div v-if="batchMode && batchSelected.size > 0" class="batch-toolbar">
    <span>已选 {{ batchSelected.size }} 项</span>
    <button @click="batchDelete"><van-icon name="delete-o" /> 批量删除</button>
    <button @click="batchExport"><van-icon name="down" /> 批量导出</button>
    <button @click="batchMode = false; batchSelected.clear()"><van-icon name="cross" /> 取消</button>
  </div>

</template>

          <template v-else>
          <div class="ai-panel-body">
          <label class="switch-row">
            <span>高级功能</span>
            <van-switch v-model="aiForm.advanced" size="22px" />
          </label>
          <p class="helper-text">通过提供角色、词条、关联知识库等元数据，能够有效提高 AI 创作内容的质量和相关性</p>

          <ModelSelector
            v-model:provider="selectedProvider"
            v-model:model="aiForm.model"
          />

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
              <small>（优先使用正文中划选的段落，超过5000字不会发送给AI）</small>
              <b>*</b>
            </span>
            <div class="source-text-row">
              <textarea
                v-model="aiForm.sourceText"
                maxlength="5000"
                :placeholder="`划选正文段落后点击「获取选中」，或直接在这里输入要处理的文本`"
              ></textarea>
              <button
                type="button"
                class="grab-selection-btn"
                @click="grabEditorSelection"
                title="将正文中划选的文本获取到此处"
              ><van-icon name="down" /> 获取选中</button>
            </div>
            <em>
              <span v-if="processingAnchor" class="anchor-badge">已锚定位置 {{ processingAnchor.start }}-{{ processingAnchor.end }}（{{ processingAnchor.text.length }}字）</span>
              {{ aiForm.sourceText.length }}/5000
            </em>
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

          <div class="field">
            <span>写作风格</span>
            <div class="segmented">
              <button class="active">快捷选项</button>
              <button>自定义</button>
              <button>更多</button>
            </div>
            <select v-model="aiForm.stylePreset">
              <option v-for="item in displayStylePresets" :key="item">{{ item }}</option>
            </select>
            <!-- 写作风格预设内容展示 -->
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
            <div class="extract-style-row">
              <button type="button" class="extract-style-btn" @click="openExtractStyleDialog">
                <van-icon name="fire-o" /> 从文本提取风格
              </button>
            </div>
          </div>

          <div class="field">
            <span>{{ requirementLabel }}<b v-if="isTextProcessMode || isOutlineTool">*</b></span>
            <div class="segmented">
              <button class="active">快捷选项</button>
              <button>自定义</button>
              <button>更多</button>
            </div>
            <select v-model="aiForm.requirementPreset">
              <option v-for="item in displayRequirementPresets" :key="item">{{ item }}</option>
            </select>
            <!-- 写作要求预设内容展示 -->
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

          <label class="field">
            <span>补充要求</span>
            <textarea v-model="aiForm.customRequirement" class="short" placeholder="可选：输入本次 AI 处理的额外要求"></textarea>
          </label>

          <div v-if="aiForm.result && (!isTextProcessMode || activeAiConfig.key === 'title')" class="ai-result">
            <!-- 章节起名专用 -->
            <template v-if="activeAiConfig.key === 'title'">
              <div class="title-result-card">
                <span class="title-result-label">AI 生成的章节标题</span>
                <strong class="title-result-text">{{ aiForm.result }}</strong>
                <div class="title-result-actions">
                  <button class="title-apply-btn" @click="applyTitleToDraft">设为章节标题</button>
                  <button class="title-copy-btn" @click="copyTitleResult">复制</button>
                  <button class="title-retry-btn" @click="runAi"><van-icon name="replay" /> 重新生成</button>
                </div>
              </div>
            </template>
            <!-- 通用展示 -->
            <template v-else>
              <strong>生成结果</strong>
              <p>{{ aiForm.result }}</p>
              <div class="result-actions">
                <button @click="applyAiResult('replace')">{{ processingAnchor ? '替换到原位置' : hasActiveSelection ? '替换选中段落' : '插入到光标' }}</button>
                <button @click="applyAiResult('append')">追加到正文</button>
              </div>
            </template>
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
          
  <!-- 新建文件夹弹窗 -->
  <van-overlay :show="showNewFolder" @click="showNewFolder = false">
    <div class="popup" @click.stop>
      <h3>新建文件夹</h3>
      <van-field v-model="newFolderName" label="文件夹名" placeholder="输入文件夹名称" clearable />
      <van-button type="primary" block @click="showNewFolder = false; showSuccessToast('文件夹已创建'); newFolderName = ''">创建</van-button>
      <van-button block @click="showNewFolder = false; newFolderName = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入作品弹窗 -->
  <van-overlay :show="showImportBook" @click="showImportBook = false">
    <div class="popup" @click.stop>
      <h3>导入作品</h3>
      <p class="popup-hint">粘贴已有章节文本，系统将自动拆分为章节并创建新作品</p>
      <van-field v-model="newBookTitle" label="书名" placeholder="输入作品名称" clearable />
      <van-field v-model="importChapterText" label="文本内容" placeholder="在此粘贴全部章节文本..." type="textarea" rows="8" />
      <van-button type="primary" block :loading="creating" @click="importBookFromText">导入</van-button>
      <van-button block @click="showImportBook = false; importChapterText = ''; newBookTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入章节弹窗 -->
  <van-overlay :show="showImportChapter" @click="showImportChapter = false">
    <div class="popup" @click.stop>
      <h3>导入章节</h3>
      <van-field v-model="importChapterTitle" label="章节标题" placeholder="输入章节名称（可选）" clearable />
      <van-field v-model="importChapterText" label="章节内容" placeholder="粘贴章节正文..." type="textarea" rows="8" />
      <van-button type="primary" block @click="importChapterFromText">导入</van-button>
      <van-button block @click="showImportChapter = false; importChapterText = ''; importChapterTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 批量操作工具栏 -->
  <div v-if="batchMode && batchSelected.size > 0" class="batch-toolbar">
    <span>已选 {{ batchSelected.size }} 项</span>
    <button @click="batchDelete"><van-icon name="delete-o" /> 批量删除</button>
    <button @click="batchExport"><van-icon name="down" /> 批量导出</button>
    <button @click="batchMode = false; batchSelected.clear()"><van-icon name="cross" /> 取消</button>
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

  <!-- 新建文件夹弹窗 -->
  <van-overlay :show="showNewFolder" @click="showNewFolder = false">
    <div class="popup" @click.stop>
      <h3>新建文件夹</h3>
      <van-field v-model="newFolderName" label="文件夹名" placeholder="输入文件夹名称" clearable />
      <van-button type="primary" block @click="showNewFolder = false; showSuccessToast('文件夹已创建'); newFolderName = ''">创建</van-button>
      <van-button block @click="showNewFolder = false; newFolderName = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入作品弹窗 -->
  <van-overlay :show="showImportBook" @click="showImportBook = false">
    <div class="popup" @click.stop>
      <h3>导入作品</h3>
      <p class="popup-hint">粘贴已有章节文本，系统将自动拆分为章节并创建新作品</p>
      <van-field v-model="newBookTitle" label="书名" placeholder="输入作品名称" clearable />
      <van-field v-model="importChapterText" label="文本内容" placeholder="在此粘贴全部章节文本..." type="textarea" rows="8" />
      <van-button type="primary" block :loading="creating" @click="importBookFromText">导入</van-button>
      <van-button block @click="showImportBook = false; importChapterText = ''; newBookTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 导入章节弹窗 -->
  <van-overlay :show="showImportChapter" @click="showImportChapter = false">
    <div class="popup" @click.stop>
      <h3>导入章节</h3>
      <van-field v-model="importChapterTitle" label="章节标题" placeholder="输入章节名称（可选）" clearable />
      <van-field v-model="importChapterText" label="章节内容" placeholder="粘贴章节正文..." type="textarea" rows="8" />
      <van-button type="primary" block @click="importChapterFromText">导入</van-button>
      <van-button block @click="showImportChapter = false; importChapterText = ''; importChapterTitle = ''">取消</van-button>
    </div>
  </van-overlay>

  <!-- 批量操作工具栏 -->
  <div v-if="batchMode && batchSelected.size > 0" class="batch-toolbar">
    <span>已选 {{ batchSelected.size }} 项</span>
    <button @click="batchDelete"><van-icon name="delete-o" /> 批量删除</button>
    <button @click="batchExport"><van-icon name="down" /> 批量导出</button>
    <button @click="batchMode = false; batchSelected.clear()"><van-icon name="cross" /> 取消</button>
  </div>

</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { showSuccessToast, showToast, showFailToast, showConfirmDialog } from 'vant';
import { fetchChapters, fetchProjects as fetchBooks, updateChapter, createChapter, deleteChapter } from '../api/books.js';
import { fetchProviders } from '../api/aiSettings.js';
import { useLlmStore } from '../stores/llmStore.js';
import { continueText, expandText, fetchWritingStyles, generateText } from '../api/writing.js';
import { fetchStylePresets } from '../api/prompts.js';
import { countChineseWords, getTodayStats, recordUsage } from '../utils/usageStats.js';
import ReviewPanel from './ReviewPanel.vue';
import RepairPanel from './RepairPanel.vue';
import QualityReportPanel from './QualityReportPanel.vue';
import ModelSelector from '../components/ModelSelector.vue';

import { useCorrectionRules } from '../composables/writing/useCorrectionRules.js';
import { useAiConfig } from '../composables/writing/useAiConfig.js';
import { useAiForm } from '../composables/writing/useAiForm.js';
import { useInit } from '../composables/writing/useInit.js';
import { useEditor, normalizeParagraphIndent } from '../composables/writing/useEditor.js';
import { useCharacterPicker } from '../composables/writing/useCharacterPicker.js';
import { usePromptPicker } from '../composables/writing/usePromptPicker.js';
import { useExtractStyle } from '../composables/writing/useExtractStyle.js';
import { useDiffPreview } from '../composables/writing/useDiffPreview.js';
import { useContextAwareness } from '../composables/writing/useContextAwareness.js';
import { useKeywordReplace } from '../composables/writing/useKeywordReplace.js';
import { useChapterSummary } from '../composables/writing/useChapterSummary.js';
import { useBookManagement } from '../composables/writing/useBookManagement.js';

const router = useRouter();
const chapters = ref([]);
const styles = ref([{ name: '玄幻' }]);
const activeChapter = ref(null);
const llmStore = useLlmStore();
const { selectedProvider, aiForm, ensureToolVariant, selectToolVariant } = useAiForm(llmStore);

const { todayStats, stylePresets, requirementPresets, activeLibraryPrompt, displayStylePresets, displayRequirementPresets, createCurrentStyleProfile, createSelectedStylePresetContent, createSelectedRequirementPresetContent, createMergedStyleProfile, getPresetContent, getPresetPromptSection } = useInit();

const { draftTitle, draftContent, dirty, saving, lastSavedAt, contentInputRef, textSelection, draftWordCount, lastSavedText, hasActiveSelection, setActiveChapter, markDirty, handleContentInput, handleEditorKeydown, syncTextSelection, refreshTextSelection, processingAnchor, setProcessingAnchor, clearProcessingAnchor } = useEditor();

const { books, activeBook, bookKeyword, showNewBook, showBookSettings, bookOutlineDraft, bookStyleProfileDraft, creating, newBookTitle, newBookDesc, newBookStyle, newBookOutlineJobId, savedOutlineJobs, loadingOutlineJobs, filteredBooks, formatWords, formatRelativeTime, loadBookSettings, loadOutlineJobsForCreate, createBook, saveBookSettings } = useBookManagement(showToast, showSuccessToast, showFailToast);

const chapterMenuOpenId = ref(null);
const chapterPickerOpen = ref(false);

// 新增：书架/编辑器交互状态
const activeBookTab = ref('works');
const viewMode = ref('grid');
const batchMode = ref(false);
const showNewFolder = ref(false);
const showImportBook = ref(false);
const showImportChapter = ref(false);
const showChapterBatchActions = ref(false);
const sidebarVisible = ref(true);
const moreMenuOpen = ref(false);
const showFindDialog = ref(false);
const batchSelected = ref(new Set());
const newFolderName = ref('');
const importChapterText = ref('');
const importChapterTitle = ref('');
const findKeyword = ref('');
const findReplaceText = ref('');
const findResults = ref([]);
const activeFindIndex = ref(0);
const chapterMenuPosition = ref({ top: 0, left: 0 });

const tabFilteredBooks = computed(() => {
  const base = filteredBooks.value;
  if (activeBookTab.value === 'archive') return base.filter(b => b.archived);
  if (activeBookTab.value === 'trash') return base.filter(b => b.deleted_at);
  return base.filter(b => !b.archived && !b.deleted_at);
});

const { keywordReplaceOpen, keywordReplaceScope, keywordReplacing, keywordReplaceEntries, keywordReplacePreview, hasValidKeywordEntries, addKeywordReplaceEntry, removeKeywordReplaceEntry, openKeywordReplace, previewKeywordReplace, executeKeywordReplace } = useKeywordReplace(chapters, activeChapter, activeBook, draftContent, markDirty, fetchChapters, showToast, showSuccessToast, showFailToast);
	const { summaryModalOpen, summaryChapter, summaryDraft, summaryGeneratingId, batchSummaryLoading, openChapterSummary, saveChapterSummary, generateChapterSummary, batchGenerateSummaries } = useChapterSummary(chapters, activeChapter, activeBook, draftContent, draftTitle, dirty, aiForm, chapterMenuOpenId, saveCurrentChapter, showToast, showSuccessToast);

const aiPanelOpen = ref(false);
const showPresetContent = ref(true);
const activeAiKey = ref('write');
const aiLoading = ref(false);
// 审稿相关状态
const repairLoading = ref(false);
const showRepairPanel = ref(false);
const currentReviewIssues = ref([]);
function onReviewDone(data) {
  currentReviewIssues.value = data.issues || [];
}
function onStartRepair({ issues }) {
  currentReviewIssues.value = issues || currentReviewIssues.value;
  showRepairPanel.value = true;
}
async function onApplyRepair(repairedContent) {
  if (!activeChapter.value?.id || !repairedContent) return;
  repairLoading.value = true;
  const normalized = normalizeParagraphIndent(repairedContent);
  try {
    await updateChapter(activeChapter.value.id, { project_id: activeBook.value.id, content: normalized, word_count: normalized.length });
    draftContent.value = normalized;
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
function onRepairDone() {
  repairLoading.value = false;
}
// 编辑器工具方法
function editorUndo() {
  editorRef.value?.editor?.chain().focus().undo().run();
}
function editorRedo() {
  editorRef.value?.editor?.chain().focus().redo().run();
}
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}
function toggleBookSelection(bookId) {
  const s = new Set(batchSelected.value);
  if (s.has(bookId)) s.delete(bookId); else s.add(bookId);
  batchSelected.value = s;
}
function exportAllChapters() {
  if (!chapters.value.length) { showToast('暂无可导出的章节'); return; }
  const lines = [];
  chapters.value.forEach((ch, i) => {
    lines.push('第' + (i+1) + '章 ' + (ch.title || ''));
    lines.push('');
    lines.push(ch.content || '');
    lines.push('');
    lines.push('---');
    lines.push('');
  });
  const text = lines.join('\n');
  const blob = new Blob([text], {type: 'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (activeBook.value?.title || '作品') + '.txt';
  a.click();
  URL.revokeObjectURL(url);
  showSuccessToast('导出成功');
}
function sortChapters() {
  const sorted = [...chapters.value].sort((a,b) => (a.chapter_index||0) - (b.chapter_index||0));
  chapters.value = sorted;
  showSuccessToast('已按章节序号排序');
}
function importChapterFromText() {
  if (!importChapterText.value.trim()) { showToast('请先粘贴章节文本'); return; }
  const title = importChapterTitle.value.trim() || ('导入章节' + (chapters.value.length + 1));
  const newIdx = chapters.value.length + 1;
  chapters.value.push({
    id: Date.now(),
    title: title,
    content: importChapterText.value,
    chapter_index: newIdx,
    word_count: importChapterText.value.length,
    updated_at: new Date().toISOString(),
  });
  showSuccessToast('已导入章节，请保存');
  showImportChapter.value = false;
  importChapterText.value = '';
  importChapterTitle.value = '';
}
function findInChapter() {
  if (!findKeyword.value.trim() || !draftContent.value) return;
  const text = draftContent.value;
  const keyword = findKeyword.value;
  const results = [];
  let idx = text.indexOf(keyword);
  while (idx !== -1) {
    const start = Math.max(0, idx - 20);
    const end = Math.min(text.length, idx + keyword.length + 20);
    results.push({ index: idx, preview: (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '') });
    idx = text.indexOf(keyword, idx + 1);
  }
  findResults.value = results;
  activeFindIndex.value = 0;
}
function replaceCurrent() {
  if (!findResults.value.length) return;
  const pos = findResults.value[activeFindIndex.value].index;
  draftContent.value = draftContent.value.slice(0, pos) + findReplaceText.value + draftContent.value.slice(pos + findKeyword.value.length);
  markDirty();
  findInChapter();
}
function replaceAll() {
  if (!findKeyword.value.trim()) return;
  draftContent.value = draftContent.value.split(findKeyword.value).join(findReplaceText.value);
  markDirty();
  showSuccessToast('全部替换完成');
  showFindDialog.value = false;
}
async function importBookFromText() {
  if (!newBookTitle.value.trim()) { showToast('请输入书名'); return; }
  if (!importChapterText.value.trim()) { showToast('请粘贴章节文本'); return; }
  creating.value = true;
  try {
    const chapters2 = importChapterText.value.split(/\n(?=第[\d一二三四五六七八九十百千]+[章回节])/).filter(Boolean);
    const book = await createBook();
    for (let i = 0; i < chapters2.length; i++) {
      await createChapter({ project_id: book.id, title: '第'+(i+1)+'章', content: chapters2[i], chapter_index: i+1, word_count: chapters2[i].length });
    }
    showImportBook.value = false;
    importChapterText.value = '';
    newBookTitle.value = '';
    showSuccessToast('导入成功');
    books.value = await fetchBooks();
  } catch (e) { showFailToast('导入失败: '+e.message); }
  finally { creating.value = false; }
}
function batchDelete() {
  if (!batchSelected.value.size) return;
  batchSelected.value.forEach(id => {
    const book = books.value.find(b => b.id === id);
    if (book) deleteBook(book);
  });
  batchSelected.value.clear();
  batchMode.value = false;
}
function batchExport() {
  if (!batchSelected.value.size) return;
  batchSelected.value.forEach(id => {
    const book = books.value.find(b => b.id === id);
    if (book) {
      const text = '作品：' + book.title + '\n简介：' + (book.description || '') + '\n风格：' + (book.style || '') + '\n';
      const blob = new Blob([text], {type: 'text/plain;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = book.title + '_info.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  });
  showSuccessToast('导出完成');
}
function aiGenerateChapterTitle(ch) {
  if (!ch) return;
  const content = (ch.content || '').slice(0, 300);
  if (!content.trim()) { showToast('章节内容为空，无法生成标题'); return; }
  aiForm.sourceText = content;
  aiForm.expandAction = 'title';
  selectChapter(ch);
  openAiPanel('title');
}
async function batchAutoTitleChapters() {
  const untitled = chapters.value.filter(c => !c.title || c.title.startsWith('第'));
  if (!untitled.length) { showToast('所有章节已有标题'); return; }
  showToast('正在为 ' + untitled.length + ' 个章节生成标题（此功能需要联网AI），请使用AI面板逐个生成');
}
async function generateTitle() {
  if (!draftContent.value.trim()) { showToast('请先输入章节内容'); return; }
  aiForm.sourceText = draftContent.value.slice(0, 500);
  aiForm.expandAction = 'title';
  openAiPanel('title');
}

const { correctionRules, setCorrectionRules, resetCorrectionRules } = useCorrectionRules();

const { aiFunctions, textProcessActions, AI_SOURCE_LIMIT, createActiveConfig } = useAiConfig();
const { availableCharacters, characterKeyword, characterPickerOpen, filteredCharacters, selectedCharacters, selectedCharactersForPrompt, syncSelectedCharacterNames, loadCharactersForWriting, openCharacterPicker, isCharacterSelected, toggleCharacter, selectAllCharacters, goCharacterManagement } = useCharacterPicker(aiForm);
const { availableRequirementPrompts, promptKeyword, promptPickerOpen, selectedRequirementPrompt, promptTooltip, promptTooltipStyle, outlinePromptContent, loadRequirementPrompts, openPromptPicker, selectRequirementPrompt, showPromptTooltip, hidePromptTooltip, goPromptLibrary, showCreatePromptTip } = usePromptPicker(aiForm, showToast);
const { extractStyleDialogOpen, extractStyleInput, extractStyleLoading, extractStyleResult, openExtractStyleDialog, doExtractStyle, applyExtractedStyle } = useExtractStyle(aiForm, draftContent, stylePresets, showToast, showFailToast);

const selectedPresetContent = computed(() => {
  return [getToolInstruction(activeAiConfig.value), getSystemPromptContent(activeAiConfig.value)]
    .filter(Boolean)
    .join('\n\n');
});

const { activeAiConfig, activeToolVariants, activeToolVariant, isTextProcessMode, isCorrectionTool, isOutlineTool, showVariantSelector, showTextProcessActions, requirementLabel, runButtonText } = createActiveConfig(activeAiKey, aiForm);
const { repairDiffData, repairDiffTab, repairDiffParagraphs, showInlinePreview, inlineDiffTab, inlineDiffResult, inlineDiffParagraphs, inlineDiffStats, onRepairDiffReady, dismissInlinePreview } = useDiffPreview(aiForm, isTextProcessMode, textSelection);

const currentStyleProfile = createCurrentStyleProfile(aiForm);
const selectedStylePresetContent = createSelectedStylePresetContent(aiForm, currentStyleProfile);
const selectedRequirementPresetContent = createSelectedRequirementPresetContent(aiForm);
const mergedStyleProfile = createMergedStyleProfile(currentStyleProfile, activeBook);

const { linkedChapterIds, autoCollectEnabled, contextCardExpanded, linkedChapterList, linkedChaptersWordCount, linkedChaptersContent, previousChapterExcerpt, chapterOutlineChain, contextBlockCount, contextSummary, contextTotalChars, contextTokenEstimate, contextTokenPercent, contextTokenClass, linkRecentChapters, toggleChapterLink, clearLinkedChapters } = useContextAwareness(chapters, activeChapter, aiForm, currentStyleProfile, selectedCharactersForPrompt);

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function chapterName(chapter) {
  const prefix = `第${chapter.chapter_index || ''}章`;
  return chapter.title ? `${prefix} ${chapter.title}` : prefix;
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

async function init() {
  todayStats.value = getTodayStats();
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
    // 仅当当前选择的供应商无效时才回退到默认值，避免每次加载都覆盖用户的选择
    const currentValid = llmStore.activeProviders.some(p => p.provider === selectedProvider.value);
    if (!currentValid) {
      const def = llmStore.defaultSelection;
      selectedProvider.value = def.provider;
      aiForm.model = def.model;
    }
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

async function addChapter() {
  if (!activeBook.value) return;
  if (dirty.value) await saveCurrentChapter(false);
  const nextIndex = chapters.value.length + 1;
  try {
    const chapter = await createChapter({
      project_id: activeBook.value.id,
      chapter_index: nextIndex,
      title: `第${nextIndex}章`,
      content: '',
      word_count: 0,
      ai_model: aiForm.model,
    });
    chapters.value.push(chapter);
    setActiveChapterWrapper(chapter);
    showSuccessToast('已新建章节');
  } catch (error) {
    showToast('新建章节失败：' + error.message);
  }
}

async function insertChapterAround(chapter, position) {
  chapterMenuOpenId.value = null;
  if (!activeBook.value) return;
  if (dirty.value) await saveCurrentChapter(false);
  const baseIndex = chapters.value.findIndex((item) => item.id === chapter.id);
  const insertAt = position === 'before' ? baseIndex : baseIndex + 1;
  const nextIndex = Math.max(1, insertAt + 1);
  try {
    const created = await createChapter({
      project_id: activeBook.value.id,
      chapter_index: nextIndex,
      title: `第${nextIndex}章`,
      content: '',
      summary: '',
      word_count: 0,
      ai_model: aiForm.model,
    });
    chapters.value = await fetchChapters(activeBook.value.id);
    setActiveChapterWrapper(chapters.value.find((item) => item.id === created.id) || created);
    showSuccessToast('已插入章节');
  } catch (error) {
    showToast('插入章节失败：' + error.message);
  }
}

function toggleChapterMenu(chapter, event) {
  if (chapterMenuOpenId.value === chapter.id) {
    chapterMenuOpenId.value = null;
    return;
  }
  const btn = event?.currentTarget || event?.target;
  if (btn) {
    const rect = btn.getBoundingClientRect();
    chapterMenuPosition.value = { top: rect.bottom + 6, left: rect.left };
  }
  chapterMenuOpenId.value = chapter.id;
}

async function removeChapter(chapter) {
  if (!activeBook.value || !chapter) return;
  try {
    await deleteChapter(activeBook.value.id, chapter.id);
    const index = chapters.value.findIndex((item) => item.id === chapter.id);
    if (index >= 0) chapters.value.splice(index, 1);
    if (activeChapter.value?.id === chapter.id) {
      setActiveChapterWrapper(chapters.value[Math.max(0, index - 1)] || null);
    }
    showSuccessToast('已删除章节');
  } catch (error) {
    showToast('删除章节失败：' + error.message);
  }
}

function exportChapter(chapter) {
  chapterMenuOpenId.value = null;
  const text = [`# ${chapterName(chapter)}`, chapter.summary ? `## 概要\n${chapter.summary}` : '', chapter.content || ''].filter(Boolean).join('\n\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${chapterName(chapter)}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

async function selectChapter(chapter) {
  if (activeChapter.value?.id === chapter.id) return;
  if (dirty.value) await saveCurrentChapter(false);
  setActiveChapterWrapper(chapter);
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
    content: normalizeParagraphIndent(draftContent.value),
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

function openAiPanel(key) {
  activeAiKey.value = key;
  aiPanelOpen.value = true;
  aiForm.result = '';
  const config = activeAiConfig.value;
  ensureToolVariant(config);
  if (config.key === 'outline') loadCharactersForWriting();
  if (['expand', 'polish'].includes(config.mode)) {
    // 章节起名始终使用正文内容，不使用划选
	    const selectedText = config.key !== 'title' ? refreshTextSelection() : '';
    if (selectedText) {
      aiForm.sourceText = selectedText.slice(0, AI_SOURCE_LIMIT);
      setProcessingAnchor(textSelection.value);
    } else {
      aiForm.sourceText = draftContent.value.trim().slice(0, AI_SOURCE_LIMIT);
      clearProcessingAnchor();
    }
    aiForm.expandAction = activeToolVariant.value?.action || config.defaultAction || 'expand';
  } else if (!aiForm.plot && draftTitle.value) {
    aiForm.plot = draftTitle.value;
  }
}

function grabEditorSelection() {
  const text = refreshTextSelection();
  if (text) {
    aiForm.sourceText = text.slice(0, AI_SOURCE_LIMIT);
    setProcessingAnchor(textSelection.value);
    showToast(`已获取 ${text.length} 字选中内容`);
  } else {
    showToast('请先在正文中划选文本');
  }
}

function getToolInstruction(config = activeAiConfig.value) {
  const parts = [];
  if (config?.instruction) parts.push(`当前工具：${config.title}\n${config.instruction}`);
  if (activeToolVariant.value?.instruction) {
    parts.push(`细分功能：${activeToolVariant.value.label}\n${activeToolVariant.value.instruction}`);
  }
  if (config?.key === 'correct') {
    const enabledRules = correctionRules.filter((rule) => rule.enabled);
    if (enabledRules.length) {
      parts.push(`启用纠错规则：\n${enabledRules.map((rule, index) => `${index + 1}. ${rule.title}：${rule.description}`).join('\n')}`);
    }
  }
  if (config?.key === 'outline' && selectedCharacters.value.length) {
    parts.push(`需求角色：${selectedCharacters.value.map((character) => character.name).join('、')}`);
  }
  if (config?.key === 'outline' && selectedRequirementPrompt.value) {
    parts.push(`续写要求提示词：${selectedRequirementPrompt.value.title}`);
  }
  return parts.join('\n\n');
}

function buildAiInstruction(config = activeAiConfig.value) {
  return aiForm.plot.trim();
}

function loadActiveLibraryPrompt() {
  try {
    const raw = localStorage.getItem('activePrompt');
    if (!raw) return;
    const prompt = JSON.parse(raw);
    if (prompt?.title && prompt?.content) {
      activeLibraryPrompt.value = prompt;
      showToast('已加载提示词：' + prompt.title);
    }
    localStorage.removeItem('activePrompt');
  } catch {
    localStorage.removeItem('activePrompt');
  }
}

function getSystemPromptContent(config = activeAiConfig.value, options = {}) {
  return [
    options.includeToolInstruction ? getToolInstruction(config) : '',
    config?.key === 'outline' ? outlinePromptContent.value : '',
    activeLibraryPrompt.value?.content ? `## 提示词库：${activeLibraryPrompt.value.title}\n${activeLibraryPrompt.value.content}` : '',
    getPresetPromptSection(stylePresets.value, aiForm.stylePreset, '写作风格'),
    getPresetPromptSection(requirementPresets.value, aiForm.requirementPreset, '写作要求'),
    aiForm.customRequirement.trim() ? `## 用户额外要求\n${aiForm.customRequirement.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function buildTextProcessInstruction(config) {
  return getSystemPromptContent(config);
}

function resetAiState() {
  aiLoading.value = false;
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
      result = await expandText({
        text,
        action: aiForm.expandAction,
        style,
        prompt_content: buildTextProcessInstruction(config),
        tool_instruction: toolInstruction,
        provider: selectedProvider.value,
        model: aiForm.model,
      });
    }

    aiForm.result = result.text || '';
    if (!aiForm.result) { showToast('AI 已处理完毕但返回空内容，请确认 API Key 已配置'); console.log('expandText result:', result); }

    recordUsage(countChineseWords(aiForm.result));
    todayStats.value = getTodayStats();
  } catch (error) {
    showFailToast('生成失败：' + error.message);
  } finally {
    aiLoading.value = false;
  }
}

function replaceSelectionWithAiResult() {
  const anchor = processingAnchor.value || textSelection.value;
  const { start, end } = anchor;
  draftContent.value = draftContent.value.slice(0, start) + aiForm.result + draftContent.value.slice(end);
  textSelection.value = { start, end: start + aiForm.result.length, text: aiForm.result };
  clearProcessingAnchor();
  markDirty();
}

async function applyInlinePreview() {
  if (!aiForm.result) return;
  const anchor = processingAnchor.value;
  if (anchor && draftContent.value.slice(anchor.start, anchor.end) === anchor.text) {
    replaceSelectionWithAiResult();
    showSuccessToast('已替换到原选中位置');
  } else if (hasActiveSelection.value) {
    replaceSelectionWithAiResult();
    showSuccessToast('已替换当前选中段落');
  } else {
    const pos = textSelection.value.start;
    draftContent.value = draftContent.value.slice(0, pos) + aiForm.result + draftContent.value.slice(pos);
    textSelection.value = { start: pos, end: pos + aiForm.result.length, text: aiForm.result };
    clearProcessingAnchor();
    markDirty();
    showSuccessToast('已插入到光标位置');
  }
  await nextTick();
  scrollToReplacedText();
  aiForm.result = '';
  saveCurrentChapter(false);
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
    const anchor = processingAnchor.value;
    if (anchor && draftContent.value.slice(anchor.start, anchor.end) === anchor.text) {
      replaceSelectionWithAiResult();
      showSuccessToast('已替换到原选中位置');
    } else if (hasActiveSelection.value) {
      replaceSelectionWithAiResult();
      showSuccessToast('已替换当前选中段落');
    } else {
      const pos = textSelection.value.start;
      draftContent.value = draftContent.value.slice(0, pos) + aiForm.result + draftContent.value.slice(pos);
      textSelection.value = { start: pos, end: pos + aiForm.result.length, text: aiForm.result };
      clearProcessingAnchor();
      markDirty();
      showSuccessToast('已插入到光标位置');
    }
  } else {
    draftContent.value = normalizeParagraphIndent([draftContent.value.trim(), aiForm.result.trim()].filter(Boolean).join('\n\n'));
    markDirty();
    showSuccessToast('已追加到正文');
  }
  aiForm.result = '';
  saveCurrentChapter(false);
}

async function applyTitleToDraft() {
  const newTitle = aiForm.result.replace(/^[\s「」《》""'']+|[\s「」《》""'']+$/g, '').slice(0, 35);
  if (draftTitle.value.trim()) {
    try {
      await showConfirmDialog({
        title: '确认覆盖',
        message: `当前标题"${draftTitle.value}"将被替换为"${newTitle}"，是否继续？`,
        confirmButtonText: '覆盖',
        cancelButtonText: '取消',
      });
    } catch { return; }
  }
  draftTitle.value = newTitle;
  aiForm.result = '';
  showSuccessToast('标题已更新');
  saveCurrentChapter(false);
  resetAiState();
}

async function copyTitleResult() {
  try {
    await navigator.clipboard.writeText(aiForm.result);
    showSuccessToast('已复制标题');
  } catch { showToast('复制失败'); }
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
  background: #fff;
  border-left: 1px solid #e5e7eb;
  border-radius: 10px 0 0 10px;
  box-shadow: -4px 0 16px rgba(15, 23, 42, 0.08);
}

.ai-panel-body {
  flex: 1;
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

/* 章节起名 - 标题结果卡片 */
.title-result-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.title-result-label {
  font-size: 11px;
  color: #999;
  letter-spacing: 1px;
}

.title-result-text {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: 1px;
  line-height: 1.3;
  text-align: center;
  padding: 12px 20px;
  background: linear-gradient(135deg, #fef9f0, #fff7e6);
  border: 2px dashed #e8d5a3;
  border-radius: 10px;
  min-width: 160px;
}

.title-result-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.title-apply-btn {
  height: 32px;
  padding: 0 16px;
  border: none;
  border-radius: 6px;
  background: #16a05d;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.title-copy-btn {
  height: 32px;
  padding: 0 16px;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  background: #fff;
  color: #555;
  font-size: 13px;
  cursor: pointer;
}

.title-retry-btn {
  height: 32px;
  padding: 0 12px;
  border: none;
  background: none;
  color: #999;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.title-retry-btn:hover {
  color: #555;
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


/* ===== 新增：书架/编辑器交互样式 ===== */

/* 批量选择 */
.batch-checkbox {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
}
.batch-checkbox input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #6366f1;
}
.work-card.batch-selected {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99,102,241,0.2);
}

/* 批量工具栏 */
.batch-toolbar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  background: #1f2937;
  color: #fff;
  border-radius: 12px;
  z-index: 100;
  box-shadow: 0 8px 30px rgba(0,0,0,0.3);
}
.batch-toolbar button {
  border: 0;
  background: rgba(255,255,255,0.15);
  color: #fff;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}
.batch-toolbar button:hover {
  background: rgba(255,255,255,0.25);
}

/* 列表视图 */
.book-grid.list-view {
  grid-template-columns: 1fr;
}
.book-grid.list-view .work-card {
  grid-template-columns: 60px 1fr auto;
  min-height: 80px;
  padding: 10px;
}
.book-grid.list-view .book-cover {
  width: 56px;
  height: 72px;
}
.book-grid.list-view .book-actions {
  grid-column: auto;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  border-top: none;
}

/* 编辑器更多下拉菜单 */
.more-dropdown {
  position: absolute;
  top: 44px;
  right: 0;
  background: #fff;
  border: 1px solid #e4e7ef;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15,23,42,0.12);
  z-index: 50;
  min-width: 160px;
  overflow: hidden;
}
.more-dropdown button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  border: 0;
  background: transparent;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
  text-align: left;
}
.more-dropdown button:hover {
  background: #f3f4f6;
}
.more-dropdown button + button {
  border-top: 1px solid #f3f4f6;
}

/* 侧边栏折叠 */
.chapter-sidebar.collapsed {
  display: none;
}

/* 查找对话框 */
.find-dialog {
  position: absolute;
  top: 0;
  right: 0;
  width: 360px;
  max-height: 80%;
  background: #fff;
  border: 1px solid #e4e7ef;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15,23,42,0.15);
  z-index: 50;
  overflow: hidden;
}
.find-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #eef1f5;
  font-weight: 600;
  font-size: 15px;
}
.find-dialog-header button {
  border: 0;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  font-size: 18px;
}
.find-dialog-body {
  padding: 12px 16px;
}
.find-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.find-row input {
  flex: 1;
  height: 34px;
  padding: 0 10px;
  border: 1px solid #e4e7ef;
  border-radius: 6px;
  font-size: 14px;
}
.find-row span {
  color: #9ca3af;
  font-size: 12px;
  white-space: nowrap;
}
.find-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.find-actions button {
  flex: 1;
  height: 32px;
  border: 1px solid #e4e7ef;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.find-actions button:hover {
  background: #f3f4f6;
}
.find-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.find-results {
  max-height: 200px;
  overflow-y: auto;
}
.find-result-item {
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.find-result-item.active {
  background: #eef2ff;
  color: #4f46e5;
}
.find-result-item:hover {
  background: #f3f4f6;
}

/* 弹窗提示 */
.popup-hint {
  margin: 0 16px 12px;
  color: #9ca3af;
  font-size: 13px;
  line-height: 1.5;
}

</style>
