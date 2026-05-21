import * as creativeToolService from '../services/creativeToolService.js';

function handleError(err, res) {
  console.error('[CREATIVE]', err.message);
  const status = err.message.includes('API Key') ? 400 : 500;
  res.status(status).json({ code: status, status: 'error', message: err.message, data: {} });
}

export function listModels(req, res) {
  try {
    res.json(creativeToolService.listModels());
  } catch (err) { handleError(err, res); }
}

export function list(req, res) {
  try {
    res.json(creativeToolService.getToolList());
  } catch (err) { handleError(err, res); }
}

export async function generate(req, res) {
  try {
    const { tool_key: toolKey, ...params } = req.body;
    if (!toolKey) {
      return res.status(400).json({ code: 400, message: 'tool_key is required' });
    }
    const result = await creativeToolService.generateTool(toolKey, params);
    res.json(result);
  } catch (err) { handleError(err, res); }
}

export async function refine(req, res) {
  try {
    const { tool_key: toolKey, original_data, mode, direction, extra_instruction } = req.body;
    if (!toolKey) {
      return res.status(400).json({ code: 400, message: 'tool_key is required' });
    }
    const result = await creativeToolService.refineOutline(toolKey, { original_data, mode, direction, extra_instruction });
    res.json(result);
  } catch (err) { handleError(err, res); }
}

export async function split(req, res) {
  try {
    const { tool_key: toolKey, original_data, mode, direction, split_count, extra_instruction } = req.body;
    if (!toolKey) {
      return res.status(400).json({ code: 400, message: 'tool_key is required' });
    }
    const result = await creativeToolService.splitOutline(toolKey, { original_data, mode, direction, split_count, extra_instruction });
    res.json(result);
  } catch (err) { handleError(err, res); }
}

export async function generateSceneCards(req, res) {
  try {
    const { tool_key: toolKey, chapter_data, extra_instruction } = req.body;
    if (!toolKey) {
      return res.status(400).json({ code: 400, message: 'tool_key is required' });
    }
    const result = await creativeToolService.generateSceneCards(toolKey, { chapter_data, extra_instruction });
    res.json(result);
  } catch (err) { handleError(err, res); }
}

export async function generateTaskSheet(req, res) {
  try {
    const { tool_key: toolKey, chapter_data, extra_instruction } = req.body;
    if (!toolKey) {
      return res.status(400).json({ code: 400, message: 'tool_key is required' });
    }
    const result = await creativeToolService.generateTaskSheet(toolKey, { chapter_data, extra_instruction });
    res.json(result);
  } catch (err) { handleError(err, res); }
}

export async function assessQuality(req, res) {
  try {
    const { tool_key: toolKey, chapter_data, extra_instruction } = req.body;
    if (!toolKey) {
      return res.status(400).json({ code: 400, message: 'tool_key is required' });
    }
    const result = await creativeToolService.assessChapterQuality(toolKey, { chapter_data, extra_instruction });
    res.json(result);
  } catch (err) { handleError(err, res); }
}

export async function generateSingleChapter(req, res) {
  try {
    const { tool_key: toolKey, ...params } = req.body;
    if (!toolKey) {
      return res.status(400).json({ code: 400, message: 'tool_key is required' });
    }
    const result = await creativeToolService.generateSingleChapter(toolKey, params);
    res.json(result);
  } catch (err) { handleError(err, res); }
}