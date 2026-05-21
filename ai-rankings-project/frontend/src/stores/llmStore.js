import { defineStore } from 'pinia';
import { fetchProviders } from '../api/aiSettings.js';

export const useLlmStore = defineStore('llm', {
  state: () => ({
    providers: [],
    loaded: false,
  }),

  getters: {
    // 活跃的厂商列表（已激活）
    activeProviders(state) {
      return state.providers.filter(p => p.isActive);
    },

    // 所有厂商（含未激活）
    allProviders(state) {
      return state.providers;
    },

    // 当前选择的 provider+model 组合，默认取第一个活跃厂商
    defaultSelection(state) {
      const active = state.providers.find(p => p.isActive && p.isConfigured);
      if (active) {
        return {
          provider: active.provider,
          model: active.model || active.defaultModel || '',
        };
      }
      // 回退到第一个厂商
      const first = state.providers[0];
      if (first) {
        return {
          provider: first.provider,
          model: first.model || first.defaultModel || '',
        };
      }
      return { provider: 'deepseek', model: 'deepseek-chat' };
    },

    // 获取某个厂商的模型列表
    getProviderModels(state) {
      return (providerId) => {
        const p = state.providers.find(p => p.provider === providerId);
        if (!p) return [];
        return p.builtinModels || p.models || [];
      };
    },
  },

  actions: {
    async loadProviders() {
      if (this.loaded && this.providers.length) return;
      try {
        const data = await fetchProviders();
        this.providers = data?.providers || data || [];
        this.loaded = true;
      } catch {
        // 静默失败，使用默认值
      }
    },

    // 强制刷新
    async refresh() {
      this.loaded = false;
      await this.loadProviders();
    },
  },
});
