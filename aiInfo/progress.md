# AI File Hub — 项目进度报告

**更新日期：** 2026-03-23 23:00
**当前阶段：** 阶段二（文件上传管道）— 阶段一全部完成 🎉
**完成进度：** T-101 至 T-144 全部完成；生产环境已上线
**生产地址：** https://ai-file-hub.vercel.app/
**下一步：** T-201 至 T-233（布局 + 文件上传 + 列表 + 删除）

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

### 3.3 数据流设计

**文件上传流程：**
```
用户拖拽文件
  → 前端校验（格式/大小）
  → Storage.upload()
  → documents.insert() (status='pending')
  → Edge Function: analyze-file
  → 更新 status='processing'
  → 下载文件 → 提���文本
  → 调用 DeepSeek API
  → ai_results.insert()
  → 更新 status='done'
  → Realtime 推送至前端
```

**AI 问答流程：**
```
用户输入问题
  → Edge Function: chat-with-file
  → 查询 ai_results.full_text
  → 组装 Prompt
  → DeepSeek API (stream: true)
  → SSE 流式返回
  → 前端逐 token 渲染
```

---

## 四、下一步行动计划

### 4.1 阶段一验收结果 ✅

**全部通过：**
- [x] 本地 `npm run dev` 能打开登录页
- [x] 点击「使用 GitHub 登录」能跳转授权
- [x] 授权后跳转 /dashboard，显示「Dashboard（阶段二实现）」
- [x] Vercel 线上地址能完整走通登录流程
- [x] Vercel 环境变量已配置，构建正常

### 4.2 立即开始（阶段二：文件上传管道）

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
| M3: 文件上传功能上线 | 阶段二完成 | 2026-03-27 | - | 🔄 进行中 |
| M4: AI 分析功能上线 | 阶段三完成 | 2026-03-31 | - | ⏳ 待开始 |
| M5: 搜索与问答上线 | 阶段四完成 | 2026-04-03 | - | ⏳ 待开始 |
| M6: 项目正式发布 | 阶段五完成 | 2026-04-06 | - | ⏳ 待开始 |

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

**最后更新：** 2026-03-23 23:00
**更新人：** AI Assistant
**下次更新：** 完成阶段二（T-201 至 T-233）后
