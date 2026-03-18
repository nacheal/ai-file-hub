# AI File Hub — 产品需求文档（PRD）

**版本：** v1.0  
**日期：** 2026-03-18  
**状态：** 待开发  

---

## 1. 项目概述

### 1.1 项目背景

AI File Hub 是一个面向个人用户的私有云文件空间，允许用户上传文件与图片，并通过 AI 对文件内容进行智能分析、摘要生成与问答交互。项目以学习全栈开发为核心目标，覆盖认证、存储、数据库、实时通信、边缘函数与 AI 集成等完整技术链路。

### 1.2 项目目标

- 交付一个可登录、可上传、可搜索、可 AI 问答的全栈 Web 应用
- 完整覆盖所选技术栈的核心能力，作为全栈学习的实战项目
- 部署至生产环境（Vercel），可通过公网访问

### 1.3 目标用户

个人开发者或学习者，用于管理和查询自己上传的文件与文档。

---

## 2. 功能需求

### 2.1 用户认证（Auth）

**F-01 GitHub OAuth 登录**
- 用户可通过点击「使用 GitHub 登录」按钮发起 OAuth 2.0 授权流程
- 授权成功后自动创建用户账户并颁发 JWT，保持登录状态
- 用户可点击「退出登录」清除会话，跳转至登录页

**F-02 路由守卫**
- 未登录用户访问任何页面时，自动跳转至登录页
- 已登录用户访问登录页时，自动跳转至主页

---

### 2.2 文件上传（Upload）

**F-03 文件上传**
- 支持拖拽或点击选择文件上传
- 支持的文件格式：PDF、Markdown（.md）、TXT、PNG、JPG、JPEG、WEBP
- 单文件大小上限：**50 MB**
- 上传时实时显示进度条（百分比）
- 上传成功后，文件列表自动刷新（通过 Realtime WebSocket，无需手动刷新页面）
- 上传失败时显示明确的错误提示（如文件过大、格式不支持、网络错误）

**F-04 文件元数据存储**
- 每次上传成功后，在数据库记录以下元数据：文件名、文件大小、MIME 类型、Storage 路径、上传时间、所属用户 ID、AI 分析状态（`pending` / `processing` / `done` / `error`）

---

### 2.3 文件管理（File Management）

**F-05 文件列表**
- 登录后默认展示当前用户所有文件，按上传时间倒序排列
- 列表展示字段：文件名、文件类型图标、文件大小、上传时间、AI 分析状态标签
- 列表支持按文件名关键词实时过滤（前端过滤，无需请求接口）

**F-06 文件预览**
- 图片文件（PNG/JPG/WEBP）点击后可在页面内预览原图
- 其他文件类型（PDF/TXT/MD）点击后打开 Storage CDN 链接，在新标签页访问

**F-07 文件删除**
- 用户可删除自己的文件，删除操作需二次确认弹窗
- 删除后同步清除 Storage 中的原文件与数据库中的元数据
- 已删除文件的 AI 分析结果一并清除

---

### 2.4 AI 内容分析（AI Analysis）

**F-08 自动触发分析**
- 文件上传完成后，自动调用 Edge Function 发起 AI 分析流程（异步，不阻塞上传）
- AI 分析状态变化（`pending → processing → done / error`）通过 Realtime 实时推送至前端

**F-09 AI 分析内容**
- 对文本类文件（PDF 提取文本、TXT、MD），AI 生成以下内容：
  - **一句话摘要**（≤50 字）
  - **核心要点**（3～5 条）
  - **文件类型标签**（如：技术文档、合同、笔记、报告等）
- 对图片类文件（PNG/JPG/WEBP），AI 生成：
  - **图片描述**（描述图片内容）
  - **图片类别标签**（如：截图、照片、图表等）
- AI 分析结果持久化存入数据库，不重复调用

**F-10 AI 问答**
- 用户可在文件详情页输入自然语言问题，针对该文件的内容进行问答
- 问答基于文件全文内容作为上下文（非 RAG，直接注入 Prompt）
- 回答以流式方式逐字输出（Streaming）
- 每次问答历史记录保留在当前会话中（刷新后清空，不持久化）

---

### 2.5 搜索（Search）

**F-11 全文关键词搜索**
- 顶部导航栏提供全局搜索框
- 搜索范围：文件名 + AI 分析生成的摘要与要点文本
- 使用 PostgreSQL 全文搜索（`tsvector` + `tsquery`），支持中英文关键词
- 搜索结果高亮匹配关键词，点击结果跳转至文件详情页

---

### 2.6 实时通信（Realtime）

**F-12 文件列表实时更新**
- 通过 Supabase Realtime 订阅 `documents` 表变更
- 新文件上传成功后，列表页自动追加新条目，无需刷新
- 文件 AI 分析状态变更后，列表页对应条目的状态标签实时更新

---

## 3. 非功能需求

| 类别 | 要求 |
|------|------|
| 安全 | 所有数据库表启用 RLS，用户只能读写自己的数据；AI API Key 仅在 Edge Function 服务端持有，不暴露前端 |
| 性能 | 文件列表首屏加载 ≤ 2 秒；AI 分析首字节响应 ≤ 5 秒 |
| 可用性 | 错误状态有明确用户提示，不出现白屏崩溃 |
| 响应式 | 支持桌面端（≥1024px）与移动端（≥375px）布局 |
| 环境隔离 | 本地开发与 Vercel 生产环境使用独立的 `.env` 配置 |

---

## 4. 技术栈

### 4.1 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| Vite | 5.x | 构建工具与开发服务器 |
| React Router | 6.x | 客户端路由 |
| Tailwind CSS | 3.x | 样式框架 |
| shadcn/ui | latest | UI 组件库（基于 Radix UI） |
| @supabase/supabase-js | 2.x | Supabase 客户端 SDK |

### 4.2 后端即服务（BaaS）

| 技术 | 用途 |
|------|------|
| Supabase Auth | 用户认证，GitHub OAuth 2.0，JWT 管理 |
| Supabase PostgreSQL | 关系型数据库，存储文件元数据与 AI 分析结果 |
| Supabase Storage | 文件原始内容存储，S3 兼容，CDN 加速 |
| Supabase Realtime | WebSocket 推送，文件状态实时更新 |
| Supabase Edge Functions | 服务端逻辑，文件解析与 AI 调用（Deno + TypeScript） |

### 4.3 AI 服务

| 技术 | 用途 |
|------|------|
| DeepSeek API | 文件内容分析（摘要、要点、标签），文件问答，流式输出 |
| 模型 | `deepseek-chat`（问答与分析） |

### 4.4 基础设施

| 技术 | 用途 |
|------|------|
| Vercel | 前端托管，自动 CI/CD（GitHub push 触发部署） |
| GitHub | 代码仓库，OAuth 身份提供商 |
| dotenv / Vercel Env | 环境变量管理，区分本地与生产 |

---

## 5. 数据库设计

### 5.1 表结构

```sql
-- 启用向量扩展（备用，本项目暂不使用）
-- create extension if not exists vector;

-- 文档主表
create table documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  name         text not null,                   -- 原始文件名
  size         bigint not null,                  -- 文件大小（字节）
  mime_type    text not null,                    -- MIME 类型
  storage_path text not null,                    -- Storage bucket 内路径
  status       text not null default 'pending',  -- pending|processing|done|error
  created_at   timestamptz default now()
);

-- AI 分析结果表
create table ai_results (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid references documents on delete cascade not null,
  summary     text,                              -- 一句话摘要
  key_points  text[],                            -- 核心要点数组
  tags        text[],                            -- 标签数组
  full_text   text,                              -- 提取的原始文本（用于问答上下文）
  created_at  timestamptz default now()
);

-- 全文搜索索引
create index documents_name_search on documents
  using gin(to_tsvector('simple', name));

create index ai_results_content_search on ai_results
  using gin(to_tsvector('simple', coalesce(summary,'') || ' ' || coalesce(array_to_string(key_points,' '),'')));
```

### 5.2 RLS 策略

```sql
-- documents 表
alter table documents enable row level security;

create policy "用户只能查看自己的文件"
  on documents for select using (auth.uid() = user_id);

create policy "用户只能插入自己的文件"
  on documents for insert with check (auth.uid() = user_id);

create policy "用户只能删除自己的文件"
  on documents for delete using (auth.uid() = user_id);

create policy "用户只能更新自己的文件"
  on documents for update using (auth.uid() = user_id);

-- ai_results 表（通过 document_id 关联 user_id）
alter table ai_results enable row level security;

create policy "用户只能查看自己文件的分析结果"
  on ai_results for select
  using (exists (
    select 1 from documents
    where documents.id = ai_results.document_id
    and documents.user_id = auth.uid()
  ));
```

### 5.3 Storage Bucket 配置

```
Bucket 名称：user-files
访问类型：Private（私有，通过 signed URL 访问）
文件大小上限：50 MB
允许的 MIME 类型：image/png, image/jpeg, image/webp,
                   application/pdf, text/plain, text/markdown
```

---

## 6. 系统架构

```
用户浏览器
    │
    │  HTTPS
    ▼
Vercel（React SPA）
    │
    │  supabase-js SDK
    ├──────────────────────────────────────────────┐
    │                                              │
    ▼                                              ▼
Supabase Auth                              Supabase Storage
（GitHub OAuth → JWT）                    （原始文件 + CDN）
    │                                              │
    │                                              │ 上传完成触发
    ▼                                              ▼
Supabase PostgreSQL              Supabase Edge Function（Deno）
（documents + ai_results）            │
    │                                 ├── 解析文件内容（PDF/TXT/MD）
    │  Realtime WebSocket             ├── 调用 DeepSeek API
    ▼                                 └── 将分析结果写回 PostgreSQL
浏览器实时更新
```

---

## 7. 页面与路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 登录页 | 未登录默认跳转，GitHub OAuth 入口 |
| `/dashboard` | 主页（文件列表） | 登录后默认页，展示所有文件 |
| `/file/:id` | 文件详情页 | AI 分析结果 + 问答交互 |
| `/search` | 搜索结果页 | 关键词搜索结果列表 |

---

## 8. UI 设计规范

### 8.1 设计风格

- 整体风格：简洁、专业，参考 Linear / Notion 的视觉语言
- 色彩：以中性灰为主色调，蓝色作为主要操作色（Primary），绿色表示成功，红色表示错误
- 字体：系统默认无衬线字体（`-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`）

### 8.2 核心组件

| 组件 | 说明 |
|------|------|
| FileCard | 文件列表中的单个文件卡片，展示图标、名称、状态标签 |
| UploadZone | 拖拽上传区域，含进度条 |
| StatusBadge | AI 分析状态标签（pending/processing/done/error），含颜色区分 |
| AIResultPanel | 文件详情页右侧面板，展示摘要、要点、标签 |
| ChatInput | 问答输入框，含发送按钮与流式输出展示区 |
| SearchBar | 顶部全局搜索框 |

### 8.3 响应式断点

| 断点 | 布局 |
|------|------|
| ≥ 1024px（桌面） | 左侧导航栏 + 主内容区双栏布局 |
| < 1024px（移动） | 顶部导航 + 全宽内容区单栏布局 |

---

## 9. 开发阶段规划

| 阶段 | 内容 | 预计工时 |
|------|------|----------|
| 阶段一：地基 | Supabase 项目初始化、建表、GitHub OAuth、Vite + React 初始化、Vercel 部署 | 3 天 |
| 阶段二：上传管道 | 文件上传 UI、Storage 接入、元数据写库、Realtime 订阅、状态实时更新 | 3 天 |
| 阶段三：AI 分析 | Edge Function 编写、DeepSeek API 接入、文件解析、分析结果存库与展示 | 4 天 |
| 阶段四：搜索与问答 | 全文搜索、文件详情页、AI 流式问答 | 3 天 |
| 阶段五：打磨上线 | UI 美化（shadcn/ui）、错误处理、RLS 安全检查、移动端适配 | 3 天 |

**总计预估工时：16 天（业余时间）**

---

## 10. 验收标准

项目交付时，需满足以下全部条件：

- [ ] 可通过公网 URL 访问（Vercel 生产环境）
- [ ] GitHub OAuth 登录/登出流程正常
- [ ] 可上传 PDF、TXT、MD、图片文件，上传后列表实时刷新
- [ ] 文件列表展示正确，支持关键词过滤
- [ ] 文件可正常删除（Storage + 数据库同步清除）
- [ ] 上传后自动触发 AI 分析，分析状态实时更新
- [ ] 文件详情页展示 AI 摘要、要点、标签
- [ ] 文件详情页支持 AI 问答，回答流式输出
- [ ] 全文搜索返回结果正确，关键词高亮
- [ ] RLS 策略生效：用 A 账号无法访问 B 账号的文件（可通过 Supabase SQL Editor 验证）
- [ ] 所有 AI API Key 不暴露在前端代码或浏览器网络请求中
- [ ] 本地 `.env.local` 与 Vercel 生产环境变量独立配置

---

## 11. 环境变量清单

### 前端（`.env.local`）

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Edge Function（Supabase Secrets）

```env
DEEPSEEK_API_KEY=your-deepseek-api-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> 注意：`DEEPSEEK_API_KEY` 和 `SERVICE_ROLE_KEY` 仅在 Edge Function 服务端使用，绝不写入前端环境变量。

---

*文档结束*
