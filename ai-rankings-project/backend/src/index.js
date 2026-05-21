import cors from 'cors';
import cron from 'node-cron';
import express from 'express';
import { fork } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import { encryptMiddleware } from './middleware/encrypt.js';
import { initDb } from './models/database.js';
import { initFontDecoder, refreshFontMapping } from './services/fontDecoder.js';
import { seedPrompts, seedLocalRewritePrompts } from './services/promptService.js';
import { seedWordCards } from './services/wordCardService.js';
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendDist = join(__dirname, '..', '..', 'frontend', 'dist');

function syncRewritePrompts() {
  const script = join(__dirname, '..', 'sync_xingyue_rewrite_prompts.cjs');
  const child = fork(script, [], { silent: true });
  let output = '';
  child.stdout.on('data', (d) => { output += d; });
  child.on('close', (code) => {
    if (code === 0) {
      try {
        const result = JSON.parse(output.trim());
        console.log('[SYNC] 续写要求提示词同步完成:', `获取${result.fetched}, 有效${result.valid}, 新增${result.inserted}, 更新${result.updated}, 总计${result.totalRewrite}`);
      } catch { console.log('[SYNC] 续写要求提示词同步完成'); }
    } else {
      console.error('[SYNC] 续写要求提示词同步失败, exit code:', code);
    }
  });
  child.on('error', (err) => { console.error('[SYNC] 续写要求提示词同步异常:', err.message); });
}

initDb();
seedPrompts();
seedLocalRewritePrompts();
seedWordCards();

// 初始化字体解码器（加载已有映射）
initFontDecoder();
// 定时刷新字体映射（首次启动后立即运行一次）
refreshFontMapping().catch(err => console.error('[FONT] 初始刷新失败:', err.message));

// 每12小时刷新一次字体映射（番茄字体约每12小时更换）
cron.schedule('37 3,15 * * *', () => {
  refreshFontMapping().catch(err => console.error('[FONT] 定时刷新失败:', err.message));
});

// 启动后延迟同步一次续写要求提示词，之后每周一凌晨4点同步
setTimeout(syncRewritePrompts, 10000);
cron.schedule('13 4 * * 1', syncRewritePrompts);

const app = express();

app.use(cors());
app.use(express.json());
app.use(encryptMiddleware);
app.use('/api/v1', routes);

if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ name: 'AI扫榜系统', status: 'running' });
  });
}

app.use((req, res) => {
  res.status(404).json({ code: 404, message: 'Not Found' });
});

app.listen(config.port, () => {
  console.log(`[SERVER] AI扫榜后端已启动: http://localhost:${config.port}`);
});
