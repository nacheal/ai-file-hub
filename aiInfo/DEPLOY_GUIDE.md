# AI File Hub - 阶段六部署与验收指南

**版本：** v1.0
**日期：** 2026-03-28
**状态：** 代码开发完成，待部署验收

---

## 一、完成情况总结

### 1.1 已完成的代码开发

| 分组 | 任务数 | 状态 | 说明 |
|------|--------|------|------|
| 6.1 基础设施 | 5 个 | ✅ 完成 | SQL 迁移文件已就绪 |
| 6.2 analyze-file 改造 | 5 个 | ✅ 完成 | 分块和向量化逻辑已实现 |
| 6.3 chat-with-file 改造 | 5 个 | ✅ 完成 | RAG 检索已实现，含降级方案 |
| 6.4 跨文件全局问答 | 5 个 | ✅ 完成 | chat-global 和前端 UI 已完成 |
| **合计** | **20 个** | **✅ 100%** | **所有代码开发任务已完成** |

### 1.2 新增文件清单

#### 数据库迁移
- `supabase/migrations/20260328_add_document_chunks_for_rag.sql` - 完整的数据库迁移 SQL
- `supabase/migrations/README.md` - 迁移执行指南

#### 后端 Edge Functions
- `supabase/functions/_shared/chunk.ts` - 文本分块工具函数
- `supabase/functions/_shared/embed.ts` - 向量化工具函数
- `supabase/functions/chat-global/index.ts` - 全局问答 Edge Function（新增）

#### 后端改造
- `supabase/functions/analyze-file/index.ts` - 已改造，添加分块和向量化
- `supabase/functions/chat-with-file/index.ts` - 已改造，使用 RAG 检索

#### 前端组件
- `frontend/src/components/ai/GlobalChatPanel.jsx` - 全局问答面板组件（新增）
- `frontend/src/pages/DashboardPage.jsx` - 已改造，添加全局问答入口

#### 配置文件
- `supabase/config.toml` - 已更新，添加 chat-global 配置
- `supabase/ENV_SETUP.md` - 环境变量配置指南
- `aiInfo/BACKFILL_GUIDE.md` - 存量文件补全指南

---

## 二、部署步骤（按顺序执行）

### 前置步骤：验证 DeepSeek Embedding API（必须）

**⚠️ 在执行任何部署步骤前，先验证 API 可用性和向量维度**

DeepSeek 提供 **OpenAI 兼容的 Embedding API**，使用以下命令测试：

```bash
# OpenAI 兼容接口测试（推荐）
bash test_openai_compatible.sh sk-your-deepseek-api-key
```

**预期输出：**
```
✅ 成功！DeepSeek Embedding API 可用（OpenAI 兼容）
📊 返回信息：
  - 模型: deepseek-embedding
  - 向量维度: 1536
  - 批量处理: 支持
✓ 向量维度为 1536，与代码配置匹配
✓ 使用 OpenAI 兼容接口
🎉 配置正确，可以开始部署了！
```

**如果向量维度不是 1536（不太可能）：**

按照脚本提示修改以下文件：
1. `supabase/migrations/20260328_add_document_chunks_for_rag.sql` - 修改 `vector(1536)` 为实际维度
2. `supabase/functions/_shared/embed.ts` - 修改 `DIMENSIONS: 1536` 为实际维度

**技术说明：**
- API 端点：`https://api.deepseek.com/v1/embeddings`（OpenAI 标准）
- 模型名称：`deepseek-embedding`
- 请求格式：与 OpenAI Embedding API 完全兼容
- 向量维度：1536（与 OpenAI text-embedding-3-small 相同）

确认测试通过后，再继续下面的步骤。

---

### 步骤 1：数据库迁移（必须第一步）

**⚠️ 重要：所有后续步骤依赖于此步骤完成**

1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. 复制 `supabase/migrations/20260328_add_document_chunks_for_rag.sql` 的完整内容
4. 粘贴并执行

**验证：**
```sql
-- 验证 pgvector 扩展
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 验证表已创建
SELECT table_name FROM information_schema.tables
WHERE table_name = 'document_chunks';

-- 验证索引
SELECT indexname FROM pg_indexes
WHERE tablename = 'document_chunks';
```

预期结果：pgvector 扩展存在，document_chunks 表存在，2 个索引已创建。

---

### 步骤 2：验证 DeepSeek API Key

**检查现有配置（推荐）**

项目已经在使用 `DEEPSEEK_API_KEY`，验证是否已配置：

```bash
# 通过 Supabase CLI 验证
supabase secrets list | grep DEEPSEEK_API_KEY
```

或在 Supabase Dashboard → Settings → Vault 中查看。

**如果尚未配置（首次部署）**

**方式一：通过 Supabase Dashboard**
1. Settings → Vault（或 Edge Functions → Secrets）
2. 添加 Secret：
   - Name: `DEEPSEEK_API_KEY`
   - Value: `sk-...`（你的 DeepSeek API Key）

**方式二：通过 Supabase CLI**
```bash
supabase secrets set DEEPSEEK_API_KEY=sk-your-actual-api-key-here
supabase secrets list  # 验证
```

**验证：**
部署后查看 Edge Function 日志，确认环境变量已加载：
```
[embedChunks] Successfully generated X embeddings, used Y tokens
```

---

### 步骤 3：部署 Edge Functions

```bash
# 部署改造后的 analyze-file
supabase functions deploy analyze-file --no-verify-jwt

# 部署改造后的 chat-with-file
supabase functions deploy chat-with-file --no-verify-jwt

# 部署新的 chat-global
supabase functions deploy chat-global --no-verify-jwt
```

**验证：**
- 在 Supabase Dashboard 的 Edge Functions 页面，确认三个函数都显示为 Active
- 查看部署日志，确认没有错误

---

### 步骤 4：前端部署

```bash
cd frontend

# 安装依赖（如果有新依赖）
npm install

# 构建生产版本
npm run build

# 部署到你的托管平台（Vercel/Netlify 等）
# 或者本地运行测试
npm run dev
```

---

### 步骤 5：测试级联删除（T-614）

在 Supabase SQL Editor 执行：

```sql
-- 1. 插入测试 document（使用你的 user_id）
INSERT INTO documents (id, user_id, name, storage_path, mime_type, file_size, status)
VALUES (
  'test-cascade-delete-id'::uuid,
  'YOUR_USER_ID_HERE'::uuid,
  'test-file.txt',
  'test/path.txt',
  'text/plain',
  100,
  'done'
);

-- 2. 插入测试 chunk
INSERT INTO document_chunks (document_id, content, chunk_index, embedding)
VALUES (
  'test-cascade-delete-id'::uuid,
  'test content',
  0,
  '[0.1, 0.2, 0.3]'::vector
);

-- 3. 验证 chunk 存在
SELECT * FROM document_chunks WHERE document_id = 'test-cascade-delete-id'::uuid;

-- 4. 删除 document
DELETE FROM documents WHERE id = 'test-cascade-delete-id'::uuid;

-- 5. 验证 chunk 自动删除
SELECT * FROM document_chunks WHERE document_id = 'test-cascade-delete-id'::uuid;
-- 预期结果：空（0 rows）
```

---

### 步骤 6：功能验收测试（T-615, T-624, T-625）

#### 6.1 新文件上传测试

1. 上传一个新的 PDF 或 TXT 文件（建议 > 1000 字符）
2. 等待 AI 分析完成
3. 在 SQL Editor 查询 chunks：
   ```sql
   SELECT d.name, COUNT(dc.id) AS chunk_count
   FROM documents d
   LEFT JOIN document_chunks dc ON dc.document_id = d.id
   WHERE d.name = '你上传的文件名'
   GROUP BY d.id, d.name;
   ```
4. 预期结果：chunk_count > 0（根据文件大小，通常每 500 字符一个 chunk）

#### 6.2 单文件 RAG 问答测试

1. 进入文件详情页
2. 提问一个文件中确实包含答案的问题
3. 观察回答质量：
   - 回答应该基于文件内容
   - 不应该说"内容已截断"（旧版会出现）
   - 流式输出应正常工作
4. 查看浏览器开发者工具的 Console，应该看到类似：
   ```
   [chat-with-file] 开始对问题进行向量化...
   [chat-with-file] 问题向量化完成
   [chat-with-file] 检索到 5 个相关 chunks
   [chat-with-file] 使用 RAG 模式，基于检索到的 chunks 回答
   ```

#### 6.3 全局问答测试

1. 回到 Dashboard 页面
2. 点击"问所有文件"按钮
3. 提问一个跨多个文件的问题（例如"总结所有文件的主题"）
4. 观察：
   - 回答应该引用多个文件的内容
   - 回答下方应该展示"引用来源"卡片
   - 点击来源卡片应该能跳转到对应文件详情页
5. 查看 Network 面板，应该看到对 `chat-global` 的 SSE 请求，且包含 `event: sources` 事件

---

### 步骤 7：存量文件补全（T-635）

按照 `aiInfo/BACKFILL_GUIDE.md` 中的步骤执行：

1. 查询需要补全的文件：
   ```sql
   SELECT d.id, d.name, d.mime_type, d.created_at
   FROM documents d
   WHERE d.status = 'done'
     AND NOT EXISTS (
       SELECT 1 FROM document_chunks dc WHERE dc.document_id = d.id
     )
   ORDER BY d.created_at DESC;
   ```

2. 对每个文件重新调用 `analyze-file`（或使用批量脚本）

3. 验证补全结果：
   ```sql
   -- 应该返回 0
   SELECT COUNT(*) AS files_without_chunks
   FROM documents d
   WHERE d.status = 'done'
     AND NOT EXISTS (
       SELECT 1 FROM document_chunks dc WHERE dc.document_id = d.id
     );
   ```

---

## 三、验收清单（对应 PRD6.md 第 8 节）

- [ ] `document_chunks` 表已创建，pgvector 扩展已开启
- [ ] 上传一份 PDF 并分析完成后，`document_chunks` 表中可查到对应的多条 chunk 记录，且 embedding 字段不为 null
- [ ] 对该 PDF 提问，回答内容准确命中文件中段，不受 8000 字符截断影响
- [ ] 对比改造前后：同一个问题在大文件中的回答质量有明显提升
- [ ] 存量文件补全脚本执行后，历史文件均有 chunk 记录
- [ ] 跨文件问答可正确返回来自不同文件的相关内容，并标注来源文件名
- [ ] Embedding API Key 不暴露在前端代码或浏览器网络请求中

---

## 四、故障排查

### 4.1 pgvector 扩展无法启用

**错误：** `extension "vector" does not exist`

**解决：**
- 确保你的 Supabase 项目支持 pgvector（新项目默认支持）
- 联系 Supabase 支持启用该扩展

### 4.2 Embedding API 调用失败

**错误：** `DEEPSEEK_API_KEY not found in environment variables`

**解决：**
1. 检查 Supabase Secrets 是否正确设置
2. 重新部署 Edge Functions
3. 查看 Edge Function 日志确认环境变量是否加载

**错误：** `DeepSeek API error (401): Invalid API Key`

**解决：**
- 验证 API Key 是否有效
- 确认 API Key 有 Embedding 权限
- 检查是否超出 DeepSeek 账户配额

**错误：** `DeepSeek API error (404): Endpoint not found`

**解决：**
- DeepSeek 的 Embedding API 端点可能与代码中不同
- 查阅 DeepSeek 最新文档确认正确的端点
- 如遇问题，可考虑切换到 OpenAI Embedding（需修改代码和数据库）

### 4.3 向量检索无结果

**现象：** 问答总是降级到全文模式

**排查：**
1. 确认文件有 chunk 记录：
   ```sql
   SELECT COUNT(*) FROM document_chunks WHERE document_id = 'YOUR_FILE_ID';
   ```
2. 查看 Edge Function 日志，确认问题向量化是否成功
3. 检查相似度阈值（默认 0.5）是否过高

### 4.4 前端全局问答面板无法显示

**排查：**
1. 查看浏览器 Console 是否有错误
2. 确认 `chat-global` Edge Function 已部署
3. 检查 `VITE_SUPABASE_URL` 环境变量是否正确

---

## 五、性能监控建议

1. **向量检索延迟**：在生产环境监控 pgvector 查询的 p99 延迟，应 ≤ 200ms
2. **Embedding API 成本**：定期查看 OpenAI Dashboard 的使用量和费用
3. **Edge Function 执行时间**：监控 `analyze-file` 和 `chat-with-file` 的执行时间
4. **错误率**：监控分块/向量化失败率，应 < 5%

---

## 六、下一步优化方向（可选）

1. **使用 RPC 函数优化向量检索**：
   - 当前实现在客户端计算余弦相似度
   - 建议创建 Postgres RPC 函数，利用 pgvector 的原生操作符（`<=>`) 提升性能

2. **批量 Embedding**：
   - 当前 `embedChunks` 已支持批量，但可进一步优化批次大小

3. **缓存优化**：
   - 对高频问题的 embedding 结果进行缓存

4. **分块策略优化**：
   - 根据实际使用情况调整 CHUNK_SIZE 和 OVERLAP 参数

---

## 七、相关文档

- **需求文档：** `aiInfo/PRD6.md`
- **任务清单：** `aiInfo/todo6.md`
- **环境配置：** `supabase/ENV_SETUP.md`
- **数据库迁移：** `supabase/migrations/README.md`
- **存量补全：** `aiInfo/BACKFILL_GUIDE.md`

---

**部署完成后，请勾选上述验收清单，并记录任何遇到的问题和解决方案。**
