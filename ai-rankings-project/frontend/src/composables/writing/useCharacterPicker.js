import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { fetchCharacters } from '../../api/characters.js';

export function useCharacterPicker(aiForm) {
  const router = useRouter();
  const availableCharacters = ref([]);
  const characterKeyword = ref('');
  const characterPickerOpen = ref(false);

  const filteredCharacters = computed(() => {
    const keyword = characterKeyword.value.trim().toLowerCase();
    if (!keyword) return availableCharacters.value;
    return availableCharacters.value.filter((character) => {
      return `${character.name || ''}${character.personality || ''}${character.background || ''}`.toLowerCase().includes(keyword);
    });
  });

  const selectedCharacters = computed(() => {
    const selectedIds = new Set(aiForm.relatedRoleIds.map((id) => String(id)));
    return availableCharacters.value.filter((character) => selectedIds.has(String(character.id)));
  });

  const selectedCharactersForPrompt = computed(() => {
    return selectedCharacters.value.map((character) => ({
      id: character.id,
      name: character.name,
      gender: character.gender,
      age: character.age,
      personality: character.personality,
      background: character.background,
      abilities: character.abilities,
      appearance: character.appearance,
      notes: character.notes,
    }));
  });

  function syncSelectedCharacterNames() {
    aiForm.relatedRoles = selectedCharacters.value.map((character) => character.name).join('、');
  }

  async function loadCharactersForWriting() {
    try {
      availableCharacters.value = await fetchCharacters({
        limit: 200,
      });
      syncSelectedCharacterNames();
    } catch {
      availableCharacters.value = [];
    }
  }

  function openCharacterPicker() {
    characterPickerOpen.value = true;
    if (!availableCharacters.value.length) loadCharactersForWriting();
  }

  function isCharacterSelected(id) {
    return aiForm.relatedRoleIds.some((selectedId) => String(selectedId) === String(id));
  }

  function toggleCharacter(character) {
    if (isCharacterSelected(character.id)) {
      aiForm.relatedRoleIds = aiForm.relatedRoleIds.filter((id) => String(id) !== String(character.id));
    } else {
      aiForm.relatedRoleIds.push(character.id);
    }
    syncSelectedCharacterNames();
  }

  function selectAllCharacters() {
    const selectedIds = new Set(aiForm.relatedRoleIds.map((id) => String(id)));
    filteredCharacters.value.forEach((character) => selectedIds.add(String(character.id)));
    aiForm.relatedRoleIds = Array.from(selectedIds);
    syncSelectedCharacterNames();
  }

  function goCharacterManagement() {
    characterPickerOpen.value = false;
    router.push('/characters');
  }

  return {
    availableCharacters,
    characterKeyword,
    characterPickerOpen,
    filteredCharacters,
    selectedCharacters,
    selectedCharactersForPrompt,
    syncSelectedCharacterNames,
    loadCharactersForWriting,
    openCharacterPicker,
    isCharacterSelected,
    toggleCharacter,
    selectAllCharacters,
    goCharacterManagement,
  };
}
