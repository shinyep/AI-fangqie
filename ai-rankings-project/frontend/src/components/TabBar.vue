<template>
  <aside class="side-nav">
    <div class="avatar"></div>
    <router-link to="/writing" class="nav-item">
      <van-icon name="edit" size="18" />
      <span>写作</span>
    </router-link>
    <router-link to="/creative" class="nav-item">
      <van-icon name="bulb-o" size="18" />
      <span>创意</span>
    </router-link>
    <router-link to="/prompts" class="nav-item">
      <van-icon name="search" size="18" />
      <span>提示词</span>
    </router-link>
    <router-link to="/characters" class="nav-item">
      <van-icon name="user-o" size="18" />
      <span>角色</span>
    </router-link>
    <div class="nav-divider"></div>
    <router-link to="/saved-outlines" class="nav-item">
      <van-icon name="bookmark-o" size="18" />
      <span>已保存小说</span>
    </router-link>
    <router-link to="/rankings" class="nav-item">
      <van-icon name="bar-chart-o" size="18" />
      <span>AI扫榜</span>
    </router-link>
    <router-link to="/hot-news" class="nav-item">
      <van-icon name="cluster-o" size="18" />
      <span>热点</span>
    </router-link>
    <div class="nav-divider"></div>
    <router-link to="/ai-settings" class="nav-item">
      <van-icon name="setting-o" size="18" />
      <span>AI设置</span>
    </router-link>
    <router-link to="/tutorial" class="nav-item">
      <van-icon name="question-o" size="18" />
      <span>教程</span>
    </router-link>
    <div class="about-link">Ai智能写作系统 v2.0</div>
  </aside>
</template>

<style scoped>
.nav-divider {
  height: 1px;
  background: var(--line);
  margin: 4px 8px;
}
</style>