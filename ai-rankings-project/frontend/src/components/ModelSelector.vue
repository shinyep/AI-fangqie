<template>
  <div class="model-selector-wrap">
    <van-field
      :model-value="label"
      label="AI模型"
      placeholder="选择模型"
      is-link
      readonly
      @click="visible = true"
    />
    <van-popup
      v-model:show="visible"
      position="bottom"
      round
      :style="{ maxHeight: '75vh' }"
    >
      <div class="ms-picker">
        <div class="ms-header">
          <span class="ms-title">选择AI模型</span>
          <van-icon name="cross" size="20" @click="visible = false" />
        </div>
        <div class="ms-list">
          <div
            class="ms-item"
            :class="{ active: !provider }"
            @click="select('', '')"
          >
            <div class="ms-icon"><van-icon name="star-o" size="22" /></div>
            <div class="ms-info">
              <span class="ms-name">默认模型</span>
              <span class="ms-desc">使用系统默认AI模型</span>
            </div>
            <van-icon v-if="!provider" name="success" size="20" color="#4f46e5" />
          </div>
          <template v-for="prov in providerList" :key="prov.provider">
            <div class="ms-provider-label">{{ prov.displayName }}</div>
            <div
              v-for="m in prov.models"
              :key="m"
              class="ms-item ms-model"
              :class="{ active: provider === prov.provider && currentModel === m }"
              @click="select(prov.provider, m)"
            >
              <span class="ms-bullet" />
              <span class="ms-name">{{ m }}</span>
              <van-icon v-if="provider === prov.provider && currentModel === m" name="success" size="20" color="#4f46e5" />
            </div>
          </template>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useLlmStore } from '../stores/llmStore.js';

const props = defineProps({
  provider: { type: String, default: '' },
  model: { type: String, default: '' },
});

const emit = defineEmits(['update:provider', 'update:model']);

const llmStore = useLlmStore();
const visible = ref(false);

const providerList = computed(() => {
  return llmStore.activeProviders
    .filter(p => p.isConfigured)
    .map(p => ({
      provider: p.provider,
      displayName: p.displayName,
      models: p.builtinModels || p.models || [],
    }));
});

const currentModel = computed(() => props.model);

const label = computed(() => {
  if (props.provider && props.model) {
    const prov = providerList.value.find(p => p.provider === props.provider);
    return (prov ? prov.displayName : props.provider) + ' / ' + props.model;
  }
  return '默认模型';
});

function select(provider, model) {
  visible.value = false;
  emit('update:provider', provider);
  emit('update:model', model);
}

onMounted(() => {
  llmStore.loadProviders();
});
</script>

<style scoped>
.model-selector-wrap :deep(.van-field__control) { color: #4f46e5; }

.ms-picker {
  display: flex; flex-direction: column;
  max-height: 75vh;
  padding-bottom: env(safe-area-inset-bottom);
}
.ms-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 16px 12px; border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}
.ms-title { font-size: 16px; font-weight: 600; }
.ms-list { flex: 1; overflow-y: auto; padding: 8px 0; }
.ms-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; cursor: pointer;
  transition: background 0.15s;
  border-left: 3px solid transparent;
}
.ms-item:active { background: #f7f8fa; }
.ms-item.active { background: #f5f3ff; border-left-color: #4f46e5; }
.ms-icon {
  width: 40px; height: 40px; border-radius: 10px;
  background: #f5f7fa; display: flex;
  align-items: center; justify-content: center;
  flex-shrink: 0; color: #4f46e5;
}
.ms-item.active .ms-icon { background: #eef2ff; }
.ms-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ms-name { font-size: 15px; font-weight: 500; }
.ms-desc { font-size: 12px; color: #999; }
.ms-provider-label {
  padding: 10px 16px 6px;
  font-size: 12px; font-weight: 600; color: #999;
  letter-spacing: 0.5px;
}
.ms-model { padding-left: 36px; }
.ms-bullet {
  width: 6px; height: 6px; border-radius: 50%;
  background: #d9d9d9; flex-shrink: 0;
}
.ms-item.active .ms-bullet { background: #4f46e5; }
</style>
