import { ref } from 'vue';

const STORAGE_KEY_STYLE = 'custom_style_presets_v1';
const STORAGE_KEY_REQUIREMENT = 'custom_requirement_presets_v1';

export function useCustomPresets() {
  const customStylePresets = ref([]);
  const customRequirementPresets = ref([]);

  function loadAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STYLE);
      customStylePresets.value = raw ? JSON.parse(raw) : [];
    } catch { customStylePresets.value = []; }
    try {
      const raw = localStorage.getItem(STORAGE_KEY_REQUIREMENT);
      customRequirementPresets.value = raw ? JSON.parse(raw) : [];
    } catch { customRequirementPresets.value = []; }
  }

  function persistStyles() {
    localStorage.setItem(STORAGE_KEY_STYLE, JSON.stringify(customStylePresets.value));
  }

  function persistRequirements() {
    localStorage.setItem(STORAGE_KEY_REQUIREMENT, JSON.stringify(customRequirementPresets.value));
  }

  function saveStylePreset(title, content) {
    const existing = customStylePresets.value.findIndex(p => p.title === title);
    if (existing >= 0) {
      customStylePresets.value[existing] = { title, content, createdAt: Date.now() };
    } else {
      customStylePresets.value.unshift({ title, content, createdAt: Date.now() });
    }
    persistStyles();
  }

  function saveRequirementPreset(title, content) {
    const existing = customRequirementPresets.value.findIndex(p => p.title === title);
    if (existing >= 0) {
      customRequirementPresets.value[existing] = { title, content, createdAt: Date.now() };
    } else {
      customRequirementPresets.value.unshift({ title, content, createdAt: Date.now() });
    }
    persistRequirements();
  }

  function deleteStylePreset(index) {
    customStylePresets.value.splice(index, 1);
    persistStyles();
  }

  function deleteRequirementPreset(index) {
    customRequirementPresets.value.splice(index, 1);
    persistRequirements();
  }

  function updateStylePreset(index, title, content) {
    if (index >= 0 && index < customStylePresets.value.length) {
      customStylePresets.value[index] = { ...customStylePresets.value[index], title, content };
      persistStyles();
    }
  }

  function updateRequirementPreset(index, title, content) {
    if (index >= 0 && index < customRequirementPresets.value.length) {
      customRequirementPresets.value[index] = { ...customRequirementPresets.value[index], title, content };
      persistRequirements();
    }
  }

  return {
    customStylePresets,
    customRequirementPresets,
    loadAll,
    saveStylePreset,
    saveRequirementPreset,
    deleteStylePreset,
    deleteRequirementPreset,
    updateStylePreset,
    updateRequirementPreset,
  };
}
