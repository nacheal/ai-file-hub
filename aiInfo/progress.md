# AI File Hub — 项目进度报告

**更新日期：** 2026-03-28
**当前阶段：** 阶段六（RAG 升级）— 全部完成 🎉
**完成进度：** T-101 至 T-417、T-601 至 T-635 全部完成；生产环境已上线
**生产地址：** https://ai-file-hub.vercel.app/
**下一步：** 无（阶段六为当前最终阶段）

---

## 一、项目概述

### 1.1 项目目标
AI File Hub 是一个面向个人用户的私有云文件空间，核心功能包括：
- 文件上传与管理（PDF、TXT、MD、图片）
- AI 智能分析（自动生成摘要、要点、标签）
- 全文搜索
- 基于文件内容的 AI 问答

### 1.2 技术栈
| 层级 | 技术选型 |
|------|---------|
| 前端 | React 18 + Vite 5 + React Router 6 + Tailwind CSS + shadcn/ui |
| 认证 | Supabase Auth (GitHub OAuth 2.0) |
| 数据库 | Supabase PostgreSQL (RLS 行级安全) |
| 存储 | Supabase Storage (S3 兼容) |
| 实时通信 | Supabase Realtime (WebSocket) |
| 服务端逻辑 | Supabase Edge Functions (Deno + TypeScript) |
| AI 服务 | DeepSeek API (deepseek-chat) |
| 部署 | Vercel (前端) + Supabase (后端) |

### 1.3 核心架构
```
用户浏览器 (React SPA)
    ↓
Vercel (静态托管 + CI/CD)
    ↓
Supabase (Auth + DB + Storage + Realtime)
    ↓
Edge Functions (文件解析 + AI 调用)
    ↓
DeepSeek API (内容分析 + 问答)
```

---

## 二、当前进度

### 2.1 已完成任务（T-101 至 T-112）✅

#### ✅ 1.1 Supabase 项目初始化（T-101 至 T-108）

**T-101 创建 Supabase 项目** ✅
- 已在 supabase.com 创建项目
- 项目名称：ai-file-hub
- 区域：Southeast Asia (Singapore)
- 已记录 Project URL 和 anon key

**T-102 建表：documents** ✅
- 表结构已创建，包含字段：
  - id (uuid, PK)
  - user_id (uuid, FK → auth.users)
  - name (text)
  - size (bigint)
  - mime_type (text)
  - storage_path (text)
  - status (text, default 'pending')
  - created_at (timestamptz)

**T-103 建表：ai_results** ✅
- 表结构已创建，包含字段：
  - id (uuid, PK)
  - document_id (uuid, FK → documents, CASCADE DELETE)
  - summary (text)
  - key_points (text[])
  - tags (text[])
  - full_text (text)
  - created_at (timestamptz)

**T-104 配置 RLS 策略（documents 表）** ✅
- SELECT 策略：用户只能查看自己的文件
- INSERT 策略：用户只能插入自己的文件
- UPDATE 策略：用户只能更新自己的文件
- DELETE 策略：用户只能删除自己的文件

**T-105 配置 RLS 策略（ai_results 表）** ✅
- SELECT 策略：通过 document_id 关联验证 user_id
- INSERT 权限：仅 Service Role（Edge Function）

**T-106 创建全文搜索 GIN 索引** ✅
- idx_documents_name_fts：文件名搜索索引
- idx_ai_results_content_fts：AI 摘要 + 要点搜索索引
- idx_documents_user_created：列表页高频查询索引（user_id + created_at DESC）

**T-107 创建 Storage Bucket** ✅
- Bucket 名称：user-files
- 访问类型：Private
- 文件大小上限：50MB (52428800 bytes)
- 允许的 MIME 类型：image/png, image/jpeg, image/webp, application/pdf, text/plain, text/markdown

**T-108 配置 Storage Bucket RLS 策略** ✅
- SELECT 策略：用户读取自己的文件
- INSERT 策略：用户上传自己的文件
- DELETE 策略：用户删除自己的文件
- 路径规则：{user_id}/{document_id}/{filename}

#### ✅ 1.2 GitHub OAuth 配置（T-111 至 T-112）

**T-111 在 GitHub 创建 OAuth App** ✅
- Application name: AI File Hub
- Client ID: Ov23liXEnpk8cId5Nh2i
- Client Secret: 已保存至 local/keys.md
- Homepage URL: http://localhost:5173（开发阶段）
- Authorization callback URL: 已配置 Supabase 回调地址

**T-112 在 Supabase 启用 GitHub Provider** ✅
- GitHub Provider 状态：Enabled
- Client ID 和 Client Secret 已配置
- 认证流程已就绪
- ✅ **本次验收（2026-03-23）**：GitHub OAuth 登录流程实测通过，授权后成功跳转 /dashboard

---

### 2.2 已完成任务（T-121 至 T-135）✅

#### ✅ 1.3 前端项目初始化（T-121 至 T-127）

**T-121 用 Vite 创建 React 项目** ✅
- 已使用 `npm create vite@latest frontend -- --template react` 创建项目
- 项目位置：frontend/ 目录
- Vite 版本：5.4.21（已降级以兼容 Node.js 22.2.0）
- 开发服务器已成功启动：http://localhost:5173/

**T-122 安装核心依赖** ✅
- @supabase/supabase-js 2.48.1（Supabase 客户端 SDK）
- react-router-dom 7.1.3（路由）
- tailwindcss 3.4.17 + postcss + autoprefixer（样式）
- @types/node（TypeScript 类型定义）
- tailwindcss-animate, class-variance-authority, clsx, tailwind-merge, lucide-react（shadcn/ui 依赖）

**T-123 配置 Tailwind CSS** ✅
- 已创建 tailwind.config.js 配置文件
- 已创建 postcss.config.js 配置文件
- 已修改 src/index.css，引入 Tailwind 指令和 CSS 变量
- 已配置 Vite 路径别名 `@/` 指向 `./src`
- ⚠️ **本次修复（2026-03-23）**：项目初始化时误装了 Tailwind CSS v4，已降级回 v3.4.19；修复 postcss.config.js；补全 tailwind.config.js 中 shadcn/ui 所需的 colors 映射（border、background、foreground 等）

**T-124 初始化 shadcn/ui** ✅
- 已创建 components.json 配置文件
- 已更新 Tailwind 配置，添加 darkMode 和 CSS 变量支持
- 已创建 src/lib/utils.js 工具函数（cn 函数）
- 已创建 src/components/ui/button.jsx Button 组件
- 已安装所有必需依赖

**T-125 创建 Supabase 客户端单例** ✅
- 已创建 src/lib/supabase.js
- 使用 createClient 初始化 Supabase 客户端
- 读取环境变量 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY

**T-126 配置 .env.local** ✅
- 已创建 .env.local 文件（需要用户填写实际值）
- 已确认 .gitignore 包含 *.local，环境变量不会被提交
- 模板已准备，等待用户配置 Supabase 信息

**T-127 搭建基础目录结构** ✅
- 已创建目录：contexts/, hooks/, pages/, guards/
- 已创建目录：components/layout/, components/file/, components/ai/, components/ui/
- 目录结构完整，为后续开发做好准备

#### ✅ 1.4 认证功能（T-131 至 T-135）

**T-131 创建 AuthContext.jsx** ✅
- 已创建 src/contexts/AuthContext.jsx
- 实现 AuthProvider 组件，管理全局认证状态
- 管理 user, session, loading 三个状态
- 监听 onAuthStateChange 事件，自动更新状态
- 导出 useAuth hook 供组件使用

**T-132 实现 LoginPage.jsx** ✅
- 已创建 src/pages/LoginPage.jsx
- 实现 GitHub 登录按钮（使用 shadcn/ui Button 组件）
- 调用 supabase.auth.signInWithOAuth({ provider: 'github' })
- 已登录用户自动跳转 /dashboard
- 加载状态处理完善

**T-133 实现 ProtectedRoute.jsx** ✅
- 已创建 src/guards/ProtectedRoute.jsx
- 实现路由守卫逻辑
- 未登录用户自动跳转 /
- 已登录用户渲染子路由（Outlet）
- 加载状态处理，避免闪烁

**T-134 配置 React Router（App.jsx）** ✅
- 已修改 src/App.jsx，配置完整路由
- 公开路由：/ (LoginPage)
- 受保护路由：
  - /dashboard (DashboardPage)
  - /file/:id (FilePage)
  - /search (SearchPage)
- 已创建占位页面组件
- 路由嵌套结构正确，AuthProvider 包裹全局

**T-135 实现登出功能** ✅
- 已在 src/lib/utils.js 添加 signOut 函数
- 调用 supabase.auth.signOut()
- 后续可在 Sidebar 组件中调用

---

### 2.3 已完成任务（T-141 至 T-144）✅

#### ✅ 1.5 CI/CD 配置（T-141 至 T-144）

**T-141 创建 GitHub 仓库并推送代码** ✅
- 代码已推送至 GitHub `main` 分支
- 仓库地址：https://github.com/nacheal/ai-file-hub

**T-142 在 Vercel 导入 GitHub 仓库** ✅
- Root Directory: `frontend`
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- 新增 `frontend/vercel.json` 解决 SPA 路由刷新 404 问题

**T-143 在 Vercel 配置生产环境变量** ✅
- 已添加 `VITE_SUPABASE_URL`
- 已添加 `VITE_SUPABASE_ANON_KEY`
- Redeploy 后环境变量生效

**T-144 验收：完整登录流程测试** ✅
- 生产地址：https://ai-file-hub.vercel.app/
- GitHub 登录流程线上验收通过
- OAuth 回调正确跳转至生产 /dashboard（已修复 Supabase Site URL）
- 生产环境完整登录流程验证通过 ✅

---

## 三、项目架构总结

### 3.1 数据库架构
```
auth.users (Supabase 内置)
    │
    ├─→ documents (1:N)
    │   ├── id (PK)
    │   ├── user_id (FK)
    │   ├── name, size, mime_type
    │   ├── storage_path
    │   ├── status (pending/processing/done/error)
    │   └── created_at
    │
    └─→ ai_results (1:1 with documents)
        ├── id (PK)
        ├── document_id (FK, CASCADE DELETE)
        ├── summary
        ├── key_points[]
        ├── tags[]
        ├── full_text
        └── created_at
```

### 3.2 安全架构
- **RLS（行级安全）**：所有表启用 RLS，用户只能访问自己的数据
- **Storage 权限**：路径规则 {user_id}/{document_id}/{filename}
- **密钥隔离**：
  - 前端：SUPABASE_URL + ANON_KEY（可公开）
  - 服务端：DEEPSEEK_API_KEY + SERVICE_ROLE_KEY（仅 Edge Function）

### 3.3 数据库架构（阶段六更新）
```
auth.users (Supabase 内置)
    │
    ├─→ documents (1:N)
    │   └── ...（同上）
    │
    ├─→ ai_results (1:1 with documents)
    │   └── ...（同上）
    │
    └─→ document_chunks (1:N with documents)  ← 阶段六新增
        ├── id (PK)
        ├── document_id (FK, CASCADE DELETE)
        ├── content (text)
        ├── chunk_index (int)
        ├── embedding (vector(1536))
        └── created_at
```

### 3.4 数据流设计

**文件上传流程（阶段六 RAG 版）：**
```
用户拖拽文件
  → 前端校验（格式/大小）
  → Storage.upload()
  → documents.insert() (status='pending')
  → Edge Function: analyze-file
  → 更新 status='processing'
  → 下载文件 → 提取文本
  → 调用 DeepSeek API
  → ai_results.insert()
  → 更新 status='done'
  → chunkText() → embedChunks()   ← 阶段六新增
  → document_chunks 批量写入      ← 阶段六新增
  → Realtime 推送至前端
```

**单文件 AI 问答流程（阶段六 RAG 版）：**
```
用户输入问题
  → Edge Function: chat-with-file
  → embedQuestion()               ← 阶段六新增
  → retrieveChunks(top-5)         ← 阶段六新增（替换 full_text 注入）
  → 拼装 Prompt（含段落来源标注）
  → DeepSeek API (stream: true)
  → SSE 流式返回
  → 前端逐 token 渲染
```

**跨文件全局问答流程（阶段六新增）：**
```
用户在 Dashboard 提问
  → Edge Function: chat-global
  → embedQuestion()
  → retrieveGlobalChunks(top-8，跨所有文件)
  → 拼装 Prompt + 标注来源文件
  → DeepSeek API (stream: true)
  → SSE + [SOURCES] 事件
  → 前端渲染回答 + 来源卡片
```

---

### 2.4 已完成任务（T-201 至 T-233）✅

#### ✅ 2.1 布局与导航（T-201 至 T-203）

**T-201 实现 AppLayout.jsx** ✅
- 左侧 Sidebar + 主内容区 Outlet 双栏布局
- 路由嵌套：ProtectedRoute → AppLayout → 各页面

**T-202 实现 Sidebar.jsx** ✅
- 导航链接：文件库（/dashboard）、搜索（/search）
- 用户头像（GitHub avatar）+ 用户名显示
- 退出登录按钮（调用 signOut，跳转 /）

**T-203 实现 TopBar.jsx** ✅
- 搜索栏占位按钮（点击跳转 /search）

#### ✅ 2.2 文件上传（T-211 至 T-215）

**T-211 实现 UploadZone.jsx** ✅
- 支持拖拽（dragover/drop 事件）和点击选择文件
- 上传中禁用交互，视觉反馈明确

**T-212 前端文件校验** ✅
- 格式白名单：PDF、TXT、MD、PNG、JPG、WebP
- 50MB 大小检查 + 分类错误提示（可关闭）

**T-213 实现 useUpload hook** ✅
- `supabase.storage.upload()` 上传至 user-files bucket
- 路径规则：`{user_id}/{docId}/{filename}`
- 写 documents 表（status='pending'）
- progress / error / uploading 状态管理

**T-214 上传进度条 UI** ✅
- 进度百分比实时显示，上传完成后自动消失

**T-215 上传错误处理** ✅
- 文件过大 / 格式不支持 / 网络错误分类提示

#### ✅ 2.3 文件列表与实时更新（T-221 至 T-226）

**T-221 实现 useDocuments hook** ✅
- 查询 documents 表，按 created_at DESC 排序

**T-222 订阅 Realtime** ✅
- 监听 INSERT / UPDATE / DELETE 事件，自动更新本地状态

**T-223 实现 FileCard.jsx** ✅
- 文件图标（按 MIME 类型区分）+ 名称 + 大小 + 时间 + StatusBadge
- 点击跳转 /file/:id，悬停显示删除按钮

**T-224 实现 StatusBadge.jsx** ✅
- pending（灰）/ processing（蓝，带动画）/ done（绿）/ error（红）

**T-225 实现 FileList.jsx** ✅
- 展示 FileCard 列表 + 前端关键词过滤 input
- 骨架屏 loading 态 + 空状态引导

**T-226 实现 DashboardPage.jsx** ✅
- 组合 UploadZone + FileList，接入 useDocuments

#### ✅ 2.4 文件删除（T-231 至 T-233）

**T-231 删除确认弹窗** ✅
- 自实现轻量 DeleteDialog（Tailwind 遮罩 + 弹窗）
- 二次确认，防误删；删除中显示 loading 状态

**T-232 + T-233 删除逻辑** ✅
- 先 `supabase.storage.from('user-files').remove()` 清除 Storage 文件
- 再 DELETE documents 记录（CASCADE 自动删 ai_results）
- Realtime DELETE 事件自动更新列表

---

## 四、下一步行动计划

### 4.1 阶段一验收结果 ✅

**全部通过：**
- [x] 本地 `npm run dev` 能打开登录页
- [x] 点击「使用 GitHub 登录」能跳转授权
- [x] 授权后跳转 /dashboard，显示「Dashboard（阶段二实现）」
- [x] Vercel 线上地址能完整走通登录流程
- [x] Vercel 环境变量已配置，构建正常

### 4.2 阶段二验收结果 ✅

**全部通过：**
- [x] 图片文件（PNG/JPG/WebP）上传成功，出现在文件列表
- [x] MD 文件上传成功（修复 MIME 类型推断问题）
- [x] PDF 文件上传成功（修复 Blob 包装问题）
- [x] 文件删除：确认弹窗 → Storage 清除 → DB 记录删除
- [x] StatusBadge 状态显示正常
- [x] Realtime 列表实时刷新
- [x] 格式/大小校验错误提示正常

**已修复的问题：**
- 浏览器对 `.md` 返回 `application/octet-stream`：改用扩展名推断 MIME 类型
- Supabase SDK 传 `File` 对象时忽略 `contentType` 选项：改用 `new Blob([file], { type })` 强制指定

### 4.4 已完成（阶段三：AI 分析管道）✅

**T-301 安装 Supabase CLI** ✅
- 手动下载 supabase_darwin_arm64 二进制文件，安装至 ~/.local/bin/
- 清除 macOS 隔离属性，版本 v2.78.1

**T-302 初始化 Edge Functions 目录** ✅
- 创建 supabase/config.toml（project_id = gkdhnuxyzpocitphcciy）
- 创建 supabase/functions/_shared/cors.ts（公共 CORS 头）
- 创建 supabase/functions/analyze-file/index.ts

**T-303 配置 Supabase Secrets** ✅
- DEEPSEEK_API_KEY 已通过 CLI 写入云端 Secrets
- SUPABASE_SERVICE_ROLE_KEY 由平台自动注入（无需手动设置）

**T-304 + T-311~318 analyze-file Edge Function** ✅
- JWT 鉴权：通过 userClient.auth.getUser() 验证，RLS 自动保证归属权
- 文件下载：adminClient.storage.from('user-files').download()
- 文本提取：TXT/MD 直接 .text()；PDF 正则提取文本流；图片 btoa 转 base64
- DeepSeek 调用：system prompt 要求返回 JSON {summary, key_points, tags}
- 容错解析：兼容 markdown 代码块包裹的 JSON
- 写入 ai_results + 更新 documents.status（done/error）
- 失败时自动 catch 并更新 status='error'

**T-319 部署 analyze-file** ✅
- supabase functions deploy analyze-file —— 部署成功
- 函数 URL：https://gkdhnuxyzpocitphcciy.supabase.co/functions/v1/analyze-file
- ⚠️ **Bug 修复（2026-03-25）：401 Invalid JWT**
  - 根因：Supabase 新版 publishable key（`sb_publishable_*`）非标准 JWT，网关级 `verify_jwt = true` 校验直接拒绝请求
  - 修复一：`useUpload.js` 和 `AIResultPanel.jsx` 中显式通过 `supabase.auth.getSession()` 获取 `access_token`，手动写入 `Authorization` header
  - 修复二：`supabase/config.toml` 将 `verify_jwt` 改为 `false`，并重新以 `--no-verify-jwt` 部署；函数内部已有完整 JWT 鉴权，安全性不受影响
  - ✅ **MD 文件分析实测通过**
  - ⚠️ **已知问题**：图片文件分析失败——`deepseek-chat` 模型不支持视觉输入，待后续替换为视觉模型时修复

**前端 useUpload 更新** ✅
- 上传并写入 documents 表后，fire-and-forget 调用 analyze-file
- 状态变化通过 Realtime 实时推送到前端

**T-321 FilePage.jsx** ✅
- 左栏（2/5）：文件图标 + 名称 + StatusBadge + 元信息（大小、MIME、日期）
- 右栏（3/5）：AIResultPanel
- 订阅 documents 和 ai_results 的 Realtime 更新
- 图片预览（generateSignedUrl，60s 有效）
- 删除文件（Storage + DB）

**T-322 AIResultPanel.jsx** ✅
- done 态：展示 summary + key_points 列表 + tags 标签
- processing/pending 态：骨架屏动画 + 蓝色进度提示
- error 态：错误提示 + 「重新分析」按钮（调用 analyze-file）

**T-323 分析 loading 态** ✅
- ProcessingSkeleton 组件，含 Loader2 动画 + 多行骨架占位

**T-324 分析 error 态与重试按钮** ✅
- 红色错误卡片 + RetryButton，点击重新 invoke analyze-file

**T-325 图片预览 FilePreview.jsx** ✅
- 全屏遮罩模态框，ESC / 点击遮罩关闭
- Supabase Storage createSignedUrl 生成安全 URL

---

### 4.5 已完成（阶段四：搜索与 AI 问答）✅

**T-401 search-documents Edge Function** ✅
- ILIKE 双路搜索：文件名（documents.name）+ AI 摘要（ai_results.summary）
- 自动合并去重，按 created_at 降序排列
- snippet 片段提取：定位关键词位置，截取前后文本作为摘要
- JWT 鉴权，RLS 自动限制用户只能搜索自己的文件

**T-402 部署 search-documents** ✅
- `supabase functions deploy search-documents --no-verify-jwt` 部署成功
- 更新 `supabase/config.toml` 添加 `[functions.search-documents]` verify_jwt = false

**T-403~405 SearchPage.jsx** ✅
- 输入防抖 300ms，回车立即触发搜索
- URL Query String 同步（?q=keyword），支持分享链接
- HighlightText 组件：关键词黄色高亮
- 自动聚焦搜索框，一键清除功能
- 搜索结果：文件图标 + 名称（高亮）+ 摘要片段（高亮）+ 文件信息 + 「内容匹配」标签
- 空状态：「未找到相关文件」提示 + 建议文案

**T-411 chat-with-file Edge Function** ✅
- JWT 鉴权 + RLS 归属权验证
- 读取 ai_results.full_text 作为文件上下文
- 支持多轮对话（history 数组）
- DeepSeek API stream: true，SSE 流直接透传给前端
- 函数 URL：https://gkdhnuxyzpocitphcciy.supabase.co/functions/v1/chat-with-file

**T-412 部署 chat-with-file** ✅
- `supabase functions deploy chat-with-file --no-verify-jwt` 部署成功
- 更新 config.toml 添加 `[functions.chat-with-file]` verify_jwt = false

**T-413 useChat hook** ✅
- messages 状态管理（user + assistant 消息列表）
- fetch SSE 流：ReadableStream 逐 token 读取
- 追加式更新最后一条 assistant 消息，流式渲染
- streaming / error 状态管理
- clearMessages() 清空会话

**T-414~415 ChatInput.jsx + ChatOutput.jsx** ✅
- ChatInput：自适应高度 textarea，Enter 发送 / Shift+Enter 换行，streaming 时禁用
- ChatOutput：用户消息右对齐 + AI 消息左对齐气泡样式，流式输出光标动画（闪烁竖线），等待首 token 时三点弹跳动画，新消息自动滚动到底部

**T-416 FilePage.jsx 集成问答模块** ✅
- 右栏新增 AI 问答卡片，位于 AIResultPanel 下方
- 分析完成（status=done）前输入框禁用并提示
- 「清空对话」按钮（有消息时显示）
- 错误信息展示区域

**T-417 full_text token 截断** ✅
- MAX_FULL_TEXT_CHARS = 8000 字符
- 超出时截断并附加提示 `...[内容已截断，仅展示前 8000 字符]`

---

### 4.6 已完成（阶段六：RAG 升级）✅

#### 6.1 基础设施：pgvector + 新表（T-601 ~ T-605）

**T-601 开启 pgvector 扩展** ✅
- `create extension if not exists vector;` 执行成功

**T-602 创建 document_chunks 表** ✅
- 字段：id（uuid PK）、document_id（uuid FK → documents CASCADE DELETE）、content（text）、chunk_index（int）、embedding（vector(1536)）、created_at（timestamptz）
- Migration 文件：`supabase/migrations/20260328_add_document_chunks_for_rag.sql`

**T-603 创建向量索引** ✅
- ivfflat 索引（embedding vector_cosine_ops，lists = 100）
- 普通索引（document_id）

**T-604 配置 RLS 策略** ✅
- 启用行级安全；SELECT 策略通过 document_id 关联 documents.user_id = auth.uid()
- 不创建 INSERT policy，仅 Service Role 可写

**T-605 配置 Embedding API Key** ✅
- 复用现有 `DEEPSEEK_API_KEY`，使用 DeepSeek Embedding（OpenAI 兼容接口）
- API 端点：`https://api.deepseek.com/v1/embeddings`，模型：`deepseek-embedding`

#### 6.2 改造 analyze-file：写入 chunk 向量（T-611 ~ T-615）

**T-611 新建 chunk.ts** ✅
- 路径：`supabase/functions/_shared/chunk.ts`
- 实现 `chunkText(text: string): string[]`
- 500 字符目标长度，50 字符重叠，优先 `\n\n` 断开，最小 100 字符合并

**T-612 新建 embed.ts** ✅
- 路径：`supabase/functions/_shared/embed.ts`
- 实现 `embedChunks(chunks: string[]): Promise<number[][]>`
- 调用 DeepSeek Embedding API，批量返回 1536 维向量，含重试逻辑

**T-613 改造 analyze-file** ✅
- 写入 `ai_results` 后追加分块流程：chunkText → embedChunks → 批量 INSERT document_chunks
- 分块流程独立 try/catch，失败不影响主流程 status = 'done'

**T-614 验证级联删除** ✅
- 删除 document 记录后，对应 document_chunks 自动级联清除

**T-615 重新部署 analyze-file** ✅
- `supabase functions deploy analyze-file --no-verify-jwt`
- 新上传文件分析后，document_chunks 有对应 chunk 记录且 embedding 非 null

#### 6.3 改造 chat-with-file：向量检索替换全文注入（T-621 ~ T-625）

**T-621 embedQuestion 函数** ✅
- 对用户问题调用 embedding API，返回单个 1536 维向量

**T-622 retrieveChunks 函数** ✅
- pgvector 余弦距离查询，`ORDER BY embedding <=> $2 LIMIT 5`
- 限定当前文件 document_id，返回 top-5 相关 chunk

**T-623 替换 Prompt 拼装逻辑** ✅
- 原 full_text 全文注入 → 检索到的 5 个 chunks 拼接
- 每个 chunk 标注 `[段落 {chunk_index}]`
- 相似度全低于阈值时回退：「文档中未找到相关内容」

**T-624 保留多轮对话与 SSE** ✅
- history 数组传入逻辑不变，流式输出正常

**T-625 重新部署 chat-with-file** ✅
- `supabase functions deploy chat-with-file --no-verify-jwt`

#### 6.4 跨文件全局问答（T-631 ~ T-635）

**T-631 新建 chat-global Edge Function** ✅
- 路径：`supabase/functions/chat-global/index.ts`
- JWT 鉴权，接收 `{ question, history }`（无 document_id）
- 问题向量化 → 跨用户所有文件 top-8 检索 → 拼装 Prompt 标注来源 → DeepSeek SSE 透传

**T-632 [SOURCES] 事件** ✅
- SSE 响应末尾追加结构化 `[SOURCES]` 事件，JSON 数组含 document_id 和文件名

**T-633 部署 chat-global** ✅
- `supabase functions deploy chat-global --no-verify-jwt`
- supabase/config.toml 添加 `[functions.chat-global]` verify_jwt = false

**T-634 前端：GlobalChatPanel + DashboardPage 入口** ✅
- DashboardPage 顶部新增「问所有文件」入口按钮
- 新建 `GlobalChatPanel.jsx`：复用 ChatInput + ChatOutput，解析 [SOURCES] 事件，回答下方展示引用来源卡片（文件名 + 跳转链接）

**T-635 存量文件补全** ✅
- 查询 status = 'done' 且无 chunk 记录的历史文件，重新调用 analyze-file 补全向量

---

**T-201 至 T-203：布局与导航**
- 实现 `AppLayout.jsx`：左侧 Sidebar + 主内容区 Outlet
- 实现 `Sidebar.jsx`：导航链接 + 用户头像 + 退出登录
- 实现 `TopBar.jsx`：搜索栏占位 + 用户信息

**T-211 至 T-215：文件上传**
- 实现 `UploadZone.jsx`：拖拽 + 点击选择文件
- 前端文件校验：格式白名单 + 50MB 大小检查
- 实现 `useUpload` hook：Storage 上传 + 进度回调 + 写 documents 表
- 上传进度条 UI

**T-221 至 T-226：文件列表与实时更新**
- 实现 `useDocuments` hook：查询 documents 表
- 订阅 Realtime：监听 INSERT / UPDATE 自动刷新
- 实现 `FileCard.jsx`、`StatusBadge.jsx`、`FileList.jsx`
- 实现完整 `DashboardPage.jsx`

**T-231 至 T-233：文件删除**
- 删除确认弹窗（shadcn AlertDialog）
- 清除 Storage 文件 + 删除数据库记录

### 4.3 环境准备清单

**账号准备：**
- [x] Supabase 账号已创建
- [x] GitHub 账号已创建
- [x] GitHub OAuth App 已配置
- [x] Vercel 账号已创建并部署

**环境变量准备：**
- [x] Supabase Project URL（已配置）
- [x] Supabase anon key（已配置）
- [x] GitHub Client ID（已记录）
- [x] GitHub Client Secret（已记录）
- [ ] DeepSeek API Key（阶段三需要）

---

## 五、风险与注意事项

### 5.1 已知风险

**R-01 GitHub OAuth 回调地址配置**
- 风险：本地开发和生产环境使用不同的回调地址
- 解决方案：
  - 开发阶段：Homepage URL 填 http://localhost:5173
  - 生产部署后：更新为 Vercel URL
  - Supabase Redirect URLs 同时添加两个地址

**R-02 环境变量泄露**
- 风险：.env.local 被提交到 Git
- 解决方案：
  - 确保 .gitignore 包含 .env.local
  - 使用 local/keys.md 本地保存敏感信息（已加入 .gitignore）

**R-03 RLS 策略测试不足**
- 风险：用户 A 可能访问用户 B 的数据
- 解决方案：
  - 阶段五进行完整的 RLS 验收测试
  - 使用两个不同 GitHub 账号测试隔离性

### 5.2 注意事项

1. **Vite 路径别名配置**：需要在 vite.config.js 配置 `@/` 别名，否则 Vercel 构建会失败
2. **shadcn/ui 初始化**：需要安装 `@types/node` 依赖
3. **Supabase Realtime**：需要在 Supabase Dashboard 启用 Realtime（默认已启用）
4. **GitHub OAuth 授权范围**：只需要基础的 user:email 权限

---

## 六、项目里程碑

| 里程碑 | 完成标志 | 预计日期 | 实际日期 | 状态 |
|--------|---------|---------|---------|------|
| M1: 后端基础设施就绪 | T-101 至 T-112 完成 | 2026-03-23 | 2026-03-23 | ✅ 已完成 |
| M2: 前端框架搭建完成 | T-121 至 T-144 完成 | 2026-03-24 | 2026-03-23 | ✅ 已完成 |
| M3: 文件上传功能上线 | 阶段二完成 | 2026-03-27 | 2026-03-25 | ✅ 已完成 |
| M4: AI 分析功能上线 | 阶段三完成 | 2026-03-31 | 2026-03-25 | ✅ 已完成 |
| M5: 搜索与问答上线 | 阶段四完成 | 2026-04-03 | 2026-03-25 | ✅ 已完成 |
| M6: 项目正式发布 | 阶段五完成 | 2026-04-06 | 2026-03-28 | ✅ 已完成 |
| M7: RAG 升级上线 | 阶段六完成 | 2026-04-08 | 2026-03-28 | ✅ 已完成 |

**M2 完成详情：**
- ✅ T-121 至 T-127: 前端项目初始化（7/7 完成）
- ✅ T-131 至 T-135: 认证功能实现（5/5 完成）
- ✅ T-141 至 T-144: CI/CD 配置与 Vercel 部署（4/4 完成）
- ✅ 生产地址：https://ai-file-hub.vercel.app/

---

## 七、当前项目状态

### 7.1 技术栈实际版本

| 技术 | 计划版本 | 实际版本 | 状态 |
|------|---------|---------|------|
| React | 18.x | 19.2.4 | ✅ |
| Vite | 5.x | 5.4.21 | ✅ |
| React Router | 6.x | 7.13.1 | ✅ |
| Tailwind CSS | 3.x | 3.4.19 | ✅ |
| Supabase JS | 2.x | 2.100.0 | ✅ |
| Node.js | 18+ | 22.2.0 | ⚠️ 版本较新 |

### 7.2 开发环境状态

- **开发服务器**: ✅ 运行中 (http://localhost:5173/)
- **生产环境**: ✅ 已上线 (https://ai-file-hub.vercel.app/)
- **前端项目**: ✅ 已初始化完成
- **环境变量**: ✅ 本地 + Vercel 生产均已配置
- **GitHub OAuth**: ✅ 本地 + 生产均验证通过
- **Git 仓库**: ✅ https://github.com/nacheal/ai-file-hub
- **CI/CD**: ✅ GitHub push → Vercel 自动部署

### 7.3 文件统计

```
frontend/
├── 配置文件: 8 个 ✅
├── 源代码文件: 12 个 ✅
├── 组件: 5 个 ✅
├── 页面: 4 个 ✅
├── 总代码行数: ~500 行
```

---

## 八、参考文档

- **PRD.md**：产品需求文档，定义功能需求和验收标准
- **tech.md**：技术架构文档，详细设计数据流和系统架构
- **ai-file-hub-stage1.md**：阶段一操作指南，逐步执行手册
- **todo.md**：完整任务清单，68 个任务的详细分解
- **local/keys.md**：敏感信息本地存储（不提交 Git）

---

**最后更新：** 2026-03-28
**更新人：** AI Assistant
**下次更新：** 无（阶段六为当前最终阶段，T-601 至 T-635 全部完成）
