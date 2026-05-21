<template>
  <main class="page">
    <header class="topbar">
      <div>
        <h1 class="title">AI模型设置</h1>
        <p class="subtitle">管理内置厂商连接，也可以新增 OpenAI 兼容的自定义厂商</p>
      </div>
      <van-button type="primary" @click="openCreateDialog">
        <van-icon name="plus" /> 新增自定义厂商
      </van-button>
    </header>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-wrap">
      <van-loading size="28" color="var(--brand)" />
      <span>加载厂商列表...</span>
    </div>

    <template v-else>
      <!-- 导航卡片 -->
      <section class="section nav-cards">
        <div class="nav-card" @click="$router.push('/ai-settings/routes')">
          <div class="nav-card-icon">
            <van-icon name="guide-o" size="28" />
          </div>
          <div class="nav-card-text">
            <strong>模型路由</strong>
            <p>为不同写作任务选择默认服务商和模型</p>
          </div>
          <van-icon name="arrow" color="#c0c4cc" size="18" />
        </div>
      </section>

      <!-- 操作反馈 -->
      <div v-if="actionMsg" class="action-msg" :class="actionMsgType">
        {{ actionMsg }}
      </div>

      <!-- 厂商卡片列表 -->
      <section class="section">
        <h2 class="section-title">
          模型厂商
          <span class="count-badge">{{ providers.length }}</span>
        </h2>

        <div class="provider-grid">
          <article
            v-for="p in providers"
            :key="p.provider"
            class="provider-card"
            :class="{ 'is-inactive': !p.isActive }"
          >
            <!-- 卡片头部 -->
            <header class="card-header">
              <div class="card-title-row">
                <h3 class="card-name">{{ p.displayName }}</h3>
                <van-tag
                  v-if="!p.isBuiltin"
                  type="warning"
                  plain
                >自定义</van-tag>
                <van-tag
                  :type="p.isConfigured ? 'success' : 'default'"
                >{{ p.isConfigured ? '已配置' : '未配置' }}</van-tag>
              </div>
              <van-switch
                :model-value="p.isActive"
                size="26px"
                @update:model-value="(v) => toggleActive(p, v)"
              />
            </header>

            <!-- 卡片内容 -->
            <div class="card-body">
              <div class="info-row">
                <span class="info-label">模型</span>
                <span class="info-value">{{ p.model || p.defaultModel || '—' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">API 地址</span>
                <span class="info-value mono">{{ p.baseURL || '—' }}</span>
              </div>

              <!-- 请求限制 -->
              <div v-if="p.concurrencyLimit || p.requestIntervalMs" class="info-row">
                <span class="info-label">请求限制</span>
                <span class="info-value">
                  并发 {{ p.concurrencyLimit || '不限制' }}
                  · 间隔 {{ p.requestIntervalMs ? p.requestIntervalMs + 'ms' : '不限制' }}
                </span>
              </div>

              <!-- 模型列表标签 -->
              <div class="model-tags" v-if="p.builtinModels?.length || p.models?.length">
                <span class="info-label">可用模型</span>
                <div class="tags-wrap">
                  <van-tag
                    v-for="m in displayedModels(p)"
                    :key="m"
                    plain
                    class="model-tag"
                    :class="{ 'is-current': m === (p.model || p.defaultModel) }"
                    @click="switchModel(p, m)"
                  >{{ m }}</van-tag>
                  <button
                    v-if="hasMoreModels(p)"
                    class="expand-tag"
                    @click="toggleModelsExpand(p.provider)"
                  >
                    {{ expandedModels[p.provider] ? '收起' : `展开全部 ${(p.builtinModels || p.models).length} 个` }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 卡片操作 -->
            <footer class="card-footer">
              <van-button type="primary" @click="openEditDialog(p)">
                <van-icon name="setting-o" /> {{ p.isConfigured ? '编辑' : '配置' }}
              </van-button>
              <van-button plain @click="testSingle(p)">
                测试连接
              </van-button>
              <van-button
                v-if="p.isBuiltin"
                plain
                :loading="refreshingModels === p.provider"
                @click="refreshSingleModels(p)"
              >
                刷新模型
              </van-button>
              <van-button
                v-if="!p.isBuiltin"
                type="danger"
                plain
                @click="confirmDelete(p)"
              >
                删除
              </van-button>
            </footer>

            <!-- 测试结果 -->
            <div
              v-if="testResults[p.provider]"
              class="card-test-result"
              :class="{ success: testResults[p.provider].ok, fail: !testResults[p.provider].ok }"
            >
              {{ testResults[p.provider].msg }}
            </div>
          </article>
        </div>
      </section>
    </template>

    <!-- 配置/新增弹窗 -->
    <van-dialog
      v-model:show="dialogVisible"
      :title="dialogTitle"
      :close-on-click-overlay="false"
      class="config-dialog"
    >
      <div class="dialog-body">
        <!-- 厂商名称（仅自定义） -->
        <van-field
          v-if="isCreating || !editingProvider?.isBuiltin"
          v-model="form.displayName"
          label="厂商名称"
          placeholder="输入厂商名称"
          size="large"
        />

        <!-- API Key 提示 -->
        <div v-if="!editingProvider?.isBuiltin || !editingProvider?.requiresApiKey" class="key-hint">
          <van-icon name="info-o" /> 自定义提供者可不填 API Key（需要中转站不需鉴权）
        </div>

        <!-- API Key -->
        <van-field
          v-model="form.key"
          label="API Key"
          type="password"
          :placeholder="editingProvider?.apiKeyMasked ? '已保存（不显示）' : '输入 API Key'"
          clearable
          size="large"
        />

        <!-- API 地址 -->
        <van-field
          v-model="form.baseURL"
          label="API 地址"
          placeholder="https://api.openai.com/v1"
          clearable
          size="large"
        />
        <p class="field-help">OpenAI 兼容端点，例如 https://api.deepseek.com/v1。Ollama 填 http://localhost:11434/v1。</p>

        <!-- 模型管理（多模型） -->
        <div class="models-section">
          <div class="models-section-header">
            <span class="models-label">可用模型</span>
            <span class="models-count">{{ form.models.length }} 个</span>
          </div>

          <!-- 获取模型列表 -->
          <van-button
            v-if="isCreating"
            plain
            block
            :loading="previewing"
            size="small"
            class="preview-btn"
            @click="previewModels"
          >
            从API获取模型列表
          </van-button>

          <!-- 复选框选择模型 -->
          <div v-if="selectableModels.length" class="model-checkbox-section">
            <div class="checkbox-header">
              <van-button size="mini" plain type="primary" @click="toggleAllSelectable(true)">全选</van-button>
              <van-button size="mini" plain @click="toggleAllSelectable(false)">取消全选</van-button>
              <span class="checkbox-hint">勾选需要显示的模型</span>
            </div>
            <div class="checkbox-grid">
              <label
                v-for="m in selectableModels"
                :key="m"
                class="checkbox-item"
                :class="{ checked: modelCheckStates[m] }"
                @click="toggleSelectableModel(m)"
              >
                <span class="checkbox-box">{{ modelCheckStates[m] ? '✓' : '' }}</span>
                <span class="checkbox-label">{{ m }}</span>
              </label>
            </div>
          </div>

          <!-- 已选模型标签 -->
          <div class="models-tags">
            <span
              v-for="(m, idx) in form.models"
              :key="m"
              class="model-tag-chip"
              :class="{ 'is-default': idx === 0 }"
            >
              <span class="model-tag-text" @click="setDefaultModel(idx)">{{ m }}</span>
              <van-icon name="cross" size="14" @click="removeModel(idx)" />
            </span>
            <span v-if="!form.models.length" class="models-empty">尚未添加模型</span>
          </div>

          <!-- 添加模型输入 -->
          <div class="add-model-row">
            <input
              v-model="newModelInput"
              class="add-model-input"
              placeholder="手动输入模型名称后回车添加"
              @keydown.enter.prevent="addModel"
            />
            <van-button size="small" type="primary" :disabled="!newModelInput.trim()" @click="addModel">添加</van-button>
          </div>
        </div>
        <!-- 并发/间隔 -->
        <div class="limit-row">
          <van-field
            v-model.number="form.concurrencyLimit"
            label="并发上限"
            placeholder="0"
            type="number"
            size="large"
          >
            <template #extra>
              <span class="hint">0=不限</span>
            </template>
          </van-field>
          <van-field
            v-model.number="form.requestIntervalMs"
            label="间隔(ms)"
            placeholder="0"
            type="number"
            size="large"
          >
            <template #extra>
              <span class="hint">0=不限</span>
            </template>
          </van-field>
        </div>

        <!-- 思考模式 -->
        <div class="dialog-toggle-row">
          <span>深度思考/推理</span>
          <van-switch v-model="form.reasoningEnabled" size="26px" />
        </div>

        <!-- 测试结果 -->
        <div v-if="dialogTestResult" class="test-result" :class="{ success: dialogTestResult.ok, fail: !dialogTestResult.ok }">
          {{ dialogTestResult.msg }}
        </div>
      </div>

      <!-- 弹窗底部 -->
      <template #footer>
        <div class="dialog-footer-custom">
          <van-button :loading="dialogTesting" @click="testInDialog">测试连接</van-button>
          <van-button
            v-if="!isCreating && !editingProvider?.isBuiltin"
            type="danger"
            @click="deleteInDialog"
          >删除</van-button>
          <div class="footer-spacer"></div>
          <van-button @click="dialogVisible = false">取消</van-button>
          <van-button type="primary" :loading="saving" @click="submitDialog">
            {{ isCreating ? '创建厂商' : '保存' }}
          </van-button>
        </div>
      </template>
    </van-dialog>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { showToast, showSuccessToast, showConfirmDialog } from 'vant';
import {
  fetchProviders,
  fetchProvider,
  createProvider,
  updateProvider,
  deleteProvider,
  testConnection,
  fetchModels,
  fetchModelRoutes,
  previewProviderModels,
} from '../api/aiSettings.js';

// ========== 状态 ==========

const loading = ref(true);
const providers = ref([]);
const saving = ref(false);
const dialogTesting = ref(false);
const previewing = ref(false);
const refreshingModels = ref(null);
const testResults = reactive({});
const expandedModels = reactive({});
const actionMsg = ref('');
const actionMsgType = ref('success');

// 弹窗
const dialogVisible = ref(false);
const isCreating = ref(false);
const editingProvider = ref(null);
const selectableModels = ref([]);
const dialogTestResult = ref(null);

const form = reactive({
  displayName: '',
  key: '',
  model: '',
  models: [],
  baseURL: '',
  concurrencyLimit: 0,
  requestIntervalMs: 0,
  reasoningEnabled: true,
});

// 模型管理
const newModelInput = ref('');

function addModel() {
  const name = newModelInput.value.trim();
  if (!name) return;
  if (form.models.includes(name)) {
    showToast('?????');
    return;
  }
  form.models.push(name);
  // ????????????
  if (selectableModels.value.includes(name)) {
    modelCheckStates[name] = true;
  }
  if (!form.model) form.model = name;
  newModelInput.value = '';
}

function removeModel(idx) {
  const removed = form.models[idx];
  form.models.splice(idx, 1);
  // ??????????
  if (removed && selectableModels.value.includes(removed)) {
    modelCheckStates[removed] = false;
  }
  if (form.model === removed) {
    form.model = form.models[0] || '';
  }
}

function setDefaultModel(idx) {
  if (idx <= 0 || idx >= form.models.length) return;
  const [model] = form.models.splice(idx, 1);
  form.models.unshift(model);
  form.model = model;
}



// ========== 计算属性 ==========

const dialogTitle = computed(() => {
  if (isCreating.value) return '新增自定义厂商';
  return `配置 — ${editingProvider.value?.displayName || ''}`;
});

// ========== 数据加载 ==========

onMounted(async () => {
  await loadProviders();
});

async function loadProviders() {
  loading.value = true;
  try {
    const data = await fetchProviders();
    const list = data?.providers || data || [];
    providers.value = list;
  } catch (e) {
    showToast('加载失败: ' + (e.message || '未知错误'));
  } finally {
    loading.value = false;
  }
}

// ========== 模型展示 ==========

function displayedModels(p) {
  const models = p.builtinModels || p.models || [];
  if (expandedModels[p.provider] || models.length <= 8) return models;
  return models.slice(0, 8);
}

function hasMoreModels(p) {
  const models = p.builtinModels || p.models || [];
  return models.length > 8;
}

function toggleModelsExpand(providerId) {
  expandedModels[providerId] = !expandedModels[providerId];
}

async function switchModel(p, model) {
  if (model === (p.model || p.defaultModel)) return;
  try {
    await updateProvider(p.provider, { model });
    p.model = model;
    showSuccessToast(`已切换至 ${model}`);
  } catch (e) {
    showToast('切换失败: ' + (e.message || '未知错误'));
  }
}

// ========== 弹窗操作 ==========

function resetForm() {
  form.displayName = '';
  form.key = '';
  form.model = '';
  form.models = [];
  form.baseURL = '';
  form.concurrencyLimit = 0;
  form.requestIntervalMs = 0;
  form.reasoningEnabled = true;
  selectableModels.value = [];
  dialogTestResult.value = null;
  newModelInput.value = '';
}

function openCreateDialog() {
  resetForm();
  isCreating.value = true;
  editingProvider.value = null;
  dialogVisible.value = true;
}

function openEditDialog(p) {
  resetForm();
  isCreating.value = false;
  editingProvider.value = p;
  form.displayName = p.displayName || '';
  form.model = p.model || '';
  form.models = [...(p.builtinModels || p.models || [])];
  if (form.model && !form.models.includes(form.model)) {
    form.models.unshift(form.model);
  } else if (form.model && form.models.length > 1 && form.models[0] !== form.model) {
    // 默认模型不在列表第一位，将其移到最前面以保持视觉一致
    const idx = form.models.indexOf(form.model);
    if (idx > 0) {
      form.models.splice(idx, 1);
      form.models.unshift(form.model);
    }
  }
  form.baseURL = p.baseURL || '';
  form.concurrencyLimit = p.concurrencyLimit || 0;
  form.requestIntervalMs = p.requestIntervalMs || 0;
  form.reasoningEnabled = p.reasoningEnabled !== false;
  selectableModels.value = p.builtinModels || p.models || [];
  // ??????????
  syncCheckStatesFromModels();
  dialogVisible.value = true;
}

async function submitDialog() {
  saving.value = true;
  try {
    if (isCreating.value) {
      if (!form.displayName.trim()) { showToast('请输入厂商名称'); saving.value = false; return; }
      if (!form.baseURL.trim()) { showToast('请输入API地址'); saving.value = false; return; }
      if (!form.models.length && !form.model.trim()) { showToast('请至少添加一个模型'); saving.value = false; return; }
      await createProvider({
        name: form.displayName.trim(),
        baseURL: form.baseURL.trim(),
        key: form.key.trim() || undefined,
        model: form.model.trim() || form.models[0] || undefined,
        models: form.models.length ? form.models : undefined,
      });
      showSuccessToast('厂商已创建');
    } else {
      const payload = {};
      if (!editingProvider.value.isBuiltin) {
        payload.displayName = form.displayName.trim() || undefined;
      }
      if (form.models.length) {
        payload.models = form.models;
        payload.model = form.models[0];  // 始终保持 model 与列表第一项同步
      } else if (form.model) {
        payload.model = form.model.trim();
      }
      if (form.baseURL) payload.baseURL = form.baseURL.trim();
      if (form.key && !form.key.includes('****')) payload.apiKey = form.key.trim();
      payload.concurrencyLimit = form.concurrencyLimit || 0;
      payload.requestIntervalMs = form.requestIntervalMs || 0;
      payload.reasoningEnabled = form.reasoningEnabled;

      await updateProvider(editingProvider.value.provider, payload);
      showSuccessToast('保存成功');
    }
    dialogVisible.value = false;
    await loadProviders();
  } catch (e) {
    showToast((isCreating.value ? '创建' : '保存') + '失败: ' + (e.message || '未知错误'));
  } finally {
    saving.value = false;
  }
}

// 复选框状态
const modelCheckStates = reactive({});

const selectAllChecked = computed(() => {
  if (!selectableModels.value.length) return false;
  return selectableModels.value.every(m => modelCheckStates[m]);
});

function toggleSelectableModel(name) {
  modelCheckStates[name] = !modelCheckStates[name];
  syncCheckStatesToModels();
}

function toggleAllSelectable(checked) {
  for (const m of selectableModels.value) {
    modelCheckStates[m] = checked;
  }
  syncCheckStatesToModels();
}

function syncCheckStatesToModels() {
  const selectableSet = new Set(selectableModels.value);
  form.models = form.models.filter(m => !selectableSet.has(m));
  for (const m of selectableModels.value) {
    if (modelCheckStates[m]) {
      form.models.push(m);
    }
  }
  if (form.model && !form.models.includes(form.model)) {
    form.model = form.models[0] || '';
  }
}

function syncCheckStatesFromModels() {
  const modelSet = new Set(form.models);
  for (const m of selectableModels.value) {
    modelCheckStates[m] = modelSet.has(m);
  }
}

async function previewModels() {
  if (!form.baseURL.trim()) { showToast('请先输入API地址'); return; }
  previewing.value = true;
  try {
    const data = await previewProviderModels({
      key: form.key.trim() || undefined,
      baseURL: form.baseURL.trim(),
    });
    const fetched = data?.models || [];
    selectableModels.value = fetched;
    if (fetched.length > 0) {
      for (const m of fetched) {
        modelCheckStates[m] = true;
      }
      form.models = [...new Set([...form.models.filter(m => !fetched.includes(m)), ...fetched])];
      if (!form.model) form.model = data.defaultModel || fetched[0];
      showSuccessToast(`获取到 ${fetched.length} 个模型，默认已全选，可取消不需要的`);
    } else {
      showToast('未能获取模型列表，请检查API地址');
    }
  } catch (e) {
    showToast('获取模型失败: ' + (e.message || '未知错误'));
  } finally {
    previewing.value = false;
  }
}

async function testInDialog() {
  dialogTesting.value = true;
  dialogTestResult.value = null;
  try {
    const payload = { provider: editingProvider.value?.provider || 'deepseek' };
    if (form.model) payload.model = form.model.trim();
    if (form.baseURL) payload.baseURL = form.baseURL.trim();
    if (form.key && !form.key.includes('****')) payload.apiKey = form.key.trim();

    const res = await testConnection(payload);
    dialogTestResult.value = {
      ok: res.ok || res.success,
      msg: (res.ok || res.success)
        ? `连接成功${res.model ? ' — ' + res.model : ''}${res.protocol ? ' (' + res.protocol + ')' : ''}`
        : (res.error || res.message || '连接失败'),
    };
  } catch (e) {
    dialogTestResult.value = { ok: false, msg: '连接失败: ' + (e.message || '未知错误') };
  } finally {
    dialogTesting.value = false;
  }
}

function deleteInDialog() {
  if (!editingProvider.value) return;
  confirmDelete(editingProvider.value);
  dialogVisible.value = false;
}

// ========== 卡片操作 ==========

async function toggleActive(p, value) {
  try {
    await updateProvider(p.provider, { isActive: value });
    p.isActive = value;
  } catch (e) {
    showToast('切换失败: ' + (e.message || '未知错误'));
  }
}

async function testSingle(p) {
  const providerId = p.provider;
  try {
    const res = await testConnection({ provider: providerId });
    testResults[providerId] = {
      ok: res.ok || res.success,
      msg: (res.ok || res.success)
        ? `连接成功${res.model ? ' — ' + res.model : ''}${res.protocol ? ' (' + res.protocol + ')' : ''}`
        : (res.error || res.message || '连接失败'),
    };
  } catch (e) {
    testResults[providerId] = { ok: false, msg: '连接失败: ' + (e.message || '未知错误') };
  }
}

async function refreshSingleModels(p) {
  refreshingModels.value = p.provider;
  try {
    await fetchModels(p.provider, true);
    showSuccessToast('模型列表已刷新');
    await loadProviders();
  } catch (e) {
    showToast('刷新失败: ' + (e.message || '未知错误'));
  } finally {
    refreshingModels.value = null;
  }
}

function confirmDelete(p) {
  showConfirmDialog({
    title: '删除厂商',
    message: `确定要删除 "${p.displayName}" 吗？此操作不可撤销。`,
  }).then(() => doDelete(p.provider))
    .catch(() => {});
}

async function doDelete(providerId) {
  try {
    await deleteProvider(providerId);
    showSuccessToast('已删除');
    providers.value = providers.value.filter(p => p.provider !== providerId);
  } catch (e) {
    showToast('删除失败: ' + (e.message || '未知错误'));
  }
}
</script>

<style scoped>
/* ---- 加载 ---- */
.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 0;
  color: var(--muted);
  font-size: 16px;
}

/* ---- 导航卡片 ---- */
.nav-cards {
  display: grid;
  gap: 12px;
}

.nav-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 10px;
  cursor: pointer;
  transition: box-shadow 0.15s;
}

.nav-card:hover {
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.nav-card-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--brand-soft);
  color: var(--brand);
  flex-shrink: 0;
}

.nav-card-text {
  flex: 1;
  min-width: 0;
}

.nav-card-text strong {
  display: block;
  font-size: 16px;
  font-weight: 700;
}

.nav-card-text p {
  margin: 2px 0 0;
  font-size: 14px;
  color: var(--muted);
}

/* ---- 操作反馈 ---- */
.action-msg {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 15px;
  margin-bottom: 14px;
}

.action-msg.success {
  background: #ecfdf5;
  color: #065f46;
}

.action-msg.fail {
  background: #fef2f2;
  color: #991b1b;
}

/* ---- 区域标题 ---- */
.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 8px;
  border-radius: 13px;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 14px;
  font-weight: 700;
  margin-left: 8px;
}

/* ---- 厂商卡片网格 ---- */
.provider-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
}

@media (max-width: 860px) {
  .provider-grid {
    grid-template-columns: 1fr;
  }
}

/* ---- 单张卡片 ---- */
.provider-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: box-shadow 0.15s;
}

.provider-card:hover {
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.provider-card.is-inactive {
  opacity: 0.6;
}

/* 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.card-name {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 卡片内容 */
.card-body {
  display: grid;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  font-size: 15px;
  line-height: 1.5;
}

.info-label {
  color: var(--muted);
  flex-shrink: 0;
  min-width: 72px;
  font-size: 14px;
}

.info-value {
  color: var(--ink);
  word-break: break-all;
}

.info-value.mono {
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  font-size: 14px;
}

/* 模型标签 */
.model-tags {
  margin-top: 6px;
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.model-tag {
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
}
.model-tag:hover {
  border-color: var(--brand);
  color: var(--brand);
}

.model-tag.is-current {
  background: var(--brand-soft);
  border-color: var(--brand);
  color: var(--brand);
  font-weight: 600;
}

.expand-tag {
  background: none;
  border: 1px dashed var(--line);
  border-radius: 16px;
  padding: 4px 14px;
  font-size: 13px;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s;
}

.expand-tag:hover {
  border-color: var(--brand);
  color: var(--brand);
}

/* 卡片操作 */
.card-footer {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
}

/* 测试结果 */
.card-test-result {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
}

.card-test-result.success {
  background: #ecfdf5;
  color: #065f46;
}

.card-test-result.fail {
  background: #fef2f2;
  color: #991b1b;
}

/* ---- 弹窗 ---- */
.config-dialog :deep(.van-dialog) {
  width: 94vw !important;
  max-width: 540px !important;
}
.config-dialog :deep(.van-dialog__content) {
  max-height: 85vh;
  overflow-y: auto;
  padding: 16px;
}

.dialog-body {
  display: grid;
  gap: 8px;
  padding: 4px 0;
}

.key-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  margin: 0 16px;
  background: #fffbeb;
  border-radius: 8px;
  font-size: 14px;
  color: #92400e;
  line-height: 1.5;
}

.key-hint .van-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.field-help {
  margin: 0 16px;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
}

.preview-btn {
  margin: 0 16px;
}

.limit-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.dialog-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 16px;
}

.test-result {
  padding: 10px 14px;
  margin: 0 16px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
}

.test-result.success {
  background: #ecfdf5;
  color: #065f46;
}

.test-result.fail {
  background: #fef2f2;
  color: #991b1b;
}

/* 模型管理区域 */
.models-section {
  padding: 0 16px;
}

.models-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.models-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.models-count {
  font-size: 12px;
  color: var(--muted);
}

.models-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
  align-items: flex-start;
}

.models-empty {
  font-size: 13px;
  color: var(--muted);
  padding: 4px 0;
}

.model-tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px 5px 12px;
  background: #f5f7fa;
  border: 1px solid var(--line);
  border-radius: 16px;
  font-size: 13px;
  color: var(--ink);
  cursor: default;
}

.model-tag-chip.is-default {
  background: var(--brand-soft);
  border-color: var(--brand);
  color: var(--brand);
  font-weight: 600;
}

.model-tag-text {
  cursor: pointer;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-tag-chip .van-icon {
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.15s;
}

.model-tag-chip .van-icon:hover {
  opacity: 1;
}

.add-model-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.add-model-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.add-model-input:focus {
  border-color: var(--brand);
}

/* ??????? */
.model-checkbox-section {
  margin-top: 12px;
  padding: 12px;
  background: #fafbfc;
  border: 1px solid var(--line);
  border-radius: 8px;
}

.checkbox-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line);
}

.checkbox-hint {
  font-size: 12px;
  color: var(--muted);
  margin-left: 4px;
}

.checkbox-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  user-select: none;
}

.checkbox-item:hover {
  background: #f0f2f5;
}

.checkbox-item.checked {
  background: var(--brand-soft);
}

.checkbox-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 2px solid var(--line);
  border-radius: 4px;
  font-size: 12px;
  color: #fff;
  flex-shrink: 0;
  transition: all 0.15s;
}

.checkbox-item.checked .checkbox-box {
  background: var(--brand);
  border-color: var(--brand);
}

.checkbox-label {
  font-size: 13px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-suggestions-wrap {
  margin-top: 8px;
}

.suggestions-label {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 4px;
  display: block;
}

.model-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 120px;
  overflow-y: auto;
}

.model-chip {
  display: inline-block;
  padding: 3px 12px;
  border: 1px dashed var(--line);
  border-radius: 14px;
  font-size: 12px;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-chip:hover,
.model-chip:active {
  background: var(--brand-soft);
  border-color: var(--brand);
  color: var(--brand);
  border-style: solid;
}

.hint {
  color: var(--muted);
  font-size: 13px;
}

/* 弹窗自定义底部 */
.dialog-footer-custom {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px 16px;
  flex-wrap: wrap;
}

.footer-spacer {
  flex: 1;
}
</style>

<style>
/* AI 设置编辑弹窗 — 全局覆盖（van-dialog teleport 到 body，scoped 样式无法生效） */
.config-dialog,
.config-dialog.van-dialog,
.van-dialog.config-dialog,
.van-overlay .config-dialog {
  width: 94vw !important;
  max-width: 540px !important;
}
.config-dialog .van-dialog__content,
.config-dialog > .van-dialog__content {
  max-height: 85vh;
  overflow-y: auto;
  padding: 16px;
}
</style>
