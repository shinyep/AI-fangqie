import { getDb, initDb } from './database.js';

initDb();

const db = getDb();

db.exec(`
  DELETE FROM novel_chapter_outline;
  DELETE FROM novel_outline_job;
  DELETE FROM hot_news;
  DELETE FROM news_source;
  DELETE FROM inspiration;
  DELETE FROM hot_word;
  DELETE FROM subcategory_stat;
  DELETE FROM book;
  DELETE FROM ai_category;
  DELETE FROM rank_type;
  DELETE FROM sqlite_sequence WHERE name IN (
    'novel_chapter_outline',
    'novel_outline_job',
    'hot_news',
    'news_source',
    'inspiration',
    'hot_word',
    'subcategory_stat',
    'book',
    'ai_category',
    'rank_type'
  );
`);

// --- 榜单类型 ---
const rankTypes = [
  { type_key: 'hot', label: '热门榜', icon: 'fire-o', sort_order: 1 },
  { type_key: 'new', label: '新书榜', icon: 'star-o', sort_order: 2 },
  { type_key: 'finished', label: '完结榜', icon: 'checked', sort_order: 3 },
  { type_key: 'recommend', label: '推荐榜', icon: 'thumb-circle-o', sort_order: 4 },
  { type_key: 'click', label: '点击榜', icon: 'eye-o', sort_order: 5 },
  { type_key: 'collect', label: '收藏榜', icon: 'bookmark-o', sort_order: 6 },
  { type_key: 'male_reading', label: '男频阅读榜', icon: 'fire-o', sort_order: 7 },
  { type_key: 'female_reading', label: '女频阅读榜', icon: 'star-o', sort_order: 8 }
];

const insertRankType = db.prepare(
  'INSERT OR REPLACE INTO rank_type (type_key, label, icon, sort_order) VALUES (?, ?, ?, ?)'
);
for (const rt of rankTypes) {
  insertRankType.run(rt.type_key, rt.label, rt.icon, rt.sort_order);
}
console.log('[SEED] 榜单类型已插入');

// --- 分类数据 ---
const categories = [
  { name: '男频', children: ['都市', '玄幻', '仙侠', '历史', '军事', '游戏', '科幻', '悬疑', '轻小说'] },
  { name: '女频', children: ['古代言情', '现代言情', '仙侠奇缘', '浪漫青春', '玄幻言情', '科幻空间', '游戏竞技'] }
];

const insertCat = db.prepare('INSERT INTO ai_category (name, parent_id, sort_order) VALUES (?, ?, ?)');
const getCatId = db.prepare('SELECT id FROM ai_category WHERE name = ? AND parent_id = ?');

let sort = 1;
for (const cat of categories) {
  insertCat.run(cat.name, 0, sort++);
  const parent = getCatId.get(cat.name, 0);
  let childSort = 1;
  for (const child of cat.children) {
    insertCat.run(child, parent.id, childSort++);
  }
}
console.log('[SEED] 分类数据已插入');

// --- 书籍模拟数据（按榜单类型分配） ---
const books = [
  // 热门榜 - 都市
  { title: '我不是戏神', author: '三九音域', intro: '少年在神秘剧场中获得扮演规则，以戏命对抗现实崩塌。', subcategory: '都市高武', rank_type: 'hot', rank_position: 1, heat_score: 99.5, read_count: 5758000, word_count: 4007000, status: 'finished', selling_points: ['身份扮演', '规则悬疑', '强反转'], core_hook: '把“演戏”变成战斗机制，每次登台都推动身份谜题。' },
  { title: '十日终焉', author: '杀虫队队员', intro: '十日循环、死亡游戏与群像博弈交织，主角在规则缝隙中寻找终局。', subcategory: '悬疑脑洞', rank_type: 'hot', rank_position: 2, heat_score: 97.2, read_count: 2874000, word_count: 3201000, status: 'finished', selling_points: ['循环求生', '群像博弈', '规则解谜'], core_hook: '用倒计时压迫读者，每轮失败都给下一轮留下信息差。' },
  { title: '时候起手，邪神也得给我跪下！', author: '六个葫芦', intro: '主角用民俗禁忌和反套路仪式硬刚邪神，恐怖外壳下持续爽点释放。', subcategory: '都市高武', rank_type: 'hot', rank_position: 3, heat_score: 95.8, read_count: 2457000, word_count: 1839000, status: 'serial', selling_points: ['民俗克系', '反套路仪式', '越级打脸'], core_hook: '把邪神压迫感转化成主角拆局爽感，章节末持续抛新禁忌。' },
  { title: '入伍四次！我被原部队拉进黑名单', author: '朝朝和', intro: '硬核军旅与轻喜剧结合，主角靠离谱履历刷新部队认知。', subcategory: '都市脑洞', rank_type: 'hot', rank_position: 4, heat_score: 94.1, read_count: 1609000, word_count: 306000, status: 'serial', selling_points: ['军旅反差', '履历爽点', '轻喜剧'], core_hook: '用“又被拉回部队”的反复结构制造笑点和升级感。' },
  { title: '我在精神病院学斩神', author: '三九音域', intro: '少年在精神病院接触神明代理人，都市异能与神话体系并行推进。', subcategory: '都市高武', rank_type: 'hot', rank_position: 5, heat_score: 93.0, read_count: 1531000, word_count: 4264000, status: 'finished', selling_points: ['神明代理', '小队成长', '都市守夜'], core_hook: '用精神病院作为神话入口，现实任务和神格悬念双线驱动。' },
  { title: '天眼风水师', author: '追之光', intro: '主角开天眼辨风水、破局势，在都市日常中切入玄学爽点。', subcategory: '都市日常', rank_type: 'hot', rank_position: 6, heat_score: 91.5, read_count: 1527000, word_count: 1224000, status: 'finished', selling_points: ['风水鉴宝', '都市奇遇', '单元破局'], core_hook: '每个委托都是一个可视化谜题，结尾反转揭开人心。' },
  { title: '开局长生万古，苟到天荒地老', author: '紫灵风雪', intro: '长生者以苟道心态穿越岁月，用时间差碾压强敌。', subcategory: '玄幻脑洞', rank_type: 'hot', rank_position: 7, heat_score: 90.2, read_count: 1494000, word_count: 6081000, status: 'finished', selling_points: ['长生流', '苟道升级', '岁月史诗'], core_hook: '把时间当金手指，靠时代变迁制造宏大爽感。' },
  { title: '每天六千万，只能在县城花？', author: '凤失凰', intro: '神豪额度被限制在县城消费，主角用小地方撬动大资源。', subcategory: '都市脑洞', rank_type: 'hot', rank_position: 8, heat_score: 88.7, read_count: 1239000, word_count: 327000, status: 'serial', selling_points: ['限制神豪', '县城经营', '反差消费'], core_hook: '限制条件让神豪文有了策略感，每次花钱都要解决现实约束。' },
  // 新书榜
  { title: '这个修仙过于硬核', author: '冷月', intro: '把科学带进修仙世界', subcategory: '仙侠', rank_type: 'new', rank_position: 1, heat_score: 88.0, read_count: 531000, selling_points: ['科学修仙', '硬核设定'], core_hook: '用实验室逻辑解释灵气体系。' },
  { title: '我有一座恐怖屋', author: '我会修空调', intro: '午夜时分，恐怖屋开门营业', subcategory: '悬疑', rank_type: 'new', rank_position: 2, heat_score: 85.3 },
  { title: '学霸的黑科技系统', author: '晨星LL', intro: '数学物理黑科技改变世界', subcategory: '科幻', rank_type: 'new', rank_position: 3, heat_score: 83.0 },
  // 完结榜
  { title: '诡秘之主', author: '爱潜水的乌贼', intro: '愚者座下，诡秘之上', subcategory: '悬疑', rank_type: 'finished', rank_position: 1, heat_score: 96.0 },
  { title: '牧神记', author: '宅猪', intro: '天地为棋局，众生为棋子', subcategory: '玄幻', rank_type: 'finished', rank_position: 2, heat_score: 92.5 },
  // 推荐榜
  { title: '绍宋', author: '榴弹怕水', intro: '从赵构开始改写大宋命运', subcategory: '历史', rank_type: 'recommend', rank_position: 1, heat_score: 90.0 },
  { title: '秦吏', author: '七月新番', intro: '穿越大秦当小吏', subcategory: '历史', rank_type: 'recommend', rank_position: 2, heat_score: 88.5 },
  // 点击榜
  { title: '我在斩妖司除魔三十年', author: '尘寰', intro: '三十年斩妖，无人知我姓名', subcategory: '仙侠', rank_type: 'click', rank_position: 1, heat_score: 95.5 },
  { title: '轮回乐园', author: '那一只蚊子', intro: '无尽轮回，杀戮求生', subcategory: '轻小说', rank_type: 'click', rank_position: 2, heat_score: 92.0 },
  // 收藏榜
  { title: '深空彼岸', author: '辰东', intro: '在星空中追寻彼岸的故事', subcategory: '科幻', rank_type: 'collect', rank_position: 1, heat_score: 94.8 },
  { title: '灵境行者', author: '卖报小郎君', intro: '灵境世界，行者无疆', subcategory: '玄幻', rank_type: 'collect', rank_position: 2, heat_score: 91.2 }
];

const insertBook = db.prepare(`
  INSERT INTO book (
    title, author, cover_url, book_url, intro, subcategory, rank_type, rank_position,
    heat_score, word_count, read_count, status, tags, selling_points, core_hook, analysis
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((items) => {
  for (const b of items) {
    const wordCount = b.word_count || Math.floor(Math.random() * 3000000) + 200000;
    const status = b.status || (b.rank_type === 'finished' ? 'finished' : 'serial');
    const tags = JSON.stringify(b.tags || (b.subcategory ? [b.subcategory] : []));
    const sellingPoints = b.selling_points || ['强目标', '快节奏', '高反馈'];
    const analysis = {
      audience: b.subcategory.includes('女') ? '偏女性向题材读者' : '男频爽文读者',
      opening: b.core_hook || '前三章需要快速给出目标、限制和即时反馈。',
      write_tip: `${b.subcategory}题材适合用清晰升级线和章末悬念保持追读。`,
    };
    insertBook.run(
      b.title,
      b.author,
      b.cover_url || '',
      b.book_url || '',
      b.intro,
      b.subcategory,
      b.rank_type,
      b.rank_position,
      b.heat_score,
      wordCount,
      b.read_count || Math.round(b.heat_score * 10000),
      status,
      tags,
      JSON.stringify(sellingPoints),
      b.core_hook || sellingPoints.join('、'),
      JSON.stringify(analysis),
    );
  }
});
insertMany(books);
console.log(`[SEED] ${books.length} 本书籍已插入`);

// --- 子分类统计 ---
const insertStat = db.prepare('INSERT INTO subcategory_stat (rank_type, subcategory, book_count) VALUES (?, ?, ?)');
const stats = [
  { rt: 'hot', sc: '都市', count: 2 },
  { rt: 'hot', sc: '玄幻', count: 2 },
  { rt: 'hot', sc: '仙侠', count: 2 },
  { rt: 'hot', sc: '科幻', count: 1 },
  { rt: 'hot', sc: '游戏', count: 1 },
  { rt: 'new', sc: '仙侠', count: 1 },
  { rt: 'new', sc: '悬疑', count: 1 },
  { rt: 'new', sc: '科幻', count: 1 },
  { rt: 'finished', sc: '悬疑', count: 1 },
  { rt: 'finished', sc: '玄幻', count: 1 },
  { rt: 'recommend', sc: '历史', count: 2 },
  { rt: 'click', sc: '仙侠', count: 1 },
  { rt: 'click', sc: '轻小说', count: 1 },
  { rt: 'collect', sc: '科幻', count: 1 },
  { rt: 'collect', sc: '玄幻', count: 1 }
];
for (const s of stats) {
  insertStat.run(s.rt, s.sc, s.count);
}
console.log('[SEED] 分类统计已插入');

// --- 热词 ---
const hotWords = [
  { word: '修仙', rank_type: 'hot', count: 35 },
  { word: '重生', rank_type: 'hot', count: 28 },
  { word: '穿越', rank_type: 'hot', count: 25 },
  { word: '系统', rank_type: 'hot', count: 22 },
  { word: '打脸', rank_type: 'hot', count: 20 },
  { word: '无敌', rank_type: 'hot', count: 18 },
  { word: '爽文', rank_type: 'hot', count: 16 },
  { word: '逆袭', rank_type: 'hot', count: 14 },
  { word: '签到', rank_type: 'new', count: 15 },
  { word: '末日', rank_type: 'new', count: 12 },
  { word: '黑科技', rank_type: 'new', count: 10 },
  { word: '大佬', rank_type: 'finished', count: 20 },
  { word: '经典', rank_type: 'finished', count: 18 }
];
const insertHotWord = db.prepare('INSERT INTO hot_word (word, rank_type, count) VALUES (?, ?, ?)');
for (const hw of hotWords) {
  insertHotWord.run(hw.word, hw.rank_type, hw.count);
}
console.log('[SEED] 热词已插入');

// --- 灵感 ---
const inspirations = [
  { title: '[都市高武] 《我是武道宗师》', content: '一个普通大学生意外获得武道系统，在都市中开启修炼之路。他白天上课，晚上除魔，在学校与江湖之间游走，最终成为一代宗师。', rank_type: 'hot', subcategory: '都市' },
  { title: '[玄幻仙侠] 《剑道独尊》', content: '少年叶尘，天生废脉，却意外获得上古剑帝传承。从此一剑在手，天下我有。他誓要找出当年灭门真相，踏平九天十地。', rank_type: 'hot', subcategory: '仙侠' },
  { title: '[科幻末日] 《废土拾荒者》', content: '核战争后，世界沦为废土。主角在废墟中发现了一个神秘数据库，里面储存着人类文明的最后火种。', rank_type: 'hot', subcategory: '科幻' },
  { title: '[悬疑灵异] 《404号档案》', content: '档案管理员发现了一批被封存的神秘档案，每一份都记录着一个未解之谜。随着调查深入，他发现自己也被卷入其中。', rank_type: 'new', subcategory: '悬疑' },
  { title: '[历史架空] 《大秦说书人》', content: '穿越到秦始皇时期，他只想做个说书人混口饭吃。谁知随口说出的故事，竟引得秦始皇亲自登门。', rank_type: 'recommend', subcategory: '历史' }
];
const insertInspiration = db.prepare('INSERT INTO inspiration (title, content, rank_type, subcategory) VALUES (?, ?, ?, ?)');
for (const ins of inspirations) {
  insertInspiration.run(ins.title, ins.content, ins.rank_type, ins.subcategory);
}
console.log('[SEED] 灵感已插入');

// --- 新闻来源 ---
const newsSources = [
  { name: '抖音', source_key: 'douyin' },
  { name: '微博', source_key: 'weibo' },
  { name: '今日头条', source_key: 'toutiao' },
  { name: '百度', source_key: 'baidu' },
  { name: 'B站', source_key: 'bilibili' }
];
const insertSource = db.prepare('INSERT OR REPLACE INTO news_source (name, source_key) VALUES (?, ?)');
for (const ns of newsSources) {
  insertSource.run(ns.name, ns.source_key);
}
console.log('[SEED] 新闻来源已插入');

// --- 热门新闻 ---
const today = new Date().toISOString().split('T')[0];
const hotNewsItems = [
  { title: 'AI写作工具助力网络文学创作新浪潮', source: 'toutiao', hot_index: 9500, news_date: today },
  { title: '2026年最受欢迎网络小说TOP10出炉', source: 'weibo', hot_index: 8700, news_date: today },
  { title: '知名作家谈AI对网文行业的影响', source: 'douyin', hot_index: 8200, news_date: today },
  { title: '新书《我在修仙界搞科研》火爆全网', source: 'bilibili', hot_index: 7600, news_date: today },
  { title: '百度小说热搜榜今日更新', source: 'baidu', hot_index: 7100, news_date: today }
];
const insertNews = db.prepare('INSERT INTO hot_news (title, source, hot_index, news_date) VALUES (?, ?, ?, ?)');
for (const hn of hotNewsItems) {
  insertNews.run(hn.title, hn.source, hn.hot_index, hn.news_date);
}
console.log('[SEED] 热门新闻已插入');

console.log('[SEED] ✅ 全部种子数据导入完成');
