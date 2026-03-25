# Supabase CLI 安装指南（macOS Apple Silicon）

**系统信息：**
- 操作系统：macOS (Darwin 24.6.0)
- 架构：arm64 (Apple Silicon)
- Node.js：v22.2.0
- npm：10.7.0
- Homebrew：已安装 (/opt/homebrew/bin/brew)

---

## 方案一：使用 npx（推荐 ⭐，无需安装）

**优点：**
- 无需安装，直接使用
- 每次自动使用最新版本
- 适合临时使用和快速开始

**使用方法：**
```bash
# 初始化项目（在项目根目录运行）
npx supabase init

# 启动本地开发环境
npx supabase start

# 查看帮助
npx supabase --help
```

**注意：**
- 每次运行都会下载，首次运行可能较慢
- 如果网络不稳定，可能需要多次尝试

---

## 方案二：手动下载二进制文件（推荐 ⭐⭐）

**优点：**
- 一次下载，永久使用
- 不依赖包管理器
- 适合网络不稳定的环境

**安装步骤：**

### 步骤 1：下载二进制文件

访问 Supabase CLI Releases 页面：
```
https://github.com/supabase/cli/releases/latest
```

在 Assets 列表中找到并下载：
```
supabase_darwin_arm64.tar.gz
```

**国内加速下载（可选）：**
如果 GitHub 下载慢，可以使用镜像加速：
```bash
# 使用 ghproxy.com 镜像（示例，请替换版本号）
wget https://mirror.ghproxy.com/https://github.com/supabase/cli/releases/download/v2.5.1/supabase_darwin_arm64.tar.gz
```

### 步骤 2：解压并安装

```bash
# 进入下载目录（假设在 ~/Downloads）
cd ~/Downloads

# 解压文件
tar -xzf supabase_darwin_arm64.tar.gz

# 移动到系统 PATH 目录
sudo mv supabase /usr/local/bin/

# 赋予执行权限
sudo chmod +x /usr/local/bin/supabase
```

### 步骤 3：验证安装

```bash
supabase --version
```

---

## 方案三：修复 Homebrew 后安装（需要网络配置）

**优点：**
- 后续升级方便（brew upgrade）
- 符合 macOS 最佳实践

**问题诊断：**
你的 Homebrew 安装时遇到网络问题：
```
error:1404B41A:SSL routines:ST_CONNECT:tlsv1 alert decode error
```

**解决方案 A：配置 Homebrew 镜像源（推荐）**

```bash
# 配置中科大镜像源
export HOMEBREW_BOTTLE_DOMAIN=https://mirrors.ustc.edu.cn/homebrew-bottles
export HOMEBREW_API_DOMAIN=https://mirrors.ustc.edu.cn/homebrew-bottles/api
export HOMEBREW_CORE_GIT_REMOTE=https://mirrors.ustc.edu.cn/homebrew-core.git

# 将上述配置写入 ~/.zshrc（永久生效）
echo 'export HOMEBREW_BOTTLE_DOMAIN=https://mirrors.ustc.edu.cn/homebrew-bottles' >> ~/.zshrc
echo 'export HOMEBREW_API_DOMAIN=https://mirrors.ustc.edu.cn/homebrew-bottles/api' >> ~/.zshrc
echo 'export HOMEBREW_CORE_GIT_REMOTE=https://mirrors.ustc.edu.cn/homebrew-core.git' >> ~/.zshrc

# 重新加载配置
source ~/.zshrc

# 更新 Homebrew
brew update

# 安装 Supabase CLI
brew install supabase/tap/supabase
```

**解决方案 B：使用代理（如果有）**

```bash
# 设置 HTTP 代理（替换为你的代理地址和端口）
export ALL_PROXY=http://127.0.0.1:7890

# 安装 Supabase CLI
brew install supabase/tap/supabase

# 取消代理
unset ALL_PROXY
```

---

## 推荐方案总结

### 立即开始开发：使用 npx
```bash
cd /Users/michael/Desktop/900\ 麦国权资料/400\ 学习/20260323\ ai-file-hub/ai-file-hub
npx supabase init
```

### 长期使用：手动下载二进制文件
1. 访问 https://github.com/supabase/cli/releases/latest
2. 下载 `supabase_darwin_arm64.tar.gz`
3. 按照"方案二"的步骤 2 和 3 安装

### 如果有稳定网络/代理：修复 Homebrew
- 按照"方案三 - 解决方案 A"配置镜像源
- 或使用"方案三 - 解决方案 B"配置代理

---

## 验收测试

安装完成后，运行以下命令验证：

```bash
# 检查版本
supabase --version  # 或 npx supabase --version

# 初始化项目（在项目根目录）
cd /Users/michael/Desktop/900\ 麦国权资料/400\ 学习/20260323\ ai-file-hub/ai-file-hub
supabase init  # 或 npx supabase init

# 预期输出：
# - 创建 supabase/ 目录
# - 生成配置文件 supabase/config.toml
```

---

## 下一步行动

安装成功后，根据 `progress.md` 的阶段三计划：

### T-301：创建 Edge Function 骨架
```bash
# 创建 analyze-file 函数
supabase functions new analyze-file

# 创建 chat-with-file 函数
supabase functions new chat-with-file
```

### T-302：配置本地开发环境
```bash
# 启动本地 Supabase（需要 Docker）
supabase start

# 注意：如果没有 Docker，需要先安装 Docker Desktop
```

---

## 常见问题

### Q1: npx 每次都很慢怎么办？
使用"方案二：手动下载二进制文件"一次性安装。

### Q2: 下载 GitHub 文件失败？
使用镜像加速（如 ghproxy.com）或配置代理。

### Q3: Homebrew 镜像源配置后仍然失败？
尝试：
```bash
brew update-reset
brew update
```

### Q4: 是否需要 Docker？
- `supabase init`、`supabase functions new` **不需要** Docker
- `supabase start`（本地运行完整 Supabase）**需要** Docker
- 开发 Edge Functions 可以直接部署到云端，不一定需要本地运行

---

**最后更新：** 2026-03-25
**适用版本：** Supabase CLI v2.x
**下次更新：** 成功安装并完成 T-301 后
