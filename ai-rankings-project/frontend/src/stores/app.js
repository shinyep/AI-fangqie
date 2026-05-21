import { defineStore } from 'pinia';
import { fetchRankTypes } from '../api/aiRankings.js';

export const useAppStore = defineStore('app', {
  state: () => ({
    rankTypes: [],
    activeRankType: 'hot',
    currentBook: null,
  }),
  actions: {
    async loadRankTypes() {
      if (this.rankTypes.length) return;
      this.rankTypes = await fetchRankTypes();
    },
    setRankType(rankType) {
      this.activeRankType = rankType;
    },
    setCurrentBook(book) {
      this.currentBook = book;
      try { localStorage.setItem('currentBook', JSON.stringify(book)); } catch { /* ignore */ }
    },
  },
});
