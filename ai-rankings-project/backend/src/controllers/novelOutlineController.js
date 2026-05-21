import { crawlNovelOutline, analyzeChaptersText, listOutlineJobs, getOutlineJob, deleteOutlineJob } from '../services/novelOutlineService.js';

export async function crawl(req, res) {
  try {
    const { url, max_chapters: maxChapters, title } = req.body || {};
    const result = await crawlNovelOutline({ url, maxChapters, title });
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 502;
    res.status(statusCode).json({
      code: statusCode,
      status: statusCode === 400 ? 'validation.failed' : 'crawler.failed',
      message: error.message || 'crawl failed',
    });
  }
}

export async function analyze(req, res) {
  try {
    const { novel_title, chapters } = req.body || {};
    const result = await analyzeChaptersText({ novelTitle: novel_title, chapters });
    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      code: statusCode,
      status: 'analyze.failed',
      message: error.message || 'analyze failed',
    });
  }
}

export function listJobs(req, res) {
  try {
    res.json(listOutlineJobs());
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
}

export function jobDetail(req, res) {
  try {
    const job = getOutlineJob(Number(req.params.id));
    if (!job) return res.status(404).json({ code: 404, message: '未找到该细纲' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
}

export function deleteJob(req, res) {
  try {
    const result = deleteOutlineJob(Number(req.params.id));
    if (result.changes === 0) return res.status(404).json({ code: 404, message: '未找到该细纲' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
}
