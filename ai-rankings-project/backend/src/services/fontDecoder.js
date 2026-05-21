import crypto from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import opentype from 'opentype.js';
import wawoff2 from 'wawoff2';
import { getDb } from '../models/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PUA_MAPPING_PATH = join(__dirname, '..', '..', 'pua_mapping.json');
const REF_48_PATH = join(__dirname, '..', '..', 'ref_48.json');
const FONT_PATH = join(__dirname, '..', '..', 'font.woff2');

const FANQIE_LIBRARY_URL = 'https://fanqienovel.com/library';
const FANQIE_LIBRARY_API = 'https://fanqienovel.com/api/author/library/book_list/v/';

// 内存中的映射表
let puaMapping = null;
let refBitmaps = null;
let currentFontHash = null;

/**
 * 加载 PUA 映射表到内存
 */
function loadPuaMapping() {
  if (puaMapping) return puaMapping;
  if (existsSync(PUA_MAPPING_PATH)) {
    puaMapping = JSON.parse(readFileSync(PUA_MAPPING_PATH, 'utf-8'));
    console.log(`[FONT] 已加载 PUA 映射表: ${Object.keys(puaMapping).length} 条`);
  } else {
    puaMapping = {};
    console.log('[FONT] PUA 映射表不存在，使用空映射');
  }
  return puaMapping;
}

/**
 * 加载参考字形位图（懒加载，仅在需要刷新映射时使用）
 */
function loadRefBitmaps() {
  if (refBitmaps) return refBitmaps;
  if (existsSync(REF_48_PATH)) {
    refBitmaps = JSON.parse(readFileSync(REF_48_PATH, 'utf-8'));
    console.log(`[FONT] 已加载参考字形: ${Object.keys(refBitmaps).length} 个字符`);
  } else {
    refBitmaps = {};
    console.log('[FONT] 参考字形文件不存在');
  }
  return refBitmaps;
}

/**
 * 计算字体的 SHA256 哈希
 */
function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * 从番茄小说 library 页面提取最新字体 URL
 */
export async function extractFontUrl() {
  try {
    const response = await fetch(FANQIE_LIBRARY_URL, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      },
    });
    const html = await response.text();

    // 匹配 @font-face 中的 woff2 字体 URL（静态页面）
    const urlMatch = html.match(/url\(["']?(https:\/\/[^"'\s)]+\.woff2)["']?\)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    // 从 JS bundle 中查找 awesome-font CDN 路径
    const jsUrls = [...html.matchAll(/src="(\/\/[^"]+\.js)"/g)].map(m => 'https:' + m[1]);

    for (const jsUrl of jsUrls) {
      try {
        const jsResp = await fetch(jsUrl, {
          headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
            referer: FANQIE_LIBRARY_URL,
          },
        });
        if (!jsResp.ok) continue;
        const jsText = await jsResp.text();

        // 匹配 awesome-font CDN 中的 woff2 URL
        const cdnMatch = jsText.match(/https:\/\/[^"'\s]+awesome-font[^"'\s]+\.woff2/i);
        if (cdnMatch) {
          console.log(`[FONT] 从 JS bundle 中发现字体: ${cdnMatch[0]}`);
          return cdnMatch[0];
        }
      } catch (e) {
        continue;
      }
    }

    console.log('[FONT] 未在页面或 JS bundle 中找到字体 URL');
    return null;
  } catch (err) {
    console.error('[FONT] 提取字体 URL 失败:', err.message);
    return null;
  }
}

/**
 * 下载字体文件
 */
export async function downloadFont(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      referer: FANQIE_LIBRARY_URL,
    },
  });
  if (!response.ok) {
    throw new Error(`字体下载失败: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * 将 base64 编码的位图解码为布尔数组
 * 每个 base64 字符代表 6 位
 */
function decodeBitmap(base64Str, expectedPixels) {
  const bits = [];
  for (const ch of base64Str) {
    const val = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.indexOf(ch);
    if (val === -1) continue;
    for (let i = 5; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }
  return bits.slice(0, expectedPixels);
}

/**
 * 将位图渲染为 base64 字符串（使用标准 base64 字符集）
 * 与 ref_48.json 的编码格式保持一致
 */
function encodeBitmap(bits) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < bits.length; i += 6) {
    let val = 0;
    for (let j = 0; j < 6; j++) {
      val = (val << 1) | (bits[i + j] || 0);
    }
    result += chars[val];
  }
  return result;
}

/**
 * 将 opentype.js 字形渲染为 48×48 位图
 * 通过光栅化字形路径实现
 */
function rasterizeGlyph(glyph, size = 48) {
  if (!glyph || !glyph.path) {
    // 空字形返回全白位图
    return new Array(size * size).fill(0);
  }

  const width = size;
  const height = size;
  const grid = new Array(width * height).fill(0);

  // 获取字形边界框以计算缩放
  const box = glyph.getBoundingBox();
  const glyphWidth = box.x2 - box.x1;
  const glyphHeight = box.y2 - box.y1;

  if (glyphWidth === 0 || glyphHeight === 0) return grid;

  // 缩放以适合 48×48，留 4px 边距
  const margin = 4;
  const scaleX = (width - margin * 2) / glyphWidth;
  const scaleY = (height - margin * 2) / glyphHeight;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = (width - glyphWidth * scale) / 2 - box.x1 * scale;
  const offsetY = (height - glyphHeight * scale) / 2 - box.y1 * scale;

  // 获取路径命令并光栅化
  const path = glyph.getPath(0, 0, size);
  const commands = path.commands;

  // 使用扫描线填充算法处理路径
  const polygons = [];
  let currentPolygon = [];

  for (const cmd of commands) {
    if (cmd.type === 'M') {
      if (currentPolygon.length > 0) polygons.push(currentPolygon);
      currentPolygon = [{ x: cmd.x * scale + offsetX, y: cmd.y * scale + offsetY }];
    } else if (cmd.type === 'L') {
      currentPolygon.push({ x: cmd.x * scale + offsetX, y: cmd.y * scale + offsetY });
    } else if (cmd.type === 'C') {
      // 贝塞尔曲线：采样为线段
      const last = currentPolygon[currentPolygon.length - 1];
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        const x = mt * mt * mt * last.x
          + 3 * mt * mt * t * cmd.x1 * scale + offsetX
          + 3 * mt * t * t * cmd.x2 * scale + offsetX
          + t * t * t * (cmd.x * scale + offsetX);
        const y = mt * mt * mt * last.y
          + 3 * mt * mt * t * (cmd.y1 * scale + offsetY)
          + 3 * mt * t * t * (cmd.y2 * scale + offsetY)
          + t * t * t * (cmd.y * scale + offsetY);
        currentPolygon.push({ x, y });
      }
    } else if (cmd.type === 'Q') {
      const last = currentPolygon[currentPolygon.length - 1];
      const steps = 6;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        const x = mt * mt * last.x
          + 2 * mt * t * (cmd.x1 * scale + offsetX)
          + t * t * (cmd.x * scale + offsetX);
        const y = mt * mt * last.y
          + 2 * mt * t * (cmd.y1 * scale + offsetY)
          + t * t * (cmd.y * scale + offsetY);
        currentPolygon.push({ x, y });
      }
    } else if (cmd.type === 'Z') {
      if (currentPolygon.length > 0) {
        currentPolygon.push({ ...currentPolygon[0] });
        polygons.push(currentPolygon);
        currentPolygon = [];
      }
    }
  }
  if (currentPolygon.length > 0) polygons.push(currentPolygon);

  // 对每个多边形进行扫描线填充
  for (const poly of polygons) {
    if (poly.length < 3) continue;
    const minY = Math.max(0, Math.floor(Math.min(...poly.map(p => p.y))));
    const maxY = Math.min(height - 1, Math.ceil(Math.max(...poly.map(p => p.y))));

    for (let y = minY; y <= maxY; y++) {
      const intersections = [];
      for (let i = 0; i < poly.length - 1; i++) {
        const p1 = poly[i];
        const p2 = poly[i + 1];
        if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
          const t = (y - p1.y) / (p2.y - p1.y);
          const x = p1.x + t * (p2.x - p1.x);
          intersections.push(x);
        }
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i < intersections.length - 1; i += 2) {
        const x1 = Math.max(0, Math.floor(intersections[i]));
        const x2 = Math.min(width - 1, Math.ceil(intersections[i + 1]));
        for (let x = x1; x <= x2; x++) {
          grid[y * width + x] = 1;
        }
      }
    }
  }

  return grid;
}

/**
 * 计算两个位图之间的 Jaccard 相似度（仅比较黑色像素）
 * 避免白色背景主导相似度
 */
function jaccardSimilarity(bits1, bits2, length) {
  let intersect = 0;
  let union = 0;
  const len = Math.min(bits1.length, bits2.length, length);
  for (let i = 0; i < len; i++) {
    if (bits1[i] && bits2[i]) intersect++;
    if (bits1[i] || bits2[i]) union++;
  }
  if (union === 0) return 0;
  return intersect / union;
}

/**
 * 使用位图比较建立单个 PUA 字符到标准汉字的映射
 */
function matchGlyphByBitmap(puaBits) {
  const ref = loadRefBitmaps();
  let bestChar = '?';
  let bestScore = 0;
  const totalPixels = 48 * 48;

  for (const [codePoint, entry] of Object.entries(ref)) {
    const refBits = decodeBitmap(entry.bitmap, totalPixels);
    const score = jaccardSimilarity(puaBits, refBits, totalPixels);
    if (score > bestScore) {
      bestScore = score;
      bestChar = String.fromCodePoint(parseInt(codePoint));
    }
    // 提前退出：完美匹配
    if (bestScore > 0.99) break;
  }

  return bestChar;
}

/**
 * 从字体文件建立完整的 PUA 映射表
 * 使用光栅化字形 + 位图比较
 */
export async function buildPuaMapping(fontBuffer) {
  const fontHash = hashBuffer(fontBuffer);
  const db = getDb();

  // 检查数据库缓存
  const cached = db.prepare('SELECT mapping_json FROM font_cache WHERE font_hash = ?').get(fontHash);
  if (cached) {
    console.log(`[FONT] 命中缓存: ${fontHash.slice(0, 12)}`);
    const mapping = JSON.parse(cached.mapping_json);
    puaMapping = mapping;
    currentFontHash = fontHash;
    return mapping;
  }

  console.log(`[FONT] 开始解析字体建立映射: ${fontHash.slice(0, 12)}`);

  // wawoff2 解压 WOFF2 → TTF
  const ttfBuffer = await wawoff2.decompress(fontBuffer);
  const font = opentype.parse(ttfBuffer);
  const cmap = font.tables.cmap;
  if (!cmap) throw new Error('字体缺少 cmap 表');

  // 获取所有 PUA 码点（U+E000 - U+F8FF 私有使用区）
  const glyphToChar = {};
  for (const [codePoint, glyphIndex] of Object.entries(cmap.glyphIndexMap || {})) {
    const cp = parseInt(codePoint);
    if (cp >= 0xE000 && cp <= 0xF8FF) {
      glyphToChar[cp] = glyphIndex;
    }
  }

  // 也检查 U+58xx 范围的 PUA
  for (const [codePoint, glyphIndex] of Object.entries(cmap.glyphIndexMap || {})) {
    const cp = parseInt(codePoint);
    if (cp >= 0x5800 && cp <= 0x58FF) {
      glyphToChar[cp] = glyphIndex;
    }
  }

  console.log(`[FONT] 发现 ${Object.keys(glyphToChar).length} 个 PUA 码点`);

  const newMapping = {};
  const ref = loadRefBitmaps();
  const totalPixels = 48 * 48;

  let matched = 0;
  for (const [puaCode, glyphIndex] of Object.entries(glyphToChar)) {
    const glyph = font.glyphs.get(glyphIndex);
    if (!glyph) continue;

    const puaBits = rasterizeGlyph(glyph, 48);
    const puaChar = String.fromCodePoint(parseInt(puaCode));

    // 与参考位图比较
    let bestChar = null;
    let bestScore = 0;

    for (const [refCode, entry] of Object.entries(ref)) {
      const refBits = decodeBitmap(entry.bitmap, totalPixels);
      const score = jaccardSimilarity(puaBits, refBits, totalPixels);
      if (score > bestScore) {
        bestScore = score;
        bestChar = String.fromCodePoint(parseInt(refCode));
      }
      if (bestScore > 0.95) break; // 极高置信度，提前退出
    }

    // Jaccard: 只比较黑色像素重叠度，0.55+ 为可信匹配
    if (bestScore > 0.55 && bestChar) {
      newMapping[puaChar] = bestChar;
      matched++;
    }
  }

  console.log(`[FONT] 映射完成: ${matched}/${Object.keys(glyphToChar).length} 个匹配成功`);

  // 持久化到数据库
  db.prepare(
    'INSERT OR REPLACE INTO font_cache (font_hash, mapping_json, updated_at) VALUES (?, ?, ?)',
  ).run(fontHash, JSON.stringify(newMapping), new Date().toISOString());

  puaMapping = newMapping;
  currentFontHash = fontHash;
  return newMapping;
}

/**
 * 使用已加载的 PUA 映射解码含 PUA 字符的文本
 */
export function decodePuaText(text) {
  if (!text || typeof text !== 'string') return text || '';

  const mapping = loadPuaMapping();
  if (Object.keys(mapping).length === 0) return text;

  let result = '';
  for (const ch of text) {
    result += mapping[ch] || ch;
  }
  return result;
}

/**
 * 对一对字符串逐字符对齐，修正 PUA 映射
 * raw 是含 PUA 的原始字符串，clean 是清洁字符串
 */
function alignAndFixMapping(raw, clean, mapping, stats) {
  const rawChars = [...raw];
  const cleanChars = [...clean];
  let ri = 0, ci = 0;

  while (ri < rawChars.length && ci < cleanChars.length) {
    const rawCh = rawChars[ri];
    const cleanCh = cleanChars[ci];
    const rawCp = rawCh.codePointAt(0);

    if (rawCh === cleanCh) {
      ri++;
      ci++;
    } else if ((rawCp >= 0xE000 && rawCp <= 0xF8FF) || (rawCp >= 0x5800 && rawCp <= 0x58FF)) {
      if (!mapping[rawCh] || mapping[rawCh] !== cleanCh) {
        if (!mapping[rawCh]) stats.newChars++;
        else stats.fixedChars++;
        mapping[rawCh] = cleanCh;
      }
      ri++;
      ci++;
    } else if (ci + 1 < cleanChars.length && rawChars[ri + 1] === cleanChars[ci + 1]) {
      ci++;
    } else if (ri + 1 < rawChars.length && rawChars[ri + 1] === cleanChars[ci + 1]) {
      ri++;
    } else {
      ri++;
      ci++;
    }
  }
}

/**
 * 通过对比 API 数据（书名+作者）和详情页清洁数据，逐字符对齐建立/修正 PUA 映射
 */
export async function buildMappingFromApi({ pageCount = 3 } = {}) {
  const db = getDb();

  const samples = [];
  for (let page = 0; page < Math.min(pageCount, 5); page++) {
    const params = new URLSearchParams({
      page_count: 20, page_index: page, gender: -1, category_id: -1,
      creation_status: -1, word_count: -1, book_type: -1, sort: 0,
    });
    const resp = await fetch(`${FANQIE_LIBRARY_API}?${params}`, {
      headers: {
        accept: 'application/json, text/plain, */*',
        referer: FANQIE_LIBRARY_URL,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      },
    });
    if (!resp.ok) continue;
    const payload = await resp.json();
    if (payload.code !== 0) continue;
    const books = payload.data?.book_list || [];
    for (const b of books) {
      samples.push({
        bookId: b.book_id,
        rawName: b.book_name || '',
        rawAuthor: b.author || '',
      });
    }
  }

  const newMapping = { ...loadPuaMapping() };
  const stats = { newChars: 0, fixedChars: 0, booksChecked: 0 };

  for (const sample of samples) {
    if (!sample.bookId) continue;

    let cleanTitle = null;
    let cleanAuthor = null;

    try {
      const resp = await fetch(`https://fanqienovel.com/page/${sample.bookId}`, {
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
          referer: FANQIE_LIBRARY_URL,
        },
      });
      if (resp.ok) {
        const html = await resp.text();

        const titleMatch = html.match(/<title>([^<]+)<\/title>/);
        if (titleMatch) {
          const parts = titleMatch[1].split('_');
          if (parts.length >= 2) cleanTitle = parts[0];
        }

        const ldMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/);
        if (ldMatch) {
          try {
            const ld = JSON.parse(ldMatch[1]);
            cleanAuthor = ld.author?.[0]?.name || null;
          } catch (e) {}
        }
      }
    } catch (e) {
      continue;
    }

    if (cleanTitle) {
      alignAndFixMapping(sample.rawName, cleanTitle, newMapping, stats);
    }
    if (cleanAuthor && sample.rawAuthor) {
      alignAndFixMapping(sample.rawAuthor, cleanAuthor, newMapping, stats);
    }

    if (cleanTitle || cleanAuthor) stats.booksChecked++;
  }

  console.log(`[FONT] API对比完成: ${stats.booksChecked}本书, 新增 ${stats.newChars} 映射, 修正 ${stats.fixedChars} 映射, 总计 ${Object.keys(newMapping).length} 条`);

  const mapJson = JSON.stringify(newMapping);
  const fontHash = hashBuffer(Buffer.from(mapJson));
  db.prepare(
    'INSERT OR REPLACE INTO font_cache (font_hash, mapping_json, updated_at) VALUES (?, ?, ?)',
  ).run(fontHash, mapJson, new Date().toISOString());

  puaMapping = newMapping;
  currentFontHash = fontHash;
  return newMapping;
}

/**
 * 检查并刷新字体映射
 * 先通过字体文件解析建立完整映射，再用 API 对比修正可验证的条目
 */
export async function refreshFontMapping() {
  console.log('[FONT] 检查字体更新...');

  // 第一步：尝试字体文件方案，建立完整 PUA 映射
  try {
    const fontUrl = await extractFontUrl();
    if (fontUrl) {
      console.log(`[FONT] 当前字体 URL: ${fontUrl}`);
      const fontBuffer = await downloadFont(fontUrl);
      const fontHash = hashBuffer(fontBuffer);

      if (currentFontHash === fontHash && puaMapping && Object.keys(puaMapping).length > 0) {
        console.log(`[FONT] 字体未变化: ${fontHash.slice(0, 12)}，跳过字体解析`);
      } else {
        await buildPuaMapping(fontBuffer);
      }
    }
  } catch (err) {
    console.error('[FONT] 字体文件方案失败:', err.message);
  }

  // 第二步：通过 API 对比修正映射（仅修正书名+作者中可验证的条目）
  try {
    const corrected = await buildMappingFromApi({ pageCount: 2 });
    if (corrected && Object.keys(corrected).length > 0) {
      return corrected;
    }
  } catch (err) {
    console.error('[FONT] API对比方案失败:', err.message);
  }

  return loadPuaMapping();
}

/**
 * 初始化字体解码器
 * 启动时加载缓存的映射表
 */
export async function initFontDecoder() {
  const db = getDb();

  // 确保缓存表存在
  db.exec(`
    CREATE TABLE IF NOT EXISTS font_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      font_hash TEXT NOT NULL UNIQUE,
      mapping_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 加载本地映射文件
  const localMapping = loadPuaMapping();
  if (Object.keys(localMapping).length > 0) {
    puaMapping = localMapping;
  }

  // 尝试加载最新缓存的字体哈希，优先使用条目更多的映射
  const latest = db.prepare(
    'SELECT font_hash, mapping_json FROM font_cache ORDER BY updated_at DESC LIMIT 1',
  ).get();
  if (latest) {
    const dbMapping = JSON.parse(latest.mapping_json);
    if (Object.keys(dbMapping).length > Object.keys(puaMapping).length) {
      currentFontHash = latest.font_hash;
      puaMapping = dbMapping;
      console.log(`[FONT] 已加载数据库映射: ${Object.keys(puaMapping).length} 条 (hash: ${currentFontHash.slice(0, 12)})`);
    } else {
      console.log(`[FONT] 使用本地文件映射: ${Object.keys(puaMapping).length} 条 (数据库仅有 ${Object.keys(dbMapping).length} 条)`);
    }
  }

  return puaMapping;
}

/**
 * 获取当前映射状态信息
 */
export function getFontStatus() {
  const mapping = loadPuaMapping();
  return {
    mappingCount: Object.keys(mapping).length,
    fontHash: currentFontHash ? currentFontHash.slice(0, 12) : null,
    hasRefBitmaps: existsSync(REF_48_PATH),
  };
}
