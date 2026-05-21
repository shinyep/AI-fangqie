<template>
  <div class="app-shell">
    <TabBar />
    <div class="app-main">
      <header class="app-header">
        <div class="header-left">
          <div class="logo-icon"></div>
          <strong>Ai智能写作系统</strong>
        </div>
        <div class="header-right">
          <van-button size="small" icon="question-o" @click="$router.push('/tutorial')">教程</van-button>
        </div>
      </header>
      <router-view />
    </div>
  </div>
</template>

<script setup>
import TabBar from './components/TabBar.vue';
</script>

<style scoped>
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  display: grid;
  place-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>