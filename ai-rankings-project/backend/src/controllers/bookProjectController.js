import * as projectService from '../services/bookProjectService.js';

function handleError(err, res) {
  console.error('[PROJECT]', err.message);
  res.status(500).json({ code: 500, message: err.message });
}

export function list(req, res) {
  try { res.json(projectService.listProjects()); } catch (err) { handleError(err, res); }
}

export function detail(req, res) {
  try {
    const p = projectService.getProject(Number(req.params.id));
    if (!p) return res.status(404).json({ code: 404, message: 'Project not found' });
    res.json(p);
  } catch (err) { handleError(err, res); }
}

export function create(req, res) {
  try {
    if (!req.body.title?.trim()) return res.status(400).json({ code: 400, message: 'title required' });
    res.json(projectService.createProject({
      title: req.body.title,
      description: req.body.description,
      style: req.body.style,
      cover_url: req.body.cover_url,
      outline: req.body.outline || '',
      style_profile: req.body.style_profile || '',
      outline_job_id: Number(req.body.outline_job_id) || 0,
    }));
  } catch (err) { handleError(err, res); }
}

export function update(req, res) {
  try {
    const p = projectService.updateProject(Number(req.params.id), req.body);
    if (!p) return res.status(404).json({ code: 404, message: 'Project not found' });
    res.json(p);
  } catch (err) { handleError(err, res); }
}

export function remove(req, res) {
  try {
    const r = projectService.deleteProject(Number(req.params.id));
    if (r.changes === 0) return res.status(404).json({ code: 404, message: 'Project not found' });
    res.json({ success: true });
  } catch (err) { handleError(err, res); }
}
