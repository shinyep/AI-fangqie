const STORAGE_KEY = 'dailyUsageStats';

function loadStats() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function saveStats(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function recordUsage(wordCount = 0) {
  const stats = loadStats();
  const key = todayKey();
  if (!stats[key]) stats[key] = { calls: 0, words: 0 };
  stats[key].calls += 1;
  stats[key].words += wordCount;
  saveStats(stats);
}

export function getTodayStats() {
  const stats = loadStats();
  return stats[todayKey()] || { calls: 0, words: 0 };
}

export function getRecentStats(days = 7) {
  const stats = loadStats();
  const result = [];
  const d = new Date();
  for (let i = 0; i < days; i++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    result.unshift({ date: key, ...(stats[key] || { calls: 0, words: 0 }) });
    d.setDate(d.getDate() - 1);
  }
  return result;
}

export function getAllStats() {
  const stats = loadStats();
  return Object.entries(stats)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Count Chinese characters in text (excluding punctuation/whitespace) */
export function countChineseWords(text) {
  if (!text) return 0;
  const matches = text.match(/[一-鿿㐀-䶿]/g);
  return matches ? matches.length : 0;
}
