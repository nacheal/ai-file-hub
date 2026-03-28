# AI File Hub — 任务清单

**版本：** v2.0
**日期：** 2026-03-28
**关联文档：** PRD.md · progress.md
**总任务数：** 6 个阶段 · 20 个分组 · 88 个任务

> 标签说明：`[前端]` `[Supabase]` `[Edge Fn]` `[数据库]` `[基础设施]`

---

## 阶段一：地基搭建（预计 3 天）

### 1.1 Supabase 项目初始化

- [ ] **T-101** 在 supabase.com 创建新项目，记录 Project URL 和 anon key `[基础设施]`
- [ ] **T-102** 执行建表 SQL：`documents` 表（id、user_id、name、size、mime_type、storage_path、status、created_at） `[数据库]`
- [ ] **T-103** 执行建表 SQL：`ai_results` 表（document_id FK、summary、key_points[]、tags[]、full_text） `[数据库]`
- [ ] **T-104** 配置 RLS 策略（documents 表）：SELECT / INSERT / UPDATE / DELETE 四条策略 `[数据库]`
- [ ] **T-105** 配置 RLS 策略（ai_results 表）：SELECT 仅限关联 user_id；INSERT 仅 Service Role `[数据库]`
- [ ] **T-106** 创建全文搜索 GIN 索引：documents.name 和 ai_results.summary + key_points `[数据库]`
- [ ] **T-107** 创建 Storage Bucket：`user-files`，Private 模式，配置文件类型白名单，50MB 上限 `[Supabase]`
- [ ] **T-108** 配置 Storage Bucket RLS 策略，路径规则：`{user_id}/{document_id}/{filename}` `[Supabase]`

### 1.2 GitHub OAuth 配置

- [ ] **T-111** 在 GitHub 创建 OAuth App，填写 Homepage URL 和 Supabase 回调地址 `[基础设施]`
- [ ] **T-112** 在 Supabase Auth 中启用 GitHub Provider，填入 Client ID 和 Client Secret `[Supabase]`

### 1.3 前端项目初始化

- [ ] **T-121** 用 Vite 创建 React 项目：`npm create vite@latest ai-file-hub -- --template react` `[前端]`
- [ ] **T-122** 安装核心依赖：`@supabase/supabase-js` · `react-router-dom` · `tailwindcss` · `shadcn/ui` `[前端]`
- [ ] **T-123** 配置 Tailwind CSS：`tailwind.config.js` + `index.css` 初始化 `[前端]`
- [ ] **T-124** 初始化 shadcn/ui：`npx shadcn-ui@latest init`，按需添加组件 `[前端]`
- [ ] **T-125** 创建 `src/lib/supabase.js`：`createClient` 单例，读取 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` `[前端]`
- [ ] **T-126** 配置 `.env.local`：写入两个前端环境变量，添加至 `.gitignore` `[基础设施]`
- [ ] **T-127** 搭建基础目录结构：`pages/` · `components/` · `hooks/` · `contexts/` · `lib/` `[前端]`

### 1.4 认证功能

- [ ] **T-131** 创建 `AuthContext.jsx`：管理 user / session / loading 状态，监听 `onAuthStateChange` `[前端]`
- [ ] **T-132** 实现 `LoginPage.jsx`：GitHub 登录按钮，调用 `signInWithOAuth({ provider: 'github' })` `[前端]`
- [ ] **T-133** 实现 `ProtectedRoute.jsx`：未登录跳转 `/`；已登录访问 `/` 跳转 `/dashboard` `[前端]`
- [ ] **T-134** 配置 React Router（`App.jsx`）：`/` · `/dashboard` · `/file/:id` · `/search`，嵌套 ProtectedRoute `[前端]`
- [ ] **T-135** 实现登出功能：调用 `supabase.auth.signOut()`，清除会话跳转 `/` `[前端]`

### 1.5 CI/CD 配置

- [ ] **T-141** 创建 GitHub 仓库并推送初始代码，`main` 分支作为生产分支 `[基础设施]`
- [ ] **T-142** 在 Vercel 导入 GitHub 仓库，配置 Build Command: `npm run build`，Output: `dist` `[基础设施]`
- [ ] **T-143** 在 Vercel 配置生产环境变量：`VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` `[基础设施]`
- [ ] **T-144** 验收：push 代码触发自动部署，访问 Vercel URL，GitHub 登录流程跑通 `[基础设施]`

---

## 阶段二：文件上传管道（预计 3 天）

### 2.1 布局与导航

- [ ] **T-201** 实现 `AppLayout.jsx`：左侧 Sidebar + 主内容区 Outlet（桌面双栏 / 移动单栏） `[前端]`
- [ ] **T-202** 实现 `Sidebar.jsx`：导航链接 Dashboard · Search · 用户头像 · 退出登录 `[前端]`
- [ ] **T-203** 实现 `TopBar.jsx`：SearchBar 占位 + 用户信息展示 `[前端]`

### 2.2 文件上传

- [ ] **T-211** 实现 `UploadZone.jsx` 组件：支持拖拽（dragover/drop 事件）和点击选择文件 `[前端]`
- [ ] **T-212** 前端文件校验逻辑：格式白名单校验 + 50MB 大小检查 + 错误提示 `[前端]`
- [ ] **T-213** 实现 `useUpload` hook：`supabase.storage.upload()` 含进度回调，写 documents 表，触发 analyze-file `[前端]`
- [ ] **T-214** 上传进度条 UI：进度百分比实时显示，上传完成后消失 `[前端]`
- [ ] **T-215** 上传错误处理：文件过大 / 格式不支持 / 网络错误，分类提示 `[前端]`

### 2.3 文件列表与实时更新

- [ ] **T-221** 实现 `useDocuments` hook：查询 documents 表，按 `created_at DESC` 排序 `[前端]`
- [ ] **T-222** 订阅 Realtime（documents 表）：监听 INSERT / UPDATE 事件，自动更新本地状态 `[前端]`
- [ ] **T-223** 实现 `FileCard.jsx` 组件：文件图标 + 名称 + 大小 + 时间 + StatusBadge `[前端]`
- [ ] **T-224** 实现 `StatusBadge.jsx` 组件：pending（灰）/ processing（蓝）/ done（绿）/ error（红） `[前端]`
- [ ] **T-225** 实现 `FileList.jsx` 组件：展示 FileCard 列表，含前端关键词过滤 input `[前端]`
- [ ] **T-226** 实现 `DashboardPage.jsx`：组合 UploadZone + FileList `[前端]`

### 2.4 文件删除

- [ ] **T-231** 删除确认弹窗（shadcn AlertDialog）：二次确认，防误删 `[前端]`
- [ ] **T-232** 删除逻辑：清除 Storage 文件，调用 `supabase.storage.from().remove()` `[Supabase]`
- [ ] **T-233** 删除逻辑：清除数据库记录，DELETE documents（CASCADE 自动删 ai_results） `[数据库]`

---

## 阶段三：AI 分析管道（预计 4 天）

### 3.1 Edge Function 基础设施

- [ ] **T-301** 安装 Supabase CLI：`npm install -g supabase`，完成本地登录 `[基础设施]`
- [ ] **T-302** 初始化 Edge Functions 目录：`supabase functions new analyze-file` `[基础设施]`
- [ ] **T-303** 配置 Supabase Secrets：`supabase secrets set DEEPSEEK_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=...` `[基础设施]`
- [ ] **T-304** 编写 Edge Function JWT 鉴权公共函数，所有 Function 复用 `[Edge Fn]`

### 3.2 analyze-file 函数

- [ ] **T-311** 从 Storage 下载文件内容：`supabase.storage.from().download()`，返回 Blob `[Edge Fn]`
- [ ] **T-312** PDF 文本提取：引入 pdf-parse（Deno 兼容版本），提取纯文本 `[Edge Fn]`
- [ ] **T-313** TXT / MD 文件读取：直接 `text()` 解码，无需额外库 `[Edge Fn]`
- [ ] **T-314** 图片 base64 编码：转 base64 供视觉模型使用 `[Edge Fn]`
- [ ] **T-315** 构建分析 Prompt 并调用 DeepSeek：system prompt + 文件内容，要求返回 JSON `[Edge Fn]`
- [ ] **T-316** 解析 DeepSeek 返回的 JSON：提取 summary / key_points / tags，容错处理 `[Edge Fn]`
- [ ] **T-317** 写入 ai_results 表：用 Service Role Key 绕过 RLS 写入 `[Edge Fn]`
- [ ] **T-318** 更新 `documents.status`：写入 done 或 error，触发 Realtime 推送 `[Edge Fn]`
- [ ] **T-319** 部署 analyze-file 函数：`supabase functions deploy analyze-file` `[基础设施]`

### 3.3 前端 AI 结果展示

- [ ] **T-321** 实现 `FilePage.jsx` 基础结构：左侧文件信息 / 右侧 AI 结果面板双栏布局 `[前端]`
- [ ] **T-322** 实现 `AIResultPanel.jsx`：展示 summary · key_points 列表 · tags 标签 `[前端]`
- [ ] **T-323** 分析状态 loading 态：processing 时展示 skeleton 占位动画 `[前端]`
- [ ] **T-324** 分析 error 态与重试按钮：status=error 时展示错误信息，可手动重新触发 `[前端]`
- [ ] **T-325** 图片文件预览：`FilePreview.jsx` 模态框，图片文件点击弹出原图 `[前端]`

---

## 阶段四：搜索与 AI 问答（预计 3 天）

### 4.1 全文搜索

- [ ] **T-401** 实现 `search-documents` Edge Function：FTS 查询 documents + ai_results，`ts_headline` 高亮 `[Edge Fn]`
- [ ] **T-402** 部署 search-documents 函数：`supabase functions deploy search-documents` `[基础设施]`
- [ ] **T-403** 实现 `SearchBar.jsx` 组件：输入防抖（300ms），回车或点击触发搜索 `[前端]`
- [ ] **T-404** 实现 `SearchPage.jsx`：展示搜索结果列表，高亮关键词，点击跳转详情页 `[前端]`
- [ ] **T-405** 搜索结果空状态：「未找到相关文件」空态 UI `[前端]`

### 4.2 AI 流式问答

- [ ] **T-411** 实现 `chat-with-file` Edge Function：读 full_text → 拼 Prompt → DeepSeek stream:true → SSE 透传 `[Edge Fn]`
- [ ] **T-412** 部署 chat-with-file 函数：`supabase functions deploy chat-with-file` `[基础设施]`
- [ ] **T-413** 实现 `useChat` hook：fetch SSE 流，ReadableStream 逐 token 读取，追加到 messages 状态 `[前端]`
- [ ] **T-414** 实现 `ChatInput.jsx` 组件：textarea 输入框 + 发送按钮，streaming 时禁用 `[前端]`
- [ ] **T-415** 实现 `ChatOutput.jsx` 组件：消息气泡列表，流式输出时末尾闪烁光标效果 `[前端]`
- [ ] **T-416** 在 `FilePage.jsx` 集成问答模块：AI 结果下方接入 ChatInput + ChatOutput `[前端]`
- [ ] **T-417** 问答上下文限制处理：full_text 超出 token 限制时截断，保留前 N 字符 `[Edge Fn]`

---

## 阶段五：打磨与上线（预计 3 天）

### 5.1 UI 打磨

- [ ] **T-501** 统一间距与字体规范：Tailwind spacing / text 规范全局复查 `[前端]`
- [ ] **T-502** 移动端适配：< 1024px 单栏布局，Sidebar 收起为底部 Tab `[前端]`
- [ ] **T-503** 空状态页面：文件列表为空时展示引导上传的插画 + 文字 `[前端]`
- [ ] **T-504** 全局 Loading 状态：页面初始加载、数据请求中的 skeleton 或 spinner `[前端]`
- [ ] **T-505** Toast 通知系统：上传成功 / 失败、删除成功，用 shadcn Toast 提示 `[前端]`

### 5.2 错误处理

- [ ] **T-511** 前端全局 Error Boundary：防止组件崩溃导致白屏 `[前端]`
- [ ] **T-512** Edge Function 异常统一处理：所有函数 try/catch，返回标准 `{ error }` JSON `[Edge Fn]`
- [ ] **T-513** 网络断线重连处理：Realtime 断线后自动重新订阅 `[前端]`

### 5.3 安全检查

- [ ] **T-521** RLS 验收测试：用两个不同 GitHub 账号登录，互相无法访问对方文件 `[数据库]`
- [ ] **T-522** 确认 API Key 不暴露：浏览器 Network 面板检查，DEEPSEEK_API_KEY 不出现 `[基础设施]`
- [ ] **T-523** Storage 路径权限验证：直接访问他人文件 URL 返回 403 `[Supabase]`

### 5.4 上线验收

- [ ] **T-531** 对照 PRD 验收清单逐条验收：13 条验收标准全部打勾 `[基础设施]`
- [ ] **T-532** 生产环境 Supabase Secrets 确认：DEEPSEEK_API_KEY 和 SERVICE_ROLE_KEY 已配置 `[基础设施]`
- [ ] **T-533** Edge Functions 生产部署确认：三个函数均在生产环境运行正常 `[基础设施]`
- [ ] **T-534** Vercel 生产 URL 可公网访问：分享链接，完整走一遍上传 → 分析 → 问答流程 `[基础设施]`

---

## 阶段六：RAG 升级（预计 4 天）

### 6.1 基础设施：pgvector + 新表

- [x] **T-601** 在 Supabase SQL Editor 执行：`create extension if not exists vector;` 开启 pgvector 扩展 `[数据库]`
- [x] **T-602** 创建 `document_chunks` 表（id、document_id FK、content、chunk_index、embedding vector(1536)、created_at） `[数据库]`
- [x] **T-603** 创建 ivfflat 向量索引（embedding vector_cosine_ops，lists=100）+ 普通索引（document_id） `[数据库]`
- [x] **T-604** 配置 `document_chunks` 表 RLS：启用行级安全；SELECT 策略关联 documents.user_id；不创建 INSERT policy `[数据库]`
- [x] **T-605** 配置 Embedding API Key（复用 DEEPSEEK_API_KEY，DeepSeek Embedding 接口） `[基础设施]`

### 6.2 改造 analyze-file：写入 chunk 向量

- [x] **T-611** 新建 `supabase/functions/_shared/chunk.ts`：实现 `chunkText()`，500 字符/块，50 字符重叠，优先段落断开 `[Edge Fn]`
- [x] **T-612** 新建 `supabase/functions/_shared/embed.ts`：实现 `embedChunks()`，调用 DeepSeek Embedding API，含重试逻辑 `[Edge Fn]`
- [x] **T-613** 改造 `analyze-file/index.ts`：写入 ai_results 后追加分块流程，失败不影响主流程 `[Edge Fn]`
- [x] **T-614** 验证级联删除：删除 document 后对应 chunks 自动清除 `[数据库]`
- [x] **T-615** 重新部署 analyze-file，验证新上传文件有 chunk 记录且 embedding 非 null `[基础设施]`

### 6.3 改造 chat-with-file：向量检索替换全文注入

- [x] **T-621** 新增 `embedQuestion()` 函数：对用户问题调用 embedding API，返回 1536 维向量 `[Edge Fn]`
- [x] **T-622** 实现 `retrieveChunks(documentId, questionEmbedding, topK=5)`：pgvector 余弦距离查询 `[Edge Fn]`
- [x] **T-623** 替换 Prompt 拼装：用检索 chunks 替代 full_text，标注 `[段落 N]`，无结果时回退提示 `[Edge Fn]`
- [x] **T-624** 保留多轮对话 history 传入逻辑，确认 SSE 流式输出正常 `[Edge Fn]`
- [x] **T-625** 重新部署 chat-with-file `[基础设施]`

### 6.4 跨文件全局问答

- [x] **T-631** 新建 `supabase/functions/chat-global/index.ts`：跨用户全部文件 top-8 检索，拼装 Prompt 标注来源 `[Edge Fn]`
- [x] **T-632** SSE 响应末尾追加 `[SOURCES]` 事件，JSON 数组含 document_id 和文件名 `[Edge Fn]`
- [x] **T-633** 部署 chat-global，更新 config.toml `[基础设施]`
- [x] **T-634** 前端：DashboardPage 新增「问所有文件」入口；新建 `GlobalChatPanel.jsx`，解析 [SOURCES] 展示来源卡片 `[前端]`
- [x] **T-635** 存量文件补全：对 status=done 且无 chunk 的历史文件重新执行分块向量化 `[基础设施]`

---

## 任务统计

| 阶段 | 任务数 | 状态 |
|------|--------|------|
| 阶段一：地基搭建 | 26 个 | ✅ 已完成 |
| 阶段二：文件上传管道 | 14 个 | ✅ 已完成 |
| 阶段三：AI 分析管道 | 14 个 | ✅ 已完成 |
| 阶段四：搜索与 AI 问答 | 12 个 | ✅ 已完成 |
| 阶段五：打磨与上线 | 13 个 | ✅ 已完成 |
| 阶段六：RAG 升级 | 20 个 | ✅ 已完成 |
| **合计** | **99 个** | — |

## 标签分布

| 标签 | 任务数 | 说明 |
|------|--------|------|
| `[前端]` | 37 个 | React 组件、Hooks、路由、状态管理 |
| `[基础设施]` | 22 个 | Vercel、GitHub、Supabase CLI、环境变量 |
| `[Edge Fn]` | 18 个 | Deno 边缘函数、AI 调用、流式输出 |
| `[数据库]` | 10 个 | 建表、RLS、索引、向量 |
| `[Supabase]` | 4 个 | Storage、Auth、Realtime |

---

*文档结束*
