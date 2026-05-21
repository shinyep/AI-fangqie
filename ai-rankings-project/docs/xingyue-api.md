# Ai智能写作系统 API 对接技术文档

## 概述

Ai智能写作系统（xingyuexiezuo.com）提供 AI 扫榜相关的 API，用于获取番茄小说（fanqienovel.com）的排行榜数据。该 API 返回的书籍数据**不含 PUA 字体编码**，文本可直接阅读。

本项目在 `rank_type` 为 `male_reading` 或 `female_reading` 时，通过后端代理调用Ai智能写作系统 API，获取干净数据返回前端。

---

## API 基础信息

| 项目 | 值 |
|------|-----|
| 基础 URL | `https://c.xingyuexiezuo.com/api/v1` |
| 认证方式 | `Authorization: Bearer <token>` |
| 加密方式 | AES-128-CBC（与项目共用密钥） |
| 响应格式 | `{ code, status, message, data: { encoded: "<base64>" } }` |
| 加密密钥 | `chloefuckityoall`（16字节 Key） |
| 加密 IV | `9311019310287172`（16字节 IV） |

### 服务器列表

从 `https://xingyuexiezuo.com/server_urls.json` 获取：
```json
[
  "https://c.xingyuexiezuo.com/api",
  "https://v1.xingyuexiezuo.com/api",
  "https://v2.xingyuexiezuo.com/api",
  "https://v3.xingyuexiezuo.com/api",
  "https://v4.xingyuexiezuo.com/api",
  "https://v5.xingyuexiezuo.com/api"
]
```

所有服务器共享同一套鉴权和加密。当前使用 `c.xingyuexiezuo.com`。

---

## 认证机制

### Token 结构

Token 格式为自签 JWT（非标准签名）：

```
Bearer eyJ0eXAiOiJqd3QifQ.<payload>.<hex_signature>
```

Payload 解码示例：
```json
{
  "sub": "1",
  "iss": "http://:",
  "exp": 1781147831,
  "iat": 1778555831,
  "nbf": 1778555831,
  "hash": "",
  "uid": 687279,
  "s": "lIsKgs",
  "jti": "51069043572ab6957a2bbadd6cccd213"
}
```

### Token 存储

| 位置 | 说明 |
|------|------|
| `backend/xingyue_config.json` | 生产配置文件，后端启动时读取 |
| `xingyueService.js` 内存 | 模块级缓存，首次读取后常驻 |

### Token 生命周期

- **有效期**：约 30 天（从 `iat` 到 `exp`）
- **过期表现**：API 返回 HTTP 401，前端不显示数据
- **更新方式**：
  - API: `POST /api/v1/xingyue/config`（无需重启）
  - 文件: 直接编辑 `xingyue_config.json` 后重启后端

### 获取新 Token 步骤

1. Chrome 浏览器登录 https://xingyuexiezuo.com
2. 进入 AI扫榜页面，点击任意分类触发 API 请求
3. F12 → Console 运行以下脚本捕获 Bearer token：
```javascript
const orig = XMLHttpRequest.prototype.setRequestHeader;
XMLHttpRequest.prototype.setRequestHeader = function(n, v) {
  if (n === 'Authorization') console.log('TOKEN:', v);
  return orig.apply(this, arguments);
};
```
4. 替换 `xingyue_config.json` 中的 `token` 和 `expires_at` 字段

---

## API 端点清单

### 1. 排行榜分页数据

```
GET /api/v1/ai-rankings/total
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `rank_type` | string | 是 | 榜单类型，如 `male_reading`、`female_reading` |
| `page` | int | 否 | 页码，默认 1 |
| `per_page` | int | 否 | 每页数量，默认 30 |
| `platform` | string | 否 | 平台，固定 `fanqie` |

**已知 rank_type 值：**

| 值 | 中文名 | 说明 |
|-----|--------|------|
| `male_reading` | 男频阅读榜 | 番茄男频书籍阅读排行 |

**响应结构：**
```json
{
  "current_page": 1,
  "total": 1500,
  "data": [
    {
      "id": 4602,
      "book_id": "7276384138653862966",
      "book_name": "我不是戏神",
      "author": "三九音域",
      "abstract": "《斩神》作家三九音域全新力作 | ...",
      "read_count": "5763962",
      "word_count": "4003607",
      "status": "已完结",
      "cover_url": "https://cdn.xingyuexiezuo.com/covers/...",
      "rank_type": "男频阅读榜",
      "subcategory": "都市高武",
      "rank_position": 1,
      "paid_chapters_count": 0,
      "ai_analysis": "### 1. 金手指\n...",
      "created_at": "2025-07-22 23:23:38",
      "updated_at": "2026-05-12 01:29:36"
    }
  ]
}
```

**状态枚举：**
| API 值 | 映射到本地 |
|--------|------------|
| `"已完结"` | `"finished"` |
| 其他 / 空 | `"serial"` |

---

### 2. 榜单分类列表

```
GET /api/v1/ai-rankings/categories
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `platform` | string | 是 | `fanqie` |
| `rank_type` | string | 是 | 榜单类型 |

**响应结构：**
```json
[
  { "name": "都市脑洞", "value": "都市脑洞" },
  { "name": "都市高武", "value": "都市高武" },
  { "name": "东方仙侠", "value": "东方仙侠" }
]
```

当前男频阅读榜共有 **19 个分类**：都市脑洞、男频衍生、都市高武、玄幻脑洞、都市日常、动漫衍生、历史脑洞、都市种田、东方仙侠、历史古代、抗战谍战、都市修真、游戏体育、悬疑脑洞、科幻末世、传统玄幻、悬疑灵异、西方奇幻、战神赘婿。

---

### 3. 分类书籍统计

```
GET /api/v1/ai-rankings/category-totals
```

**参数：** 同 `/categories`

**响应结构：**
```json
[
  { "subcategory": "都市高武", "book_count": 42, "read_count": 5823401 },
  { "subcategory": "东方仙侠", "book_count": 35, "read_count": 3102394 }
]
```

注意：此端点响应字段使用英文 key（`subcategory`），与 `/categories` 端点（`name/value`）不同。

---

### 4. 分类热词

```
GET /api/v1/ai-rankings/hot-words
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `rank_type` | string | 是 | 榜单类型 |
| `subcategory` | string | **是** | 分类名，如 `东方仙侠` |
| `platform` | string | 否 | `fanqie` |
| `limit` | int | 否 | 返回数量，默认 20 |

**重要**：`subcategory` 为必填参数，不传会返回 400 错误。在 live 接口中，服务层会使用第一个分类获取热词。

---

### 5. 创作灵感

```
GET /api/v1/ai-rankings/inspiration
```

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `rank_type` | string | 是 | 榜单类型 |
| `subcategory` | string | 否 | 分类名 |

---

### 6. 公开接口（无需认证）

```
GET /api/v1/public/list?is_featured=0
GET /api/v1/categories
GET /api/v1/init
GET /api/v1/ping
```

这些端点无需 Bearer token，但数据量有限（`public/list` 仅返回 ~25 本精选书籍）。

---

## 本项目对接架构

### 文件清单

| 文件 | 职责 |
|------|------|
| `backend/xingyue_config.json` | Token 和过期时间配置 |
| `backend/src/services/xingyueService.js` | 核心服务：HTTP 调用、解密、字段映射 |
| `backend/src/controllers/xingyueController.js` | Express 控制器：参数校验、错误处理 |
| `backend/src/routes/xingyue.js` | 路由定义：`/api/v1/xingyue/*` |
| `backend/src/controllers/aiRankController.js` | 现有排行控制器，xingyue 类型代理 |
| `frontend/src/api/xingyueRankings.js` | 前端 API 封装模块 |
| `frontend/src/views/Home.vue` | 工作台首页，xingyue 类型调用新 API |

### 数据流

```
浏览器
  │
  ├── 选择"男频阅读榜" → Home.vue
  │     └── fetchXingyueLiveData() → GET /api/v1/xingyue/live
  │           └── xingyueController.live()
  │                 └── xingyueService.fetchLiveData()
  │                       ├── callXingyueApi('/v1/ai-rankings/total', ...)
  │                       ├── callXingyueApi('/v1/ai-rankings/categories', ...)
  │                       └── callXingyueApi('/v1/ai-rankings/hot-words', ...)
  │                             │
  │                             ├── HTTP GET xingyuexiezuo.com
  │                             ├── 解密 AES 响应（与本地共用密钥）
  │                             └── mapXingyueBook() 字段映射
  │                                   │
  │                                   └── 返回 BookCard 兼容格式
  │
  └── 选择"男频阅读榜" → Rankings.vue
        └── fetchRankings() → GET /api/v1/ai-rankings
              └── aiRankController.rankings()
                    └── isXingyueType(rankType) === true
                          └── xingyueService.fetchRankingsTotal()
```

### 星月数据辅助 PUA 解码

星月 API 返回的干净中文不仅用于 xingyue 类型榜单的直接展示，还被用于**辅助解码非星月类型**（hot/new/finished 等）的 PUA 乱码：

1. 从星月 API 获取 `male_reading` 的 30 本书（干净文本）
2. 从 fanqienovel.com API 获取热门榜书籍（PUA 编码文本）
3. 按 `book_id` 匹配同一本书在两个数据源中的版本
4. 逐字符对齐 intro/title/author，建立 `PUA码点 → 真实汉字` 的映射
5. 将映射写入 `pua_mapping.json`，供 `fontDecoder.decodePuaText()` 使用

此流程可定期执行以扩展映射覆盖率。当前映射约 306 条，覆盖 title/author 100%、intro ~95%。

### 字段映射规则

`xingyueService.js` 中的 `mapXingyueBook()` 函数：

| Ai智能写作系统字段 | 本地字段 | 转换逻辑 |
|-------------|---------|---------|
| `book_id` | `id` | 直接使用（也用于构造 book_url） |
| `book_name` | `title` | 直接映射 |
| `author` | `author` | 直接映射 |
| `abstract` | `intro` | **直接映射，无 PUA 解码** |
| `cover_url` | `cover_url` | 直接映射 |
| `book_id` | `book_url` | `https://fanqienovel.com/page/{book_id}` |
| `word_count` | `word_count` | `Number(word_count) \|\| 0` |
| `read_count` | `read_count` | `Number(read_count) \|\| 0` |
| `status` | `status` | `"已完结"` → `"finished"`，其他 → `"serial"` |
| `subcategory` | `subcategory` | 直接映射，空时默认 `"热门"` |
| `rank_position` | `rank_position` | `Number(rank_position) \|\| (index + 1)` |
| `ai_analysis` | `analysis` | 原样传递 |
| - | `selling_points` | 从 `abstract` + `subcategory` 关键词推断 |
| - | `core_hook` | `selling_points.join(' · ')` |
| - | `tags` | `[subcategory, ...selling_points]` |
| - | `heat_score` | `read_count \|\| word_count \|\| 0` |
| - | `platform` | 固定 `"fanqie"` |

### 卖点推断逻辑

从 `abstract` 和 `subcategory` 匹配关键词生成 sell_points：

| 关键词 | 卖点标签 |
|--------|---------|
| 系统 | 系统流 |
| 重生 | 重生逆袭 |
| 穿越 | 穿越开局 |
| 游戏 | 游戏入侵 |
| 悬疑 | 悬疑惊悚 |
| 末日 | 末日生存 |
| 修仙 | 修仙升级 |
| 神明 | 神明设定 |
| 高武 | 都市高武 |

未匹配到任何关键词时默认：`['高热题材', '强设定', '追读潜力']`

---

## 错误处理

| HTTP 状态码 | 含义 | 本地处理 |
|------------|------|---------|
| 200 | 正常 | 解密响应并返回 |
| 400 | 参数校验失败 | 透传错误信息 |
| 401 | Token 过期 | 返回 `{ code: 401, status: 'token_expired' }` |
| 其他 | 网络/服务错误 | `{ code: 500, message: err.message }` |

`xingyueController.js` 中的 `handleError()` 统一处理错误，对 401 返回中文提示：`"Ai智能写作系统API授权已过期，请更新token"`。

---

## 添加新榜单类型步骤

当Ai智能写作系统新增榜单类型时，在以下文件中同步添加：

1. **`backend/src/models/database.js`** — `migrateDb()` 中添加 `newRankTypes` 条目：
```javascript
['new_type_key', '新榜单名', 'icon-name', sort_order_number],
```

2. **`backend/src/models/seed.js`** — `rankTypes` 数组中添加：
```javascript
{ type_key: 'new_type_key', label: '新榜单名', icon: 'icon-name', sort_order: N }
```

3. **`backend/src/controllers/aiRankController.js`** — `isXingyueType()` 中添加新 key：
```javascript
function isXingyueType(rankType) {
  return ['male_reading', 'female_reading', 'new_type_key'].includes(rankType);
}
```

4. **`frontend/src/views/Home.vue`** — `XINGYUE_TYPES` 数组中添加新 key：
```javascript
const XINGYUE_TYPES = ['male_reading', 'female_reading', 'new_type_key'];
```

5. 如果是全新类型的 API 参数格式不同，还需要调整 `xingyueService.js` 中的 API 端点或参数。

---

## 关键注意事项

1. **Token 是自签 JWT，非标准签名**。第三段是 hex 字符串而非 base64url 编码的签名，因此不能使用标准 JWT 库验证，只能原样传递。

2. **Ai智能写作系统 API 响应是 AES 加密的**，与本地项目共用密钥（`chloefuckityoall` / `9311019310287172`）。后端 xingyueService 解密后返回明文，再由全局 encryptMiddleware 重新加密发给前端。

3. **热词接口需要 subcategory**。不传 subcategory 会返回错误，`fetchLiveData()` 会使用第一个分类获取热词。

4. **`word_count` 和 `read_count` 是字符串**。API 返回如 `"5763962"`、`"4003607"`，字段映射时需 `Number()` 转换。

5. **`/categories` 和 `/category-totals` 响应字段不同**。前者使用 `name/value`，后者使用 `subcategory/book_count/read_count`。

6. **搜索接口不支持 xingyue 类型**。xingyuexiezuo 没有搜索端点，`aiRankController.searchTotal()` 对 xingyue 类型直接返回空结果。

7. **`fontDecoder.js` 已重新启用**。通过两种方式建立 PUA 映射（共约 306 条）：
   - `buildMappingFromApi()`：对比 fanqie API 乱码 vs 书籍详情页干净标题/作者，逐字符对齐
   - **星月交叉对比**：利用星月 API 返回的干净 intro，与 fanqie API 的 PUA intro 按 `book_id` 匹配后逐字符对齐，大幅扩展了映射覆盖率
   
   `refreshFontMapping()` 每 12 小时运行一次（cron: `37 3,15 * * *`），仅写入 `font_cache` 数据库表，不覆盖权威的 `pua_mapping.json` 文件。非星月类型（hot/new/finished 等）的标题和简介现在可以解码到 ~95% 的可读率。星月类型（male_reading/female_reading）本身返回干净文本，无需 PUA 解码。
---

## AI创作生成接口（v1/gen/*）

> 来源：Ai智能写作系统网站 JS 逆向分析（assets/index-02699414.js）
> 发现日期：2026-05-13

### 接口概览

Ai智能写作系统的 AI 创作功能通过 `v1/gen/*` 系列接口实现，涵盖书名/简介/大纲/开篇/人设/脑洞等数十种生成器。

### 已知 gen 接口映射表

| gen 接口路径 | 功能 | 本地对应 tool_key |
|-------------|------|-------------------|
| `v1/gen/book-name` | 书名生成 | `book_title` |
| `v1/gen/book-desc` | 简介生成 | `synopsis` |
| `v1/gen/book-detailed` | 细纲生成 | `detailed_outline` |
| `v1/gen/book-outline` | 大纲生成 | `outline` |
| `v1/gen/book-start` | 黄金开篇 | `opening` |
| `v1/gen/book-finger` | 金手指设计 | `golden_finger` |
| `v1/gen/character-name` | 角色取名 | `name_generator` |
| `v1/gen/character` | 人设生成 | `character_design` |
| `v1/gen/world` | 世界观生成 | `world` |
| `v1/gen/imagination` | 脑洞生成 | `imagination` |
| `v1/gen/title-rewrite` | 标题仿写 | `title_rewrite` |
| `v1/gen/summary-rewrite` | 简介仿写 | `summary_rewrite` |
| `v1/gen/imagination-rewrite` | 脑洞仿写 | `imagination_rewrite` |
| `v1/gen/book-analysis` | 书籍分析 | `book_analysis` |
| `v1/gen/chapter-title` | 章节起名 | `chapter_title` |
| `v1/gen/chapter-summary` | 场景概要 | — |
| `v1/gen/glossary-generator` | 词条生成 | — |
| `v1/gen/cover-prompt` | 封面提示词 | `cover_prompt` |
| `v1/gen/volume-summary` | 分卷概要 | `volume_summary` |

### 剧本模式 gen 接口（星月有，本地未实现）

| 路径 | 功能 |
|------|------|
| `v1/gen/book-name`（剧本） | 剧本名生成 |
| `v1/gen/book-desc`（剧本） | 剧本简介 |
| `v1/gen/book-detailed`（剧本） | 剧本细纲 |
| `v1/gen/book-outline`（剧本） | 剧本大纲 |
| `v1/gen/book-start`（剧本） | 剧本开篇 |
| `v1/gen/book-finger`（剧本） | 剧本金手指 |
| `v1/gen/character-name`（剧本） | 剧本角色取名 |
| `v1/gen/scene-summary` | 场景概要 |
| `v1/gen/character`（剧本） | 剧本人设 |
| `v1/gen/world`（剧本） | 剧本世界观 |
| `v1/gen/imagination`（剧本） | 剧本脑洞 |
| `v1/gen/glossary-generator`（剧本） | 剧本词条 |
| `v1/gen/scene-title` | 场景起名 |
| `v1/gen/scene-title`（批量） | 批量场景起名 |
| `v1/gen/volume-summary`（剧本） | 剧本分卷 |
| `v1/gen/cover-prompt`（剧本） | 剧本封面提示词 |

### JS 源码关键发现

```javascript
// gen 接口路由映射（从网站 JS 提取）
const dmt = {
  [Nf]: "v1/gen/book-name",           // 书名
  [If]: "v1/gen/book-desc",           // 简介
  [kf]: "v1/gen/book-detailed",       // 细纲
  [Mf]: "v1/gen/book-outline",        // 大纲
  [Lf]: "v1/gen/book-start",          // 开篇
  [Pf]: "v1/gen/book-finger",         // 金手指
  [_u]: "v1/gen/character-name",      // 角色取名
  [Ff]: "v1/gen/chapter-summary",     // 场景概要
  [bu]: "v1/gen/character",           // 人设
  [Uf]: "v1/gen/world",               // 世界观
  [Bf]: "v1/gen/imagination",         // 脑洞
  [zf]: "v1/gen/title-rewrite",       // 标题仿写
  [Hf]: "v1/gen/summary-rewrite",     // 简介仿写
  [Gf]: "v1/gen/book-analysis",       // 书籍分析
  [qf]: "v1/gen/imagination-rewrite", // 脑洞仿写
  [Wf]: "v1/gen/chapter-summary",     // 批量概要
  [Eu]: "v1/gen/glossary-generator",  // 词条生成
  [Qf]: "v1/gen/chapter-title",       // 章节起名
  [wg]: "v1/gen/chapter-title",       // 批量起名
  [Su]: "v1/gen/cover-prompt",        // 封面提示词
  [jf]: "v1/gen/volume-summary",      // 分卷概要
};
```

### 请求/响应格式（推测）

基于网站 JS 分析，gen 接口可能使用与排行接口相同的 AES 加密传输。请求体包含创作参数（主题/风格/数量等），响应为加密的生成内容。

**默认超时**：大部分接口 3000ms，剧本模式 10000ms。

### 本地实现状态

| 接口 | 本地状态 |
|------|---------|
| `v1/gen/book-name` ~ `v1/gen/volume-summary`（小说 19 个） | ✅ 15个已实现（creativeToolService.js） |
| `v1/gen/chapter-summary`（场景概要） | ❌ 未实现 |
| `v1/gen/glossary-generator`（词条生成） | ❌ 未实现 |
| 剧本模式 19 个 gen 接口 | ❌ 全部未实现 |

---

## 更新记录

| 日期 | 内容 |
|------|------|
| 2026-05-11 | 初版：排行接口对接 |
| 2026-05-12 | 补充 Token 管理、字段映射、错误处理 |
| 2026-05-13 | 新增 gen 接口清单（JS逆向） + 剧本模式接口 |
