# AI File Hub — 阶段一操作指南：地基搭建

**版本：** v1.0
**日期：** 2026-03-18
**预计工时：** 3 天
**操作平台：** supabase.com · github.com

---

## 任务总览

| 任务编号 | 任务名称 | 类型 |
|----------|----------|------|
| T-101 | 创建 Supabase 项目 | 基础设施 |
| T-102 | 建表：documents | 数据库 |
| T-103 | 建表：ai_results | 数据库 |
| T-104 | 配置 RLS 策略（documents 表） | 数据库 |
| T-105 | 配置 RLS 策略（ai_results 表） | 数据库 |
| T-106 | 创建全文搜索 GIN 索引 | 数据库 |
| T-107 | 创建 Storage Bucket | Supabase |
| T-108 | 配置 Storage Bucket RLS 策略 | Supabase |
| T-111 | 在 GitHub 创建 OAuth App | 基础设施 |
| T-112 | 在 Supabase 启用 GitHub Provider | Supabase |
| T-121 | 用 Vite 创建 React 项目 | 前端 |
| T-122 | 安装核心依赖 | 前端 |
| T-123 | 配置 Tailwind CSS | 前端 |
| T-124 | 初始化 shadcn/ui | 前端 |
| T-125 | 创建 supabase.js 客户端单例 | 前端 |
| T-126 | 配置 .env.local | 基础设施 |
| T-127 | 搭建基础目录结构 | 前端 |
| T-131 | 创建 AuthContext.jsx | 前端 |
| T-132 | 实现 LoginPage.jsx | 前端 |
| T-133 | 实现 ProtectedRoute.jsx | 前端 |
| T-134 | 配置 React Router（App.jsx） | 前端 |
| T-135 | 实现登出功能 | 前端 |
| T-141 | 创建 GitHub 仓库并推送初始代码 | 基础设施 |
| T-142 | 在 Vercel 导入 GitHub 仓库 | 基础设施 |
| T-143 | 在 Vercel 配置生产环境变量 | 基础设施 |
| T-144 | 验收：push 代码触发自动部署 | 基础设施 |

---

## T-101 · 创建 Supabase 项目

打开 [supabase.com](https://supabase.com)，登录后点击右上角 **New Project**。

填写以下信息：

| 字段 | 填写内容 |
|------|---------|
| Project name | `ai-file-hub` |
| Database Password | 设一个强密码，**务必保存好** |
| Region | **Southeast Asia (Singapore)**，离新加坡最近，延迟最低 |

点击 **Create new project**，等待约 1 分钟初始化完成。

完成后，进入项目点击左侧 **Settings → API**，复制以下两个值备用：

```
Project URL:  https://xxxxxxxxxxxx.supabase.co
anon public:  eyJhbGciOiJIUzI1NiIsInR5c...（很长的字符串）
```

> ⚠️ 这两个值后面配置前端 `.env.local` 时会用到，先存到记事本里。

---

## T-102 · T-103 · 建表 SQL

左侧点击 **SQL Editor → New query**，把下面这段 SQL **完整粘贴进去**，点击 **Run**：

```sql
-- 文档主表
create table documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  name         text not null,
  size         bigint not null,
  mime_type    text not null,
  storage_path text not null,
  status       text not null default 'pending',
  created_at   timestamptz default now()
);

-- AI 分析结果表
create table ai_results (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid references documents on delete cascade not null,
  summary     text,
  key_points  text[],
  tags        text[],
  full_text   text,
  created_at  timestamptz default now()
);
```

**验证：** 左侧点击 **Table Editor**，能看到 `documents` 和 `ai_results` 两张表即成功。

---

## T-104 · T-105 · 配置 RLS 策略

SQL Editor 里新建一个 query，粘贴以下内容，点击 **Run**：

```sql
-- ========== documents 表 RLS ==========
alter table documents enable row level security;

create policy "用户查看自己的文件"
  on documents for select
  using (auth.uid() = user_id);

create policy "用户上传自己的文件"
  on documents for insert
  with check (auth.uid() = user_id);

create policy "用户更新自己的文件"
  on documents for update
  using (auth.uid() = user_id);

create policy "用户删除自己的文件"
  on documents for delete
  using (auth.uid() = user_id);

-- ========== ai_results 表 RLS ==========
alter table ai_results enable row level security;

create policy "用户查看自己文件的分析结果"
  on ai_results for select
  using (
    exists (
      select 1 from documents
      where documents.id = ai_results.document_id
        and documents.user_id = auth.uid()
    )
  );
```

**验证：** 左侧进入 **Authentication → Policies**，能看到两张表各自的策略列表即成功。

> 💡 RLS 是什么：Row Level Security（行级安全），在数据库层面保证用户 A 的数据查询自动过滤，永远拿不到用户 B 的数据。这是本项目安全的核心机制。

---

## T-106 · 创建全文搜索索引

SQL Editor 新建 query，粘贴以下内容，点击 **Run**：

```sql
-- 文件名搜索索引
create index idx_documents_name_fts
  on documents
  using gin(to_tsvector('simple', name));

-- AI 摘要 + 要点搜索索引
create index idx_ai_results_content_fts
  on ai_results
  using gin(
    to_tsvector(
      'simple',
      coalesce(summary, '') || ' ' ||
      coalesce(array_to_string(key_points, ' '), '')
    )
  );

-- 列表页高频查询索引（按用户 + 时间倒序）
create index idx_documents_user_created
  on documents(user_id, created_at desc);
```

**验证：** 运行后无报错即成功。可在 **Database → Indexes** 页面查看已创建的索引列表。

---

## T-107 · 创建 Storage Bucket

左侧点击 **Storage → New bucket**，填写：

| 字段 | 值 |
|------|---|
| Bucket name | `user-files` |
| Public bucket | **关闭**（保持私有） |
| File size limit | `52428800`（50MB，单位字节） |
| Allowed MIME types | 见下方 |

Allowed MIME types 填写（逗号分隔）：

```
image/png,image/jpeg,image/webp,application/pdf,text/plain,text/markdown
```

点击 **Save** 创建 Bucket。

---

## T-108 · 配置 Storage Bucket RLS 策略

点击刚创建的 `user-files` bucket，点击右上角 **Policies**，分别添加以下三条策略。

每条策略操作步骤：点击 **New policy → For full customization**，填写 Policy name 和 Policy definition，点击 **Review** → **Save policy**。

---

**Policy 1：SELECT（读取 / 下载文件）**

- Policy name：`用户读取自己的文件`
- Allowed operation：`SELECT`
- Policy definition：

```sql
(auth.uid())::text = (storage.foldername(name))[1]
```

---

**Policy 2：INSERT（上传文件）**

- Policy name：`用户上传自己的文件`
- Allowed operation：`INSERT`
- Policy definition：

```sql
(auth.uid())::text = (storage.foldername(name))[1]
```

---

**Policy 3：DELETE（删除文件）**

- Policy name：`用户删除自己的文件`
- Allowed operation：`DELETE`
- Policy definition：

```sql
(auth.uid())::text = (storage.foldername(name))[1]
```

---

> 💡 策略逻辑说明：文件上传路径格式为 `{user_id}/{document_id}/{filename}`，策略检查路径第一段是否等于当前登录用户的 `uid`，保证用户只能操作自己目录下的文件。

---

## T-111 · 在 GitHub 创建 OAuth App

打开 [github.com/settings/developers](https://github.com/settings/developers)，点击 **New OAuth App**：

| 字段 | 填写内容 |
|------|---------|
| Application name | `AI File Hub` |
| Homepage URL | `http://localhost:5173`（开发阶段先填本地，上线后改为 Vercel URL） |
| Authorization callback URL | 见下方获取方式 |

**获取 Callback URL：**
在 Supabase 项目里，进入 **Authentication → Providers → GitHub**，页面上有一行：
```
Callback URL (for OAuth): https://xxxxxxxxxxxx.supabase.co/auth/v1/callback
```
将这个地址复制到 GitHub OAuth App 的 Authorization callback URL 字段。

点击 **Register application**，在下一个页面点击 **Generate a new client secret**。

将以下两个值记录备用：

```
Client ID:     Ov23xxxxxxxxxxxxx
Client Secret: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> ⚠️ Client Secret 只显示一次，页面离开后无法再查看，务必立即保存。

---

## T-112 · 在 Supabase 启用 GitHub Provider

回到 Supabase，进入 **Authentication → Providers → GitHub**：

| 字段 | 填写内容 |
|------|---------|
| Client ID | 填入上一步记录的 Client ID |
| Client Secret | 填入上一步记录的 Client Secret |

点击 **Save**，页面显示 GitHub Provider 状态为 **Enabled** 即成功。

---

## T-121 · 用 Vite 创建 React 项目

打开终端，在你想存放项目的目录下运行：

```bash
npm create vite@latest ai-file-hub -- --template react
cd ai-file-hub
npm install
```

运行完成后执行以下命令，浏览器打开 `http://localhost:5173` 看到 Vite 默认页面即成功：

```bash
npm run dev
```

---

## T-122 · 安装核心依赖

```bash
# Supabase 客户端 SDK
npm install @supabase/supabase-js

# 路由
npm install react-router-dom

# Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## T-123 · 配置 Tailwind CSS

**第一步**，编辑 `tailwind.config.js`，将 content 字段改为：

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**第二步**，编辑 `src/index.css`，将文件内容**全部替换**为：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## T-124 · 初始化 shadcn/ui

```bash
npx shadcn-ui@latest init
```

命令行会提问几个配置选项，按以下选择：

| 问题 | 选择 |
|------|------|
| Which style would you like to use? | `Default` |
| Which color would you like to use as base color? | `Slate` |
| Where is your global CSS file? | `src/index.css` |
| Would you like to use CSS variables for colors? | `Yes` |
| Where is your tailwind.config.js located? | `tailwind.config.js` |
| Configure the import alias for components? | `@/components` |
| Configure the import alias for utils? | `@/lib/utils` |

初始化完成后，安装后续会用到的组件：

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add alert-dialog
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add avatar
```

---

## T-125 · 创建 Supabase 客户端单例

创建文件 `src/lib/supabase.js`，写入以下内容：

```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

> 💡 `createClient` 只调用一次，导出单例对象，整个项目所有地方都从这里 import，不要重复创建。

---

## T-126 · 配置 .env.local

在项目根目录（和 `package.json` 同级）创建文件 `.env.local`，写入：

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5c...
```

将两个值替换为 T-101 中从 Supabase 复制的实际值。

然后确认 `.gitignore` 文件中包含以下行（Vite 默认已包含）：

```
.env.local
```

> ⚠️ `.env.local` 永远不能提交到 Git 仓库，里面的 key 属于敏感信息。

---

## T-127 · 搭建基础目录结构

在 `src/` 目录下创建以下文件夹和文件：

```
src/
├── lib/
│   ├── supabase.js        ← 已在 T-125 创建
│   └── utils.js           ← 新建，暂时留空
├── contexts/
│   └── AuthContext.jsx    ← 新建，T-131 填充内容
├── hooks/
│   ├── useAuth.js         ← 新建，暂时留空
│   ├── useDocuments.js    ← 新建，暂时留空
│   ├── useUpload.js       ← 新建，暂时留空
│   └── useChat.js         ← 新建，暂时留空
├── pages/
│   ├── LoginPage.jsx      ← 新建，T-132 填充内容
│   ├── DashboardPage.jsx  ← 新建，暂时留空
│   ├── FilePage.jsx       ← 新建，暂时留空
│   └── SearchPage.jsx     ← 新建，暂时留空
├── components/
│   ├── layout/
│   │   ├── AppLayout.jsx  ← 新建，暂时留空
│   │   ├── Sidebar.jsx    ← 新建，暂时留空
│   │   └── TopBar.jsx     ← 新建，暂时留空
│   ├── file/
│   │   ├── FileCard.jsx   ← 新建，暂时留空
│   │   ├── FileList.jsx   ← 新建，暂时留空
│   │   ├── UploadZone.jsx ← 新建，暂时留空
│   │   └── FilePreview.jsx← 新建，暂时留空
│   ├── ai/
│   │   ├── AIResultPanel.jsx ← 新建，暂时留空
│   │   ├── ChatInput.jsx     ← 新建，暂时留空
│   │   └── ChatOutput.jsx    ← 新建，暂时留空
│   └── ui/
│       └── StatusBadge.jsx   ← 新建，暂时留空
└── guards/
    └── ProtectedRoute.jsx    ← 新建，T-133 填充内容
```

用以下命令快速创建所有目录和空文件：

```bash
mkdir -p src/contexts src/hooks src/pages src/guards
mkdir -p src/components/layout src/components/file
mkdir -p src/components/ai src/components/ui

touch src/lib/utils.js
touch src/contexts/AuthContext.jsx
touch src/hooks/useAuth.js src/hooks/useDocuments.js
touch src/hooks/useUpload.js src/hooks/useChat.js
touch src/pages/LoginPage.jsx src/pages/DashboardPage.jsx
touch src/pages/FilePage.jsx src/pages/SearchPage.jsx
touch src/components/layout/AppLayout.jsx
touch src/components/layout/Sidebar.jsx
touch src/components/layout/TopBar.jsx
touch src/components/file/FileCard.jsx
touch src/components/file/FileList.jsx
touch src/components/file/UploadZone.jsx
touch src/components/file/FilePreview.jsx
touch src/components/ai/AIResultPanel.jsx
touch src/components/ai/ChatInput.jsx
touch src/components/ai/ChatOutput.jsx
touch src/components/ui/StatusBadge.jsx
touch src/guards/ProtectedRoute.jsx
```

---

## T-131 · 创建 AuthContext.jsx

编辑 `src/contexts/AuthContext.jsx`，写入以下内容：

```jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 获取当前会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 监听登录 / 登出状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

---

## T-132 · 实现 LoginPage.jsx

编辑 `src/pages/LoginPage.jsx`，写入以下内容：

```jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  // 已登录则跳转主页
  useEffect(() => {
    if (!loading && user) navigate('/dashboard')
  }, [user, loading, navigate])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
  }

  if (loading) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-gray-900">AI File Hub</h1>
          <p className="text-gray-500">你的私有 AI 文件助手</p>
        </div>
        <Button onClick={handleLogin} size="lg" className="gap-2">
          使用 GitHub 登录
        </Button>
      </div>
    </div>
  )
}
```

---

## T-133 · 实现 ProtectedRoute.jsx

编辑 `src/guards/ProtectedRoute.jsx`，写入以下内容：

```jsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  // 认证状态加载中，暂不跳转
  if (loading) return null

  // 未登录，跳转登录页
  if (!user) return <Navigate to="/" replace />

  // 已登录，渲染子路由
  return <Outlet />
}
```

---

## T-134 · 配置 React Router（App.jsx）

将 `src/App.jsx` 内容**全部替换**为：

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/guards/ProtectedRoute'
import LoginPage     from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import FilePage      from '@/pages/FilePage'
import SearchPage    from '@/pages/SearchPage'

// 暂时用占位组件，后续阶段逐步实现
function AppLayout({ children }) {
  return <div className="min-h-screen">{children}</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 公开路由 */}
          <Route path="/" element={<LoginPage />} />

          {/* 受保护路由 */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/file/:id"  element={<FilePage />} />
            <Route path="/search"    element={<SearchPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

同时给三个暂未实现的页面加上最简占位内容，避免报错。

`src/pages/DashboardPage.jsx`：
```jsx
export default function DashboardPage() {
  return <div className="p-8">Dashboard（阶段二实现）</div>
}
```

`src/pages/FilePage.jsx`：
```jsx
export default function FilePage() {
  return <div className="p-8">File Detail（阶段三实现）</div>
}
```

`src/pages/SearchPage.jsx`：
```jsx
export default function SearchPage() {
  return <div className="p-8">Search（阶段四实现）</div>
}
```

---

## T-135 · 实现登出功能

在 `src/lib/utils.js` 中添加登出函数：

```js
import { supabase } from '@/lib/supabase'

export async function signOut() {
  await supabase.auth.signOut()
}
```

> 后续 Sidebar 组件里直接调用 `signOut()`，点击退出登录按钮时执行，Auth 状态监听会自动清除会话并跳转登录页。

---

## T-141 · 创建 GitHub 仓库并推送代码

在 [github.com/new](https://github.com/new) 创建新仓库：

| 字段 | 值 |
|------|---|
| Repository name | `ai-file-hub` |
| Visibility | `Private`（推荐，个人学习项目） |
| Initialize repository | **不勾选**（本地已有代码） |

创建后，在本地项目根目录运行：

```bash
git init
git add .
git commit -m "chore: 项目初始化，完成阶段一地基搭建"
git branch -M main
git remote add origin https://github.com/你的用户名/ai-file-hub.git
git push -u origin main
```

---

## T-142 · 在 Vercel 导入 GitHub 仓库

打开 [vercel.com/new](https://vercel.com/new)，点击 **Import Git Repository**，选择刚刚创建的 `ai-file-hub` 仓库。

配置如下：

| 字段 | 值 |
|------|---|
| Framework Preset | `Vite` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

暂时先点击 **Deploy**，先让 Vercel 完成第一次部署（环境变量下一步配置）。

---

## T-143 · 在 Vercel 配置生产环境变量

部署完成后，进入 Vercel 项目页面，点击 **Settings → Environment Variables**，添加以下两条：

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | 你的 Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | 你的 Supabase anon key |

添加完成后，点击 **Deployments → 最新一次部署 → Redeploy**，让环境变量生效。

同时，回到 GitHub OAuth App 设置页，将 Homepage URL 更新为你的 Vercel 线上地址：

```
https://ai-file-hub-xxx.vercel.app
```

---

## T-144 · 验收：完整登录流程测试

访问你的 Vercel 线上地址，完成以下测试：

1. 打开页面，看到登录界面
2. 点击「使用 GitHub 登录」，跳转 GitHub 授权页面
3. 授权后自动跳转回 `/dashboard`，显示「Dashboard（阶段二实现）」占位文字
4. 关闭浏览器重新打开，直接进入 `/dashboard`（会话保持）
5. 在 Supabase **Authentication → Users** 页面，能看到你的 GitHub 账号已注册

全部通过即阶段一完成。

---

## 阶段一验收清单

```
[ ] T-101  Supabase 项目已创建，记录了 Project URL 和 anon key
[ ] T-102  Table Editor 能看到 documents 表，字段完整
[ ] T-103  Table Editor 能看到 ai_results 表，字段完整
[ ] T-104  documents 表有 4 条 RLS 策略（select/insert/update/delete）
[ ] T-105  ai_results 表有 1 条 RLS 策略（select）
[ ] T-106  Database → Indexes 能看到 3 条自定义索引
[ ] T-107  Storage 有 user-files bucket，状态为 Private
[ ] T-108  user-files bucket 有 3 条 Storage Policy
[ ] T-111  GitHub OAuth App 已创建，Callback URL 填写正确
[ ] T-112  Supabase GitHub Provider 状态为 Enabled
[ ] T-121  本地 npm run dev 能打开 Vite 默认页面
[ ] T-122  依赖已安装，node_modules 无报错
[ ] T-123  Tailwind CSS 配置完成，类名生效
[ ] T-124  shadcn/ui 初始化完成，组件已安装
[ ] T-125  src/lib/supabase.js 存在，createClient 已配置
[ ] T-126  .env.local 存在，已加入 .gitignore
[ ] T-127  src/ 下各目录和占位文件已创建
[ ] T-131  AuthContext 已实现，监听 onAuthStateChange
[ ] T-132  LoginPage 已实现，GitHub 登录按钮可点击
[ ] T-133  ProtectedRoute 已实现，未登录跳转 /
[ ] T-134  React Router 路由配置完成，4 个路由可访问
[ ] T-135  登出函数已实现
[ ] T-141  GitHub 仓库已创建，代码已推送 main 分支
[ ] T-142  Vercel 已导入仓库，完成第一次部署
[ ] T-143  Vercel 生产环境变量已配置，已 Redeploy
[ ] T-144  线上地址 GitHub 登录流程完整跑通
```

---

## 常见问题

**Q：GitHub 授权后跳回本地 localhost 而不是 Vercel？**

检查 Supabase **Authentication → URL Configuration → Site URL**，确保填写的是你的 Vercel 线上地址而不是 localhost。本地开发时在 Redirect URLs 里额外添加 `http://localhost:5173`。

**Q：点击登录后页面空白没反应？**

打开浏览器控制台（F12），查看 Console 报错。最常见原因是 `.env.local` 里的 key 填错了，或者 Supabase GitHub Provider 没有保存成功。

**Q：Vercel 构建失败？**

检查构建日志，最常见原因是 `@/` 路径别名未配置。在 `vite.config.js` 里添加：

```js
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

同时安装 `@types/node`：`npm install -D @types/node`

---

*阶段一完成后，进入阶段二：文件上传管道*
