import * as writingService from '../services/writingService.js';
import { appendFileSync } from 'fs';
import { join } from 'path';

const DEBUG_LOG_PATH = join(process.cwd(), 'logs', 'writing-debug.log');

function logWriting(message, meta = {}) {
  const line = `[${new Date().toISOString()}] ${message} ${JSON.stringify(meta)}\n`;
  console.log(`[WRITING][${new Date().toISOString()}] ${message}`, meta);
  try {
    appendFileSync(DEBUG_LOG_PATH, line, 'utf8');
  } catch (error) {
    console.error('[WRITING] 写入日志失败:', error.message);
  }
}

function handleError(err, res) {
  console.error('[WRITING]', err.message);
  const status = err.message.includes('API Key') ? 400 : 500;
  res.status(status).json({ code: status, status: 'error', message: err.message, data: {} });
}

export async function generate(req, res) {
  try {
    const { theme, style, word_count: wordCount = 800, characters = [], outline = '', prompt_content: promptContent = '', tool_instruction: toolInstruction = '', linked_content: linkedContent = '', provider, model, previous_chapter_excerpt: previousChapterExcerpt = '', chapter_outlines: chapterOutlines = [], style_profile: styleProfile = '', book_outline: bookOutline = '' } = req.body;
    if (!theme && !outline) {
      return res.status(400).json({ code: 400, message: 'theme or outline is required' });
    }
    const result = await writingService.generateText({
      theme: theme || '',
      style: style || '玄幻',
      wordCount: Math.min(Math.max(Number(wordCount) || 800, 200), 5000),
      characters,
      outline: outline || '',
      promptContent,
      toolInstruction,
      linkedContent: linkedContent || '',
      provider,
      model,
      previousChapterExcerpt,
      chapterOutlines,
      styleProfile,
      bookOutline,
    });
    res.json(result);
  } catch (err) { handleError(err, res); }
}

export async function continueWrite(req, res) {
  try {
    const { context, style, word_count: wordCount = 600, characters = [], prompt_content: promptContent = '', provider, model, previous_chapter_excerpt: previousChapterExcerpt = '', chapter_outlines: chapterOutlines = [], linked_content: linkedContent = '', style_profile: styleProfile = '', book_outline: bookOutline = '' } = req.body;
    if (!context?.trim()) {
      return res.status(400).json({ code: 400, message: 'context is required' });
    }
    const result = await writingService.continueText({
      context: context.trim(),
      style: style || '玄幻',
      wordCount: Math.min(Math.max(Number(wordCount) || 600, 200), 5000),
      characters,
      promptContent,
      provider,
      model,
      previousChapterExcerpt,
      chapterOutlines,
      linkedContent,
      styleProfile,
      bookOutline,
    });
    res.json(result);
  } catch (err) { handleError(err, res); }
}

export async function expand(req, res) {
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  try {
    const { text, action = 'expand', style = '', prompt_content: promptContent = '', tool_instruction: toolInstruction = '', provider, model } = req.body;
    logWriting('expand request received', {
      requestId,
      action,
      style,
      textLength: text?.length || 0,
      promptContentLength: promptContent?.length || 0,
      toolInstructionLength: toolInstruction?.length || 0,
    });
    if (!text?.trim()) {
      logWriting('expand rejected: empty text', { requestId });
      return res.status(400).json({ code: 400, message: 'text is required' });
    }
    if (!['expand', 'polish', 'shorten', 'title'].includes(action)) {
      logWriting('expand rejected: invalid action', { requestId, action });
      return res.status(400).json({ code: 400, message: 'action must be expand, polish, shorten or title' });
    }
    const result = await writingService.expandText({ text: text.trim(), action, style, promptContent, toolInstruction, requestId, provider, model });
    logWriting('expand response ready', {
      requestId,
      resultLength: result?.text?.length || 0,
      emptyResult: !result?.text,
    });
    res.json(result);
  } catch (err) {
    logWriting('expand failed', { requestId, message: err.message, stack: err.stack });
    handleError(err, res);
  }
}

export async function summarizeChapter(req, res) {
  try {
    const { title = '', content = '', provider, model } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ code: 400, message: 'content is required' });
    }
    const result = await writingService.summarizeChapter({ title, content, provider, model });
    res.json(result);
  } catch (err) { handleError(err, res); }
}

export async function extractStyle(req, res) {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ code: 400, message: 'text is required' });
    }
    const result = await writingService.extractStyle(text.trim());
    res.json(result);
  } catch (err) { handleError(err, res); }
}

export async function parseIntent(req, res) {
  try {
    const { instruction, provider, model } = req.body;
    if (!instruction?.trim()) {
      return res.status(400).json({ code: 400, message: 'instruction is required' });
    }
    const result = await writingService.parseUserIntent({ instruction: instruction.trim(), provider, model });
    res.json(result);
  } catch (err) { handleError(err, res); }
}

export async function expandV2(req, res) {
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  try {
    const { text, action = 'expand', style = '', prompt_content: promptContent = '', tool_instruction: toolInstruction = '', provider, model, constraints, intent } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ code: 400, message: 'text is required' });
    }
    if (!['expand', 'polish', 'shorten'].includes(action)) {
      return res.status(400).json({ code: 400, message: 'action must be expand, polish or shorten' });
    }
    const result = await writingService.expandTextV2({
      text: text.trim(), action, style, promptContent, toolInstruction, requestId, provider, model, constraints, intent,
    });
    logWriting('expandV2 response ready', { requestId, candidateCount: result?.candidates?.length || 0 });
    res.json(result);
  } catch (err) {
    logWriting('expandV2 failed', { requestId, message: err.message });
    handleError(err, res);
  }
}

export async function styles(req, res) {
  res.json(writingService.getWritingStyles());
}
