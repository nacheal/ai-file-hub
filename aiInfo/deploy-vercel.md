# AI File Hub — Vercel 部署指南

**对应任务：** T-141 至 T-144
**日期：** 2026-03-23
**前提：** 代码已推送至 GitHub `main` 分支 ✅

---

## 第一步：在 Vercel 导入项目（T-142）

1. 打开 [vercel.com/new](https://vercel.com/new)，登录后点击 **Add New Project**
2. 选择 **Import Git Repository**，找到 `ai-file-hub` 仓库，点击 **Import**
3. 配置以下构建参数：

| 配置项 | 填写值 |
|--------|--------|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

> ⚠️ **Root Directory 必须填 `frontend`**，因为前端代码在子目录下，不是仓库根目录。

---

## 第二步：配置生产环境变量（T-143）

在 Vercel 项目设置中找到 **Settings → Environment Variables**，添加以下两个变量：

| 变量名 | 值 | Environment |
|--------|----|-------------|
| `VITE_SUPABASE_URL` | 你的 Supabase Project URL | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | 你的 Supabase anon key | Production, Preview, Development |

> 值从 `frontend/.env.local` 文件复制，或登录 Supabase 控制台 → **Project Settings → API** 查看。

添加完成后点击 **Deploy**（或 **Redeploy**）使环境变量生效。

---

## 第三步：处理 SPA 路由（防止刷新 404）

React Router 是单页应用，直接访问 `/dashboard` 等路径会 404。需要在 `frontend/` 目录下创建 `vercel.json`：

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

创建后提交到 GitHub，Vercel 会自动重新部署：

```bash
# 在项目根目录执行
git add frontend/vercel.json
git commit -m "fix: add vercel.json for SPA routing"
git push origin main
```

---

## 第四步：更新 GitHub OAuth App 回调地址

部署成功后，Vercel 会分配一个生产域名（如 `https://ai-file-hub-xxx.vercel.app`）。

需要更新 GitHub OAuth App 配置，否则生产环境无法登录：

1. 打开 GitHub → **Settings → Developer settings → OAuth Apps → AI File Hub**
2. 更新以下字段：
   - **Homepage URL**：`https://ai-file-hub-xxx.vercel.app`
   - **Authorization callback URL**：保持原来的 Supabase 回调地址不变（`https://<project-ref>.supabase.co/auth/v1/callback`）

> Supabase 的回调地址不需要改，因为 OAuth 回调走 Supabase，不走 Vercel。

---

## 第五步：在 Supabase 添加生产环境 Redirect URL

Supabase 需要信任 Vercel 生产域名，才允许登录后跳转回去：

1. 打开 Supabase 控制台 → **Authentication → URL Configuration**
2. 在 **Redirect URLs** 中添加：
   ```
   https://ai-file-hub-xxx.vercel.app/**
   ```
3. 保存

> 原有的 `http://localhost:5173/**` 保留，不要删除（本地开发仍需要）。

---

## 第六步：验收测试（T-144）

部署完成后，逐项验证：

- [ ] 访问 Vercel 生产 URL，能看到登录页
- [ ] 点击「使用 GitHub 登录」，跳转 GitHub 授权页
- [ ] 授权后成功跳转 `/dashboard`，显示「Dashboard（阶段二实现）」
- [ ] 刷新 `/dashboard` 页面不会 404（SPA 路由正常）
- [ ] 登录 Supabase 控制台 → **Authentication → Users**，能看到登录用户记录

全部通过后，T-141 至 T-144 完成，**M2 里程碑达成** ✅

---

## 常见问题

**Q：部署时报错 `Cannot find module` 或构建失败？**
检查 Root Directory 是否填了 `frontend`，以及环境变量是否配置。

**Q：登录后跳转到 `localhost:5173` 而不是 Vercel URL？**
检查 Supabase → URL Configuration 的 **Site URL** 是否已改为 Vercel 生产域名。
路径：**Authentication → URL Configuration → Site URL**

**Q：GitHub 授权页报错 redirect_uri_mismatch？**
说明 GitHub OAuth App 的 callback URL 配置有误，确认填写的是 Supabase 回调地址（`*.supabase.co/auth/v1/callback`），不是 Vercel 地址。

---

## 部署完成后的下一步

M2 完成后，进入 **阶段二：文件上传管道**（T-201 至 T-233）：
- 实现布局（AppLayout、Sidebar、TopBar）
- 实现文件上传（拖拽 + 进度条）
- 接入 Supabase Storage
- 实现文件列表 + Realtime 实时状态更新
- 实现文件删除
