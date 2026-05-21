/**
 * 中文文本 diff 工具 — 段落级 LCS + 句子级对比
 * 用于修复前后内容对比展示
 */

/**
 * 计算两个文本数组的 LCS（最长公共子序列）
 * @returns {boolean[]} 对 oldLines 的标记，true=该行在LCS中
 */
function computeLCS(oldLines, newLines) {
  const m = oldLines.length;
  const n = newLines.length;

  // DP 表
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1].trim() === newLines[j - 1].trim()) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 回溯
  const oldMatch = new Array(m).fill(false);
  const newMatch = new Array(n).fill(false);
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (oldLines[i - 1].trim() === newLines[j - 1].trim()) {
      oldMatch[i - 1] = true;
      newMatch[j - 1] = true;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return { oldMatch, newMatch };
}

/**
 * 将中文文本按句子切分
 */
function splitSentences(text) {
  const parts = [];
  let current = '';
  // 按中文标点切分，但保留标点在句子末尾
  for (let i = 0; i < text.length; i++) {
    current += text[i];
    if ('。！？；！？…～\n'.includes(text[i])) {
      if (current.trim()) parts.push(current);
      current = '';
    }
  }
  if (current.trim()) parts.push(current);
  return parts.length > 0 ? parts : [text];
}

/**
 * 对两个不同的段落做句子级 diff，返回 diff 片段
 * @returns {Array<{ type: 'equal'|'insert'|'delete', text: string }>}
 */
function diffSentences(oldText, newText) {
  const oldSents = splitSentences(oldText);
  const newSents = splitSentences(newText);
  const { oldMatch, newMatch } = computeLCS(oldSents, newSents);

  const chunks = [];
  let oi = 0, ni = 0;

  while (oi < oldSents.length || ni < newSents.length) {
    // 跳过匹配的句子
    let eq = '';
    while (oi < oldSents.length && oldMatch[oi] && ni < newSents.length && newMatch[ni]) {
      if (oldSents[oi].trim() === newSents[ni].trim()) {
        eq += oldSents[oi];
        oi++;
        ni++;
      } else {
        break;
      }
    }
    if (eq) {
      chunks.push({ type: 'equal', text: eq });
    }

    // 收集被删除的句子
    let del = '';
    while (oi < oldSents.length && !oldMatch[oi]) {
      del += oldSents[oi];
      oi++;
    }
    if (del) {
      chunks.push({ type: 'delete', text: del });
    }

    // 收集被插入的句子
    let ins = '';
    while (ni < newSents.length && !newMatch[ni]) {
      ins += newSents[ni];
      ni++;
    }
    if (ins) {
      chunks.push({ type: 'insert', text: ins });
    }
  }

  // 如果 diff 太过细碎（chunks > 20），降级为纯 before/after 展示
  if (chunks.length > 20) {
    return [
      { type: 'delete', text: oldText },
      { type: 'insert', text: newText },
    ];
  }

  return chunks;
}

/**
 * 段落级 diff
 * @returns {Array<{ type: 'equal'|'insert'|'delete'|'modified', text?: string, oldText?: string, newText?: string, chunks?: Array }>}
 */
function diffParagraphs(oldText, newText) {
  const oldParas = oldText.split(/\n/);
  const newParas = newText.split(/\n/);
  const { oldMatch, newMatch } = computeLCS(oldParas, newParas);

  const result = [];
  let oi = 0, ni = 0;

  while (oi < oldParas.length || ni < newParas.length) {
    // 输出旧文本中匹配的段落
    while (oi < oldParas.length && oldMatch[oi]) {
      // 找到对应的新文本段落
      while (ni < newParas.length && oldParas[oi].trim() !== newParas[ni].trim()) {
        ni++;
      }
      if (ni < newParas.length) {
        if (oldParas[oi] === newParas[ni]) {
          result.push({ type: 'equal', text: oldParas[oi] });
        } else {
          // 段落保留但内容有变化
          const chunks = diffSentences(oldParas[oi], newParas[ni]);
          result.push({ type: 'modified', oldText: oldParas[oi], newText: newParas[ni], chunks });
        }
        ni++;
      } else {
        result.push({ type: 'equal', text: oldParas[oi] });
      }
      oi++;
    }

    // 收集被删除的段落
    while (oi < oldParas.length && !oldMatch[oi]) {
      result.push({ type: 'delete', text: oldParas[oi] });
      oi++;
    }

    // 收集被插入的段落
    while (ni < newParas.length && !newMatch[ni]) {
      result.push({ type: 'insert', text: newParas[ni] });
      ni++;
    }
  }

  // 如果降级为纯替换（无 equal），添加结构
  if (result.length === 0) {
    result.push({ type: 'delete', text: oldText });
    result.push({ type: 'insert', text: newText });
  }

  return result;
}

/**
 * 主入口：计算两个文本的差异
 * @param {string} oldText - 原始文本
 * @param {string} newText - 修复后文本
 * @returns {{ paragraphs: Array, stats: { added: number, removed: number, modified: number, unchanged: number } }}
 */
export function computeTextDiff(oldText, newText) {
  if (!oldText || !newText) {
    return { paragraphs: [], stats: { added: 0, removed: 0, modified: 0, unchanged: 0 } };
  }

  if (oldText === newText) {
    return {
      paragraphs: [{ type: 'equal', text: newText }],
      stats: { added: 0, removed: 0, modified: 0, unchanged: 1 },
    };
  }

  const paragraphs = diffParagraphs(oldText, newText);

  const stats = {
    added: paragraphs.filter(p => p.type === 'insert').length,
    removed: paragraphs.filter(p => p.type === 'delete').length,
    modified: paragraphs.filter(p => p.type === 'modified').length,
    unchanged: paragraphs.filter(p => p.type === 'equal').length,
  };

  return { paragraphs, stats };
}
