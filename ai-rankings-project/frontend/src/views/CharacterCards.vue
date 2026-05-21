<template>
  <main class="page">
    <header class="topbar">
      <div>
        <h1 class="title">角色卡</h1>
        <p class="subtitle">管理你的角色设定，写作时灵活关联</p>
      </div>
      <van-button icon="plus" size="small" type="primary" @click="showCreate = true">新增</van-button>
    </header>

    <van-search v-model="keyword" placeholder="搜索角色名..." shape="round" @search="loadCharacters" />

    <!-- 角色列表 -->
    <section class="character-grid">
      <div v-for="char in characters" :key="char.id" class="character-card" @click="viewCharacter(char)">
        <div class="char-avatar">{{ char.name.slice(0, 1) }}</div>
        <div class="char-info">
          <strong>{{ char.name }}</strong>
          <span>{{ char.gender }} · {{ char.age || '未知年龄' }}</span>
          <span class="personality">{{ char.personality || '未填写性格' }}</span>
        </div>
        <van-icon name="arrow" color="#ccc" />
      </div>
      <div v-if="!characters.length" class="empty">
        <van-icon name="user-o" size="48" color="#ccc" />
        <p>还没有角色卡，点击"新增"创建第一个角色</p>
      </div>
    </section>

    <!-- 详情/编辑弹窗 -->
    <van-overlay :show="!!selected" @click="selected = null">
      <div v-if="selected" class="detail-popup" @click.stop>
        <h2>{{ isEditing ? '编辑角色' : selected.name }}</h2>

        <template v-if="isEditing">
          <van-field v-model="editForm.name" label="姓名" placeholder="角色姓名" />
          <van-field v-model="editForm.gender" label="性别" placeholder="男/女/其他" />
          <van-field v-model="editForm.age" label="年龄" placeholder="如：25、外貌20实际300" />
          <van-field v-model="editForm.appearance" label="外貌" placeholder="外貌特征描述" type="textarea" rows="2" />
          <van-field v-model="editForm.personality" label="性格" placeholder="核心性格特征" type="textarea" rows="2" />
          <van-field v-model="editForm.background" label="背景" placeholder="出身和关键经历" type="textarea" rows="2" />
          <van-field v-model="editForm.abilities" label="能力" placeholder="技能/异能/功法（逗号分隔）" />
          <van-field v-model="editForm.notes" label="备注" placeholder="其他补充信息" type="textarea" rows="2" />
          <div class="field">
            <span class="label">角色关系</span>
            <div v-for="(rel, i) in editRelations" :key="i" class="relation-row">
              <input v-model="rel.target_name" placeholder="关联角色" class="mini-input" />
              <select v-model="rel.relation_type" class="mini-select">
                <option value="">关系</option>
                <option>师徒</option><option>敌对</option><option>爱慕</option>
                <option>朋友</option><option>亲属</option><option>盟友</option>
                <option>上下级</option><option>宿敌</option><option>合作</option>
              </select>
              <input v-model="rel.description" placeholder="说明" class="mini-input" />
              <van-icon name="delete-o" class="del-icon" @click="editRelations.splice(i, 1)" />
            </div>
            <button class="add-rel-btn" @click="editRelations.push({target_name:'',relation_type:'',description:''})">+ 添加关系</button>
          </div>
          <div class="detail-actions">
            <van-button size="small" type="primary" block :loading="saving" @click="doUpdate">保存</van-button>
            <van-button size="small" block @click="isEditing = false">取消</van-button>
          </div>
        </template>

        <template v-else>
          <div class="detail-body">
            <div class="field" v-if="selected.gender || selected.age">
              <span class="label">基本信息</span>
              <span>{{ selected.gender }} · {{ selected.age || '未知年龄' }}</span>
            </div>
            <div class="field" v-if="selected.appearance">
              <span class="label">外貌</span>
              <span>{{ selected.appearance }}</span>
            </div>
            <div class="field" v-if="selected.personality">
              <span class="label">性格</span>
              <span>{{ selected.personality }}</span>
            </div>
            <div class="field" v-if="selected.background">
              <span class="label">背景</span>
              <span>{{ selected.background }}</span>
            </div>
            <div class="field" v-if="selected.abilities">
              <span class="label">能力</span>
              <span>{{ selected.abilities }}</span>
            </div>
            <div class="field" v-if="selected.notes">
              <span class="label">备注</span>
              <span>{{ selected.notes }}</span>
            </div>
            <div class="field" v-if="selectedRelations.length">
              <span class="label">角色关系</span>
              <span v-for="r in selectedRelations" :key="r.target_name" class="relation-tag">
                {{ r.relation_type }} ← {{ r.target_name }} <small v-if="r.description">({{ r.description }})</small>
              </span>
            </div>
          </div>
          <div class="detail-actions">
            <van-button size="small" icon="edit-o" @click="startEdit">编辑</van-button>
            <van-button size="small" type="primary" @click="useCharacter(selected)">用于写作</van-button>
            <van-button size="small" icon="delete-o" @click="doDelete(selected.id)">删除</van-button>
          </div>
        </template>

        <van-button block class="close-btn" @click="selected = null; isEditing = false">关闭</van-button>
      </div>
    </van-overlay>

    <!-- 创建弹窗 -->
    <van-overlay :show="showCreate" @click="showCreate = false">
      <div class="create-popup" @click.stop>
        <h2>新增角色</h2>
        <van-field v-model="createForm.name" label="姓名 *" placeholder="角色姓名" />
        <van-field v-model="createForm.gender" label="性别" placeholder="男/女/其他" />
        <van-field v-model="createForm.age" label="年龄" placeholder="如：25" />
        <van-field v-model="createForm.appearance" label="外貌" placeholder="外貌特征" type="textarea" rows="1" />
        <van-field v-model="createForm.personality" label="性格" placeholder="核心性格" type="textarea" rows="2" />
        <van-field v-model="createForm.background" label="背景" placeholder="出身和经历" type="textarea" rows="2" />
        <van-field v-model="createForm.abilities" label="能力" placeholder="逗号分隔" />
        <van-field v-model="createForm.notes" label="备注" placeholder="其他信息" type="textarea" rows="1" />
        <div class="field">
          <span class="label">角色关系</span>
          <div v-for="(rel, i) in createRelations" :key="i" class="relation-row">
            <input v-model="rel.target_name" placeholder="关联角色" class="mini-input" />
            <select v-model="rel.relation_type" class="mini-select">
              <option value="">关系</option>
              <option>师徒</option><option>敌对</option><option>爱慕</option>
              <option>朋友</option><option>亲属</option><option>盟友</option>
              <option>上下级</option><option>宿敌</option><option>合作</option>
            </select>
            <input v-model="rel.description" placeholder="说明" class="mini-input" />
            <van-icon name="delete-o" class="del-icon" @click="createRelations.splice(i, 1)" />
          </div>
          <button class="add-rel-btn" @click="createRelations.push({target_name:'',relation_type:'',description:''})">+ 添加关系</button>
        </div>
        <van-button type="primary" block :loading="creating" @click="doCreate">创建</van-button>
        <van-button block class="close-btn" @click="showCreate = false">取消</van-button>
      </div>
    </van-overlay>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showToast, showSuccessToast, showConfirmDialog } from 'vant';
import { fetchCharacters, fetchCharacterDetail, createCharacter, updateCharacter, deleteCharacter } from '../api/characters.js';

const router = useRouter();

const characters = ref([]);
const keyword = ref('');
const selected = ref(null);
const isEditing = ref(false);
const saving = ref(false);
const showCreate = ref(false);
const creating = ref(false);

const emptyForm = () => ({ name: '', gender: '', age: '', appearance: '', personality: '', background: '', abilities: '', notes: '' });
const createForm = reactive(emptyForm());
const editForm = reactive(emptyForm());
const createRelations = ref([]);
const editRelations = ref([]);
const selectedRelations = ref([]);

function parseRelations(r) {
  try { return typeof r === 'string' ? JSON.parse(r) : (Array.isArray(r) ? r : []); } catch { return []; }
}

async function loadCharacters() {
  const params = {};
  if (keyword.value.trim()) params.keyword = keyword.value.trim();
  characters.value = await fetchCharacters(params);
}

async function viewCharacter(char) {
  try {
    selected.value = await fetchCharacterDetail(char.id);
  } catch {
    selected.value = char;
  }
  selectedRelations.value = parseRelations(selected.value.relations);
  isEditing.value = false;
}

function startEdit() {
  Object.assign(editForm, {
    name: selected.value.name,
    gender: selected.value.gender,
    age: selected.value.age,
    appearance: selected.value.appearance,
    personality: selected.value.personality,
    background: selected.value.background,
    abilities: selected.value.abilities,
    notes: selected.value.notes,
  });
  editRelations.value = JSON.parse(JSON.stringify(parseRelations(selected.value.relations)));
  isEditing.value = true;
}

async function doUpdate() {
  if (!editForm.name.trim()) { showToast('姓名不能为空'); return; }
  saving.value = true;
  try {
    selected.value = await updateCharacter(selected.value.id, { ...editForm, relations: editRelations.value.filter(r => r.target_name.trim()) });
    isEditing.value = false;
    await loadCharacters();
    showSuccessToast('已更新');
  } catch (e) { showToast('保存失败: ' + e.message); }
  finally { saving.value = false; }
}

async function doDelete(id) {
  try {
    await showConfirmDialog({ title: '确认删除', message: '确定删除此角色吗？' });
    await deleteCharacter(id);
    selected.value = null;
    await loadCharacters();
    showSuccessToast('已删除');
  } catch { /* cancelled */ }
}

async function doCreate() {
  if (!createForm.name.trim()) { showToast('请输入姓名'); return; }
  creating.value = true;
  try {
    await createCharacter({ ...createForm, relations: createRelations.value.filter(r => r.target_name.trim()) });
    showSuccessToast('创建成功');
    showCreate.value = false;
    Object.assign(createForm, emptyForm());
    createRelations.value = [];
    await loadCharacters();
  } catch (e) { showToast('创建失败: ' + e.message); }
  finally { creating.value = false; }
}

function useCharacter(char) {
  // 存储选中的角色到 localStorage，供写作页读取
  try {
    const stored = JSON.parse(localStorage.getItem('selectedCharacters') || '[]');
    if (!stored.find((c) => c.id === char.id)) {
      stored.push({
        id: char.id,
        name: char.name,
        gender: char.gender,
        age: char.age,
        personality: char.personality,
        background: char.background,
        abilities: char.abilities,
      });
      localStorage.setItem('selectedCharacters', JSON.stringify(stored));
      showSuccessToast(`已添加角色【${char.name}】`);
    } else {
      showToast('此角色已添加');
    }
  } catch { showToast('操作失败'); }
}

onMounted(async () => {
  await loadCharacters();
});
</script>

<style scoped>
.character-grid {
  display: grid;
  gap: 8px;
}

.character-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.character-card:active { border-color: var(--accent); }

.char-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #5b7fff);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}

.char-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.char-info strong { font-size: 15px; }
.char-info span { font-size: 12px; color: var(--muted); }
.personality { font-size: 12px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.empty { text-align: center; padding: 40px 0; color: var(--muted); font-size: 14px; }

/* 弹窗 */
.detail-popup, .create-popup {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(520px, calc(100vw - 32px));
  max-height: 85vh;
  overflow-y: auto;
  overflow-x: hidden;
  word-break: break-word;
  overflow-wrap: break-word;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 20px 16px;
}

.detail-popup h2, .create-popup h2 { margin: 0 0 12px; font-size: 17px; }

.detail-body { display: grid; gap: 10px; margin-bottom: 12px; word-break: break-word; overflow-wrap: break-word; }

.field {
  display: grid;
  gap: 2px;
}
.field .label { font-size: 12px; color: var(--muted); font-weight: 600; }
.field span { font-size: 14px; color: var(--ink); line-height: 1.5; }

.detail-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.close-btn { margin-top: 4px; }

.create-popup { display: grid; gap: 8px; }

.relation-row { display: flex; gap: 4px; align-items: center; margin-bottom: 4px; }
.mini-input { flex: 1; border: 1px solid #eee; border-radius: 4px; padding: 4px 6px; font-size: 12px; outline: none; width: 0; }
.mini-input:focus { border-color: var(--accent); }
.mini-select { border: 1px solid #eee; border-radius: 4px; padding: 4px 4px; font-size: 12px; outline: none; }
.del-icon { color: #e74c3c; cursor: pointer; font-size: 14px; }
.add-rel-btn { background: none; border: 1px dashed #ccc; border-radius: 4px; padding: 3px 8px; font-size: 12px; color: var(--accent); cursor: pointer; }
.relation-tag { display: inline-block; margin-right: 6px; margin-bottom: 4px; padding: 2px 8px; background: #f0f7ff; border-radius: 10px; font-size: 12px; }

@media (max-width: 640px) {
  .detail-popup, .create-popup {
    left: 0;
    right: 0;
    transform: none;
    width: auto;
  }
}
</style>
