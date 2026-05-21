<template>
  <!-- text -->
  <van-field
    v-if="inputDef.type === 'text'"
    :model-value="modelValue"
    :label="inputDef.label"
    :placeholder="inputDef.placeholder"
    :required="inputDef.required !== false"
    clearable
    @update:model-value="emitVal"
  />

  <!-- textarea -->
  <van-field
    v-else-if="inputDef.type === 'textarea'"
    :model-value="modelValue"
    :label="inputDef.label"
    :placeholder="inputDef.placeholder"
    type="textarea"
    :rows="inputDef.rows || 3"
    :required="inputDef.required !== false"
    autosize
    clearable
    @update:model-value="emitVal"
  />

  <!-- number -->
  <van-field
    v-else-if="inputDef.type === 'number'"
    :model-value="modelValue"
    :label="inputDef.label"
    :placeholder="inputDef.placeholder"
    type="number"
    :required="inputDef.required !== false"
    clearable
    @update:model-value="emitVal"
  />

  <!-- stepper -->
  <div v-else-if="inputDef.type === 'stepper'" class="stepper-row">
    <span class="stepper-label">{{ inputDef.label }}</span>
    <van-stepper
      :model-value="Number(modelValue) || inputDef.min || 1"
      :min="inputDef.min || 1"
      :max="inputDef.max || 30"
      :step="inputDef.step || 1"
      integer
      @update:model-value="emitVal"
    />
  </div>

  <!-- switch -->
  <van-cell v-else-if="inputDef.type === 'switch'" center :required="inputDef.required !== false">
    <template #title>
      <span class="cell-title">{{ inputDef.label }}</span>
    </template>
    <template #right-icon>
      <van-switch
        :model-value="!!modelValue"
        size="24px"
        @update:model-value="emitVal"
      />
    </template>
  </van-cell>

  <!-- radio (chip button group, tap to toggle) -->
  <div v-else-if="inputDef.type === 'radio'" class="input-group">
    <label class="group-label">{{ inputDef.label }}</label>
    <div class="chip-group">
      <button
        v-for="opt in inputDef.options"
        :key="opt"
        class="chip-btn"
        :class="{ active: modelValue === opt }"
        type="button"
        @click="emitVal(modelValue === opt ? '' : opt)"
      >
        {{ opt }}
      </button>
    </div>
    <p v-if="inputDef.help" class="field-help">{{ inputDef.help }}</p>
  </div>

  <!-- select (readonly field + action sheet, supports custom input) -->
  <template v-else-if="inputDef.type === 'select'">
    <van-field
      :model-value="modelValue || ''"
      :label="inputDef.label"
      :placeholder="inputDef.placeholder || '请选择'"
      is-link
      readonly
      :required="inputDef.required !== false"
      @click="showPicker = true"
    />
    <div v-if="isCustomMode" class="custom-type-wrap">
      <van-field
        v-model="customType"
        label="自定义类型"
        placeholder="输入你想创作的作品类型..."
        clearable
        @update:model-value="onCustomTypeChange"
      />
    </div>
    <van-action-sheet
      v-model:show="showPicker"
      :title="inputDef.label"
      :actions="sheetActions"
      @select="onSheetSelect"
    />
  </template>

  <!-- slider -->
  <div v-else-if="inputDef.type === 'slider'" class="slider-row">
    <span class="slider-label">{{ inputDef.label }}
      <span v-if="modelValue" class="slider-val">{{ modelValue }}</span>
    </span>
    <van-slider
      :model-value="Number(modelValue) || inputDef.min || 0"
      :min="inputDef.min || 0"
      :max="inputDef.max || 100"
      :step="inputDef.step || 1"
      @update:model-value="emitVal"
    />
  </div>

  <!-- fallback: plain text -->
  <van-field
    v-else
    :model-value="modelValue"
    :label="inputDef.label"
    :placeholder="inputDef.placeholder"
    clearable
    @update:model-value="emitVal"
  />
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  inputDef: { type: Object, required: true },
  modelValue: { type: [String, Number, Boolean], default: '' },
});

const emit = defineEmits(['update:modelValue']);

const showPicker = ref(false);

var isCustomMode = ref(false);
var customType = ref('');

function onCustomTypeChange(val) {
  if (val && val.trim()) {
    emit('update:modelValue', val.trim());
  } else {
    isCustomMode.value = false;
  }
}

const sheetActions = computed(() => {
  var list = (props.inputDef.options || []).map(function(opt) {
    if (opt === '其他自定义...' || opt.indexOf('自定义') >= 0) {
      return { name: '__custom__', color: '#4f46e5', description: '输入你自己的类型' };
    }
    return { name: opt };
  });
  list.push({ name: '__custom__', color: '#4f46e5', description: '输入自定义类型' });
  var seen = new Set();
  return list.filter(function(a) { if (seen.has(a.name)) return false; seen.add(a.name); return true; });
});

function emitVal(val) {
  emit('update:modelValue', val);
}

function onSheetSelect(item) {
  showPicker.value = false;
  if (item.name === '__custom__') {
    isCustomMode.value = true;
    customType.value = '';
    return;
  }
  isCustomMode.value = false;
  emit('update:modelValue', item.name);
}
</script>

<style scoped>
.stepper-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #ebedf0;
}
.stepper-label {
  font-size: 14px;
  color: #323233;
}

.cell-title {
  font-size: 14px;
  color: #323233;
}

.input-group {
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #ebedf0;
}
.group-label {
  font-size: 14px;
  color: #323233;
  font-weight: 500;
  display: block;
  margin-bottom: 8px;
}
.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip-btn {
  padding: 6px 16px;
  border: 1px solid #ebedf0;
  border-radius: 20px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  color: #323233;
}
.chip-btn.active {
  background: var(--accent, #1989fa);
  color: #fff;
  border-color: var(--accent, #1989fa);
}
.field-help {
  font-size: 12px;
  color: #969799;
  margin: 4px 0 0;
}

.slider-row {
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #ebedf0;
}
.slider-label {
  font-size: 14px;
  color: #323233;
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}
.slider-val {
  font-weight: 600;
  color: var(--accent, #1989fa);
}
</style>
