import { createPinia } from 'pinia';
import { createApp } from 'vue';
import Vant from 'vant';
import 'vant/lib/index.css';
import App from './App.vue';
import router from './router/index.js';
import './styles.css';

createApp(App).use(createPinia()).use(router).use(Vant).mount('#app');
