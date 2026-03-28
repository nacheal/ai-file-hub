# 阶段六：环境变量配置指南

## 使用 DeepSeek Embedding API

### 前置条件

你需要一个 DeepSeek API Key 用于调用 Embedding 模型生成向量。

**好消息：** 项目已经在使用 `DEEPSEEK_API_KEY` 进行 AI 分析和问答，无需额外申请新的 API Key！

### 验证现有配置

DeepSeek API Key 应该已经配置在你的 Supabase Secrets 中。验证方法：

**方式一：通过 Supabase Dashboard**
1. 登录 Supabase Dashboard
2. 进入你的项目
3. 点击左侧菜单的 `Settings` → `Vault`（或 `Edge Functions` → `Secrets`）
4. 确认存在名为 `DEEPSEEK_API_KEY` 的 secret

**方式二：通过 Supabase CLI**
```bash
# 查看已有的 secrets
supabase secrets list

# 应该能看到 DEEPSEEK_API_KEY
```

### 如果尚未配置 DeepSeek API Key

如果你的项目还没有配置 DeepSeek API Key（首次部署），请按以下步骤设置：

1. 在 [DeepSeek 官网](https://platform.deepseek.com/) 创建账号并获取 API Key

2. **通过 Supabase Dashboard 设置：**
   - Settings → Vault（或 Edge Functions → Secrets）
   - 添加新的 secret：
     - Name: `DEEPSEEK_API_KEY`
     - Value: `sk-...`（你的 DeepSeek API Key）
   - 保存

3. **或通过 Supabase CLI 设置：**
   ```bash
   supabase secrets set DEEPSEEK_API_KEY=sk-your-actual-api-key-here
   supabase secrets list  # 验证
   ```

### 验证配置

在部署 Edge Function 后，可以通过以下方式验证环境变量是否正确加载：

1. 在 Edge Function 代码中添加日志：
   ```typescript
   console.log('DEEPSEEK_API_KEY exists:', !!Deno.env.get('DEEPSEEK_API_KEY'));
   ```

2. 查看 Edge Function 的日志输出

### 注意事项

- **安全性**：API Key 仅存储在 Supabase 服务端，不会暴露给前端
- **成本控制**：建议在 DeepSeek Dashboard 监控使用量
- **一个 Key 多用途**：同一个 DeepSeek API Key 可用于：
  - 文件分析（analyze-file）
  - 单文件问答（chat-with-file）
  - 全局问答（chat-global）
  - **文本向量化（新增，Embedding API）**

### 成本估算

DeepSeek Embedding API 定价（参考 2024 年价格，请以官网为准）：

- 向量化：约 ¥0.0001 / 1K tokens（比 OpenAI 便宜很多）
- 一个 500 字符的 chunk 约 150-200 tokens
- 1000 个 chunks 约 ¥0.015-0.02（约 $0.002）

与 OpenAI text-embedding-3-small 相比，DeepSeek 成本更低且无需额外申请账号。

---

## 可选：切换回 OpenAI Embedding

如果你想使用 OpenAI Embedding（更高精度，但成本较高），需要：

1. 申请 OpenAI API Key：[OpenAI Platform](https://platform.openai.com/api-keys)

2. 在 Supabase Secrets 中添加：
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-your-openai-key
   ```

3. 修改代码：
   - `supabase/functions/_shared/embed.ts`：
     - 将 `DEEPSEEK_API_KEY` 改为 `OPENAI_API_KEY`
     - API_ENDPOINT 改为 `https://api.openai.com/v1/embeddings`
     - MODEL 改为 `text-embedding-3-small`
     - DIMENSIONS 改为 `1536`

   - `supabase/migrations/20260328_add_document_chunks_for_rag.sql`：
     - 将 `vector(1024)` 改为 `vector(1536)`

4. 重新执行数据库迁移和部署

---

## 故障排查

**错误：`DEEPSEEK_API_KEY not found in environment variables`**

解决：
1. 检查 Supabase Secrets 是否正确设置
2. 重新部署 Edge Functions
3. 查看 Edge Function 日志确认环境变量是否加载

**错误：`DeepSeek API error (401): Invalid API Key`**

解决：
- 验证 API Key 是否有效
- 确认 API Key 有 Embedding 权限
- 检查是否超出 DeepSeek 账户配额

**错误：`DeepSeek API error (404): Not Found`**

解决：
- 确认 DeepSeek 支持 Embedding API（如果不支持，需要使用 OpenAI 或其他替代方案）
- 检查 API 端点是否正确
