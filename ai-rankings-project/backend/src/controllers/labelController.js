import * as labelService from '../services/labelService.js';

export function list(req, res) {
  try {
    res.json(labelService.getLabelTree());
  } catch (err) {
    console.error('[LABEL]', err.message);
    res.json([]);
  }
}

export function flatList(req, res) {
  try {
    res.json(labelService.getAllLabels());
  } catch (err) {
    console.error('[LABEL]', err.message);
    res.json([]);
  }
}

export function create(req, res) {
  try {
    const label = labelService.createLabel(req.body);
    res.json(label);
  } catch (err) {
    console.error('[LABEL]', err.message);
    res.status(500).json({ code: 500, message: err.message });
  }
}

export function update(req, res) {
  try {
    const label = labelService.updateLabel(Number(req.params.id), req.body);
    if (!label) return res.status(404).json({ code: 404, message: 'Label not found' });
    res.json(label);
  } catch (err) {
    console.error('[LABEL]', err.message);
    res.status(500).json({ code: 500, message: err.message });
  }
}

export function remove(req, res) {
  try {
    const result = labelService.deleteLabel(Number(req.params.id));
    res.json({ changes: result.changes });
  } catch (err) {
    console.error('[LABEL]', err.message);
    res.status(500).json({ code: 500, message: err.message });
  }
}

export function getPromptLabels(req, res) {
  try {
    res.json(labelService.getLabelsForPrompt(Number(req.params.promptId)));
  } catch (err) {
    console.error('[LABEL]', err.message);
    res.json([]);
  }
}

export function setPromptLabels(req, res) {
  try {
    const labels = labelService.setPromptLabels(Number(req.params.promptId), req.body.label_ids || []);
    res.json(labels);
  } catch (err) {
    console.error('[LABEL]', err.message);
    res.status(500).json({ code: 500, message: err.message });
  }
}
