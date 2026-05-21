import { getDb } from '../models/database.js';
import { analyzeChapter, analyzeChaptersFromTitles } from './aiService.js';

const DEFAULT_MAX_CHAPTERS = 5;
const MAX_CHAPTERS = 30;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&hellip;/g, '…');
}

function normalizeText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/[\s ]+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

function extractTitle(html, fallback = '') {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const titleFromMeta = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const rawTitle = h1 || titleFromMeta || titleTag || fallback;
  return stripTags(rawTitle).replace(/[-_|].*$/, '').trim().slice(0, 80) || fallback;
}

function extractReadableText(html) {
  const candidates = [
    // 常见网文站点正文容器
    /<div[^>]+class=["'][^"']*(?:chapter-content|chapter_content|content|reader|article|text|txt|novel|read)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+id=["'][^"']*(?:chapter-content|chapter_content|content|reader|article|text|txt)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<section[^>]+class=["'][^"']*(?:chapter|content|reader)[^"']*["'][^>]*>([\s\S]*?)<\/section>/i,
    /<body[^>]*>([\s\S]*?)<\/body>/i,
  ];

  for (const pattern of candidates) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const text = normalizeText(stripTags(match[1]));
      if (text.length > 100) {
        return text;
      }
    }
  }

  return normalizeText(stripTags(html));
}

function extractChapterLinks(html, pageUrl) {
  const links = [];
  const seen = new Set();
  const anchorPattern = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorPattern.exec(html))) {
    const href = match[1];
    const rawTitle = normalizeText(stripTags(match[2])).replace(/\s/g, '');
    if (!rawTitle || rawTitle.length < 2) continue;

    // 匹配章节标题：第X章、Chapter X、纯数字等
    const isChapterLike =
      /(第.{1,9}[章节回卷]|章\s*\d+|chapter\s*\d+|^\d{1,4}$|\d+[\.、])/i.test(rawTitle);

    if (!isChapterLike) continue;

    let url;
    try {
      url = new URL(href, pageUrl).toString();
    } catch {
      continue;
    }

    // 过滤锚点、JS等非HTTP链接
    if (!/^https?:\/\//i.test(url)) continue;
    if (url === pageUrl) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    links.push({ title: rawTitle, url });
  }

  return links;
}

// 规则-based后备方案：当AI不可用时使用
function summarizeFallback(chapter, index) {
  const sentences = chapter.content
    .replace(/\n+/g, '。')
    .split(/(?<=[。！？!?；;])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);
  const first = sentences[0] || chapter.content.slice(0, 80);
  const last = sentences[sentences.length - 1] || '';

  const charMap = new Map();
  const charMatches = chapter.content.match(/[一-龥]{2,4}(?=(说道|问道|看着|听见|来到|走进|出手|心中|脸色|点头|摇头))/g) || [];
  for (const name of charMatches) {
    if (/这个|那个|他们|她们|我们|你们|自己|少年|老人|男人|女人/.test(name)) continue;
    charMap.set(name, (charMap.get(name) || 0) + 1);
  }
  const characters = [...charMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([n]) => n);

  return {
    brief: first.replace(/[。！？!?；;]$/, ''),
    key_events: [first.slice(0, 120)],
    characters,
    conflict: sentences[1] || first.slice(0, 120),
    hook: last.replace(/[。！？!?；;]$/, '').slice(0, 140),
  };
}

async function summarizeChapter(chapter, index) {
  try {
    const aiResult = await analyzeChapter(chapter.title, chapter.content);
    return {
      index,
      title: chapter.title || `第${index}章`,
      url: chapter.url,
      word_count: chapter.content.length,
      brief: aiResult.brief || '',
      key_events: aiResult.key_events || [],
      characters: aiResult.characters || [],
      conflict: aiResult.conflict || '',
      hook: aiResult.hook || '',
    };
  } catch (aiError) {
    console.warn(`[OUTLINE] AI分析第${index}章失败，使用规则分析:`, aiError.message);
    const fallback = summarizeFallback(chapter, index);
    return {
      index,
      title: chapter.title || `第${index}章`,
      url: chapter.url,
      word_count: chapter.content.length,
      ...fallback,
    };
  }
}

const FANQIE_BASE = 'https://fanqienovel.com';
const FANQIE_DIRECTORY_API = `${FANQIE_BASE}/api/reader/directory/detail`;
const FANQIE_CHAPTER_API = `${FANQIE_BASE}/api/reader/book/chapter`;

let cookieJar = '';

// Playwright浏览器实例（懒加载）
let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = (async () => {
      try {
        const { chromium } = await import('playwright-core');
        return chromium.launch({
          channel: 'chrome',
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
      } catch (err) {
        console.warn('[OUTLINE] Playwright启动失败，回退到HTTP模式:', err.message);
        return null;
      }
    })();
  }
  return browserPromise;
}

async function fetchChapterWithBrowser(bookId, itemId) {
  const browser = await getBrowser();
  if (!browser) return '';
  const url = `${FANQIE_BASE}/page/${bookId}/chapter/${itemId}`;
  let page;
  try {
    page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('div[class*="content"], div[class*="chapter"], article, main', {
      timeout: 8000,
    }).catch(() => {});
    const content = await page.evaluate(() => {
      const selectors = [
        'div[class*="chapter-content"]', 'div[class*="chapterContent"]',
        'div[class*="content"]', 'div[class*="reader"]',
        'article', 'main',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim().length > 100) return el.textContent.trim();
      }
      return document.body?.textContent?.trim() || '';
    });
    return content;
  } catch (err) {
    console.warn(`[OUTLINE] Browser提取章节失败:`, err.message);
    return '';
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

function getApiHeaders(referer = FANQIE_BASE) {
  const headers = {
    'user-agent': USER_AGENT,
    accept: 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    referer,
    origin: FANQIE_BASE,
  };
  if (cookieJar) {
    headers.cookie = cookieJar;
  }
  return headers;
}

function extractBookId(url) {
  const match = url.match(/fanqienovel\.com\/page\/(\d+)/);
  return match ? match[1] : null;
}

async function fetchJson(url, headers) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw new Error(`API ${response.status}`);
  }
  // 保存响应中的cookie
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    cookieJar = setCookie.split(';')[0];
  }
  return response.json();
}

async function fetchHtml(url) {
  const headers = {
    'user-agent': USER_AGENT,
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'accept-encoding': 'gzip, deflate, br',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    referer: new URL(url).origin + '/',
  };
  if (cookieJar) {
    headers.cookie = cookieJar;
  }

  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });

  if (!response.ok) {
    throw new Error(`fetch failed: ${response.status} ${response.statusText}`);
  }

  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    cookieJar = setCookie.split(';')[0];
  }

  return response.text();
}

async function crawlChapter(link, index) {
  const html = await fetchHtml(link.url);
  const title = extractTitle(html, link.title || `第${index}章`);
  const content = extractReadableText(html);
  return {
    title,
    url: link.url,
    content,
  };
}

async function fetchChaptersViaApi(bookId, limit) {
  const headers = getApiHeaders(`${FANQIE_BASE}/page/${bookId}`);

  // 调用目录API获取章节列表
  let dirData;
  try {
    const dirRes = await fetch(`${FANQIE_DIRECTORY_API}?bookId=${bookId}`, { headers });
    if (!dirRes.ok) throw new Error(`directory API ${dirRes.status}`);
    dirData = await dirRes.json();
  } catch (err) {
    console.warn('[OUTLINE] 目录API失败:', err.message);
    return null;
  }

  if (!dirData?.data) return null;

  // 从 chapterListWithVolume 提取章节列表
  const volumeList = dirData.data.chapterListWithVolume || [];
  const allChapters = [];
  for (const volume of volumeList) {
    const keys = Object.keys(volume).filter((k) => /^\d+$/.test(k));
    for (const k of keys) {
      const ch = volume[k];
      if (ch?.itemId && ch?.title) {
        allChapters.push(ch);
      }
    }
  }

  if (!allChapters.length) return null;

  const novelTitle =
    dirData.data.bookName ||
    dirData.data.novelName ||
    dirData.data.name ||
    '';

  // 取前 limit 章（番茄反爬严格，跳过正文提取，仅获取标题供AI分析）
  const selected = allChapters.slice(0, limit);
  const chapters = selected.map(ch => ({
    title: ch.title,
    url: `${FANQIE_BASE}/page/${bookId}/chapter/${ch.itemId}`,
    content: '',
  }));

  console.log(`[OUTLINE] 目录API获取到 ${chapters.length} 个章节标题`);
  return { novelTitle, chapters };
}

function saveOutlineJob({ novelTitle, sourceUrl, chapters }) {
  const db = getDb();
  const insertJob = db.prepare(`
    INSERT INTO novel_outline_job (novel_title, source_url, chapter_count)
    VALUES (?, ?, ?)
  `);
  const insertChapter = db.prepare(`
    INSERT INTO novel_chapter_outline (
      job_id, chapter_index, title, url, word_count, brief, key_events, characters, conflict, hook
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return db.transaction(() => {
    const job = insertJob.run(novelTitle, sourceUrl, chapters.length);
    for (const chapter of chapters) {
      insertChapter.run(
        job.lastInsertRowid,
        chapter.index,
        chapter.title,
        chapter.url,
        chapter.word_count,
        chapter.brief,
        JSON.stringify(chapter.key_events),
        JSON.stringify(chapter.characters),
        chapter.conflict,
        chapter.hook,
      );
    }
    return Number(job.lastInsertRowid);
  })();
}

export async function analyzeChaptersText({ novelTitle, chapters }) {
  if (!chapters || !chapters.length) {
    const error = new Error('至少需要提供一个章节');
    error.statusCode = 400;
    throw error;
  }

  const title = novelTitle || '未命名小说';
  const results = [];

  for (let i = 0; i < chapters.length; i += 1) {
    const ch = chapters[i];
    const content = (ch.content || '').trim();
    if (!content) {
      results.push({
        index: i + 1,
        title: ch.title || `第${i + 1}章`,
        url: '',
        word_count: 0,
        brief: '本章内容为空',
        key_events: [],
        characters: [],
        conflict: '无',
        hook: '无',
      });
      continue;
    }

    const chapterData = {
      title: ch.title || `第${i + 1}章`,
      url: ch.url || '',
      content,
    };
    results.push(await summarizeChapter(chapterData, i + 1));
  }

  const jobId = saveOutlineJob({
    novelTitle: title,
    sourceUrl: '',
    chapters: results,
  });

  return {
    job_id: jobId,
    novel_title: title,
    source_url: '',
    chapter_count: results.length,
    chapters: results,
  };
}

export function listOutlineJobs() {
  const db = getDb();
  const jobs = db.prepare(`
    SELECT j.*,
      (SELECT COUNT(*) FROM novel_chapter_outline WHERE job_id = j.id) AS chapter_count
    FROM novel_outline_job j
    ORDER BY j.created_at DESC
  `).all();
  return jobs;
}

export function getOutlineJob(id) {
  const db = getDb();
  const job = db.prepare('SELECT * FROM novel_outline_job WHERE id = ?').get(id);
  if (!job) return null;
  const chapters = db.prepare(
    'SELECT * FROM novel_chapter_outline WHERE job_id = ? ORDER BY chapter_index'
  ).all(id);
  // 解析 JSON 字段
  for (const ch of chapters) {
    try { ch.key_events = JSON.parse(ch.key_events || '[]'); } catch { ch.key_events = []; }
    try { ch.characters = JSON.parse(ch.characters || '[]'); } catch { ch.characters = []; }
  }
  return { ...job, chapters };
}

export function deleteOutlineJob(id) {
  const db = getDb();
  return db.transaction(() => {
    db.prepare('DELETE FROM novel_chapter_outline WHERE job_id = ?').run(id);
    return db.prepare('DELETE FROM novel_outline_job WHERE id = ?').run(id);
  })();
}

export async function crawlNovelOutline({ url, maxChapters = DEFAULT_MAX_CHAPTERS, title: providedTitle = '' }) {
  if (!url) {
    const error = new Error('url is required');
    error.statusCode = 400;
    throw error;
  }

  let startUrl;
  try {
    startUrl = new URL(url).toString();
  } catch {
    const error = new Error('url must be a valid http(s) URL');
    error.statusCode = 400;
    throw error;
  }

  if (!/^https?:\/\//i.test(startUrl)) {
    const error = new Error('url must be a valid http(s) URL');
    error.statusCode = 400;
    throw error;
  }

  const limit = Math.min(Math.max(Number(maxChapters) || DEFAULT_MAX_CHAPTERS, 1), MAX_CHAPTERS);

  // 优先尝试番茄小说API获取目录和内容
  const bookId = extractBookId(startUrl);
  let novelTitle = '';
  let chapterList = [];

  if (bookId) {
    const apiResult = await fetchChaptersViaApi(bookId, limit);
    if (apiResult && apiResult.chapters.length) {
      novelTitle = apiResult.novelTitle;
      chapterList = apiResult.chapters;
      console.log(`[OUTLINE] 通过API获取到 ${chapterList.length} 个章节`);
    }
  }

  // API失败时降级到HTML抓取
  if (!chapterList.length) {
    const html = await fetchHtml(startUrl);
    novelTitle = extractTitle(html, '未命名小说');
    const links = extractChapterLinks(html, startUrl);
    chapterList = links.length
      ? links.slice(0, limit)
      : [{ title: novelTitle, url: startUrl, content: '' }];
  }

  if (!novelTitle) novelTitle = providedTitle || '未命名小说';

  // 检查哪些章节有正文
  const hasContent = chapterList.some((ch) => ch.content && ch.content.length > 0);

  let chapters;
  if (hasContent) {
    // 有正文的章节用AI逐个分析
    chapters = [];
    for (let index = 0; index < chapterList.length; index += 1) {
      const link = chapterList[index];
      const chapter = link.content !== undefined
        ? link
        : await crawlChapter(link, index + 1);
      chapters.push(await summarizeChapter(chapter, index + 1));
    }
  } else {
    // 无正文时，使用AI基于标题+书籍信息推断章节内容
    console.log(`[OUTLINE] 正文提取失败，使用AI基于标题分析 ${chapterList.length} 章`);
    const titles = chapterList.map((ch) => ch.title);

    // 查找书籍背景信息
    let bookInfo = { title: novelTitle, author: '', category: '', intro: '', aiAnalysis: '' };

    // 从本地数据库查找
    if (bookId) {
      const db = getDb();
      const localBook = db.prepare('SELECT * FROM book WHERE book_url LIKE ? LIMIT 1').get(`%${bookId}%`);
      if (localBook) {
        bookInfo = {
          title: localBook.title || novelTitle,
          author: localBook.author || '',
          category: localBook.subcategory || '',
          intro: localBook.intro || '',
          aiAnalysis: (() => {
            try { return JSON.parse(localBook.analysis || '{}').ai_analysis || ''; } catch { return ''; }
          })(),
        };
      }
    }

    // AI基于标题分析
    let aiResults;
    try {
      aiResults = await analyzeChaptersFromTitles(bookInfo, titles);
    } catch (err) {
      console.warn('[OUTLINE] AI标题分析失败:', err.message);
      aiResults = titles.map((title, i) => ({
        chapter_index: i + 1,
        title,
        brief: 'AI分析暂不可用',
        key_events: [],
        characters: [],
        conflict: '',
        hook: '',
      }));
    }

    chapters = aiResults.map((r, i) => ({
      index: r.chapter_index || i + 1,
      title: r.title || titles[i] || `第${i + 1}章`,
      url: chapterList[i]?.url || '',
      word_count: 0,
      brief: r.brief || '',
      key_events: r.key_events || [],
      characters: r.characters || [],
      conflict: r.conflict || '',
      hook: r.hook || '',
    }));
  }

  const jobId = saveOutlineJob({ novelTitle, sourceUrl: startUrl, chapters });

  return {
    job_id: jobId,
    novel_title: novelTitle,
    source_url: startUrl,
    chapter_count: chapters.length,
    chapters,
  };
}
