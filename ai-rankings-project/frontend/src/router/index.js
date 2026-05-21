import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', redirect: '/writing' },
  { path: '/writing', component: () => import('../views/Writing.vue') },
  { path: '/creative', component: () => import('../views/CreativeToolbox.vue') },
  { path: '/prompts', component: () => import('../views/PromptLibrary.vue') },
  { path: '/characters', component: () => import('../views/CharacterCards.vue') },
  { path: '/ai-settings', component: () => import('../views/AISettings.vue') },
  { path: '/ai-settings/routes', component: () => import('../views/AISettingsRoutes.vue') },
  { path: '/tutorial', component: () => import('../views/Tutorial.vue') },
  { path: '/book/:id', component: () => import('../views/BookDetail.vue') },
  // AI扫榜
  { path: '/rankings', component: () => import('../views/Rankings.vue') },
  { path: '/hot-news', component: () => import('../views/HotNews.vue') },
  { path: '/home', component: () => import('../views/Home.vue') },
  { path: '/novel-outline', component: () => import('../views/NovelOutline.vue') },
  { path: '/saved-outlines', component: () => import('../views/SavedOutlines.vue') },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});