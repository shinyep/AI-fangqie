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

          <!-- 章节起名 - 专用简洁表单 -->
          <template v-else-if="activeAiConfig.key === 'title'">
          <div class="ai-panel-body ct-title-body">

            <div class="ct-source-card">
              <div class="ct-source-head">
                <van-icon name="notes-o" size="16" />
                <span>章节内容</span>
                <span class="ct-source-hint">自动提取前500字</span>
              </div>
              <pre class="ct-source-text">{{ aiForm.sourceText }}</pre>
            </div>

            <ModelSelector
              v-model:provider="selectedProvider"
              v-model:model="aiForm.model"
            />

            <label class="field">
              <span>起名要求</span>
              <textarea v-model="aiForm.customRequirement" rows="2" placeholder="例如：要霸气、制造悬念、抓住核心爽点..."></textarea>
            </label>

            <div v-if="aiForm.result" class="ai-result ct-result">
              <div class="title-result-card">
                <span class="title-result-label">AI 生成的章节标题</span>
                <strong class="title-result-text">{{ aiForm.result }}</strong>
                <div class="title-result-actions">
                  <button class="title-apply-btn" @click="applyTitleToDraft">设为章节标题</button>
                  <button class="title-copy-btn" @click="copyTitleResult">复制</button>
                  <button class="title-retry-btn" @click="runAi"><van-icon name="replay" /> 重新生成</button>
                </div>
              </div>
            </div>

          </div>
          <div class="ai-panel-footer">
            <span>以上内容均由AI生成，仅供参考和借鉴</span>
            <button :disabled="aiLoading" @click="runAi">
              <van-loading v-if="aiLoading" size="14" color="#fff" />
              <van-icon v-else name="edit" />
              {{ aiLoading ? '生成中' : '生成标题' }}
            </button>
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

          <div v-if="aiForm.result && !isTextProcessMode" class="ai-result">
            <strong>生成结果</strong>
            <p>{{ aiForm.result }}</p>
            <div class="result-actions">
              <button @click="applyAiResult('replace')">{{ processingAnchor ? '替换到原位置' : hasActiveSelection ? '替换选中段落' : '插入到光标' }}</button>
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
import { useRepairActions } from '../composables/writing/useRepairActions.js';
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
import { useFindReplace } from '../composables/writing/useFindReplace.js';
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
const batchSelected = ref(new Set());
const newFolderName = ref('');
const importChapterText = ref('');
const importChapterTitle = ref('');
const chapterMenuPosition = ref({ top: 0, left: 0 });

const tabFilteredBooks = computed(() => {
  const base = filteredBooks.value;
  if (activeBookTab.value === 'archive') return base.filter(b => b.archived);
  if (activeBookTab.value === 'trash') return base.filter(b => b.deleted_at);
  return base.filter(b => !b.archived && !b.deleted_at);
});

const { keywordReplaceOpen, keywordReplaceScope, keywordReplacing, keywordReplaceEntries, keywordReplacePreview, hasValidKeywordEntries, addKeywordReplaceEntry, removeKeywordReplaceEntry, openKeywordReplace, previewKeywordReplace, executeKeywordReplace } = useKeywordReplace(chapters, activeChapter, activeBook, draftContent, markDirty, fetchChapters, showToast, showSuccessToast, showFailToast);
	const { summaryModalOpen, summaryChapter, summaryDraft, summaryGeneratingId, batchSummaryLoading, openChapterSummary, saveChapterSummary, generateChapterSummary, batchGenerateSummaries } = useChapterSummary(chapters, activeChapter, activeBook, draftContent, draftTitle, dirty, aiForm, chapterMenuOpenId, saveCurrentChapter, showToast, showSuccessToast);

const { showFindDialog, findKeyword, findReplaceText, findResults, activeFindIndex, findInChapter, replaceCurrent, replaceAll } = useFindReplace(draftContent, markDirty, showToast);

const aiPanelOpen = ref(false);
const showPresetContent = ref(true);
const activeAiKey = ref('write');
const aiLoading = ref(false);
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

const { repairLoading, showRepairPanel, currentReviewIssues, onReviewDone, onStartRepair, onApplyRepair, onRepairDone } = useRepairActions(activeChapter, activeBook, draftContent, chapters, repairDiffData, normalizeParagraphIndent, updateChapter, fetchChapters, showSuccessToast, showFailToast);

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
@import "./styles/writing-core.css";
@import "./styles/writing-dialogs.css";
@import "./styles/writing-diff.css";
@import "./styles/writing-knowledge.css";
@import "./styles/writing-ai-panel.css";
@import "./styles/writing-bookshelf.css";
</style>
