import { crawlFanqieLibrary, fetchLiveRankings } from '../services/fanqieLibraryService.js';

export async function crawl(req, res) {
  try {
    const result = await crawlFanqieLibrary(req.body || {});
    res.json(result);
  } catch (error) {
    res.status(502).json({
      code: 502,
      status: 'fanqie.crawl_failed',
      message: error.message || 'fanqie crawl failed',
    });
  }
}

export async function liveRankings(req, res) {
  try {
    const { rank_type: rankType = 'hot', limit = 20 } = req.query;
    const result = await fetchLiveRankings({ rankType, limit: Number(limit) });
    res.json(result);
  } catch (error) {
    res.status(502).json({
      code: 502,
      status: 'fanqie.live_failed',
      message: error.message || '实时榜单获取失败',
    });
  }
}