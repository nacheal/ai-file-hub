# 使用 DeepSeek Embedding 替代 OpenAI 的更新说明

**日期：** 2026-03-28
**版本：** v1.1

---

## 更新背景

用户表示没有 OpenAI API Key，因此将原计划使用的 OpenAI Embedding API 替换为 **DeepSeek Embedding API**。

## 主要变更

### 1. 向量维度调整

- **从** `vector(1536)` → **到** `vector(1024)`
- DeepSeek Embedding 输出 1024 维向量（而非 OpenAI 的 1536 维）

### 2. API 调用修改

**文件：** `supabase/functions/_shared/embed.ts`

- API 端点：`https://api.deepseek.com/embeddings`
- 模型：`deepseek-chat`
- API Key：使用现有的 `DEEPSEEK_API_KEY`（无需新增）

### 3. 数据库迁移更新

**文件：** `supabase/migrations/20260328_add_document_chunks_for_rag.sql`

```sql
-- 向量维度从 1536 改为 1024
embedding vector(1024)
```

### 4. 配置文档更新

- `supabase/ENV_SETUP.md`：更新为 DeepSeek 配置说明
- `aiInfo/DEPLOY_GUIDE.md`：更新部署步骤和故障排查
- `aiInfo/PRD6.md`：更新 Embedding 模型选型说明

---

## 优势

✅ **无需新增 API Key**：复用现有的 `DEEPSEEK_API_KEY`
✅ **成本更低**：DeepSeek Embedding 约 ¥0.0001/1K tokens（OpenAI 约 $0.00002/1K tokens）
✅ **中文优化**：DeepSeek 对中文语义理解更优秀
✅ **技术栈统一**：项目所有 AI 功能均使用 DeepSeek API

---

## 注意事项

### ⚠️ 重要：数据库迁移顺序

如果你已经执行了旧版的数据库迁移（`vector(1536)`），需要：

1. **删除旧表**：
   ```sql
   DROP TABLE IF EXISTS document_chunks CASCADE;
   ```

2. **重新执行迁移**：
   使用更新后的 SQL 文件（`vector(1024)`）

### 验证 DeepSeek Embedding API 可用性

在部署前，建议先测试 DeepSeek Embedding API：

```bash
# 使用项目提供的测试脚本
bash test_deepseek_embedding.sh sk-your-deepseek-api-key

# 或手动测试
curl -X POST https://api.deepseek.com/v1/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DEEPSEEK_API_KEY" \
  -d '{
    "model": "deepseek-embedding-v2",
    "input": ["测试文本"]
  }'
```

预期返回包含 `data` 数组，每个元素包含 `embedding` 字段。

**返回示例：**
```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [0.123, 0.456, ..., 0.789]
    }
  ],
  "model": "deepseek-embedding-v2",
  "usage": {
    "prompt_tokens": 5,
    "total_tokens": 5
  }
}
```

**重要：确认向量维度**

运行测试脚本后，会自动显示向量维度。如果不是 1024 维，需要：
1. 记录实际维度（如 768、1536 等）
2. 修改 `supabase/migrations/20260328_add_document_chunks_for_rag.sql` 中的 `vector(1024)` 为实际维度
3. 修改 `supabase/functions/_shared/embed.ts` 中的 `DIMENSIONS` 配置

**如果 DeepSeek 不支持 Embedding API：**

可以考虑以下替代方案：
1. 使用 OpenAI Embedding（需申请 API Key）
2. 使用其他开源 Embedding 模型（如 Sentence Transformers）
3. 自建 Embedding 服务

---

## 切换回 OpenAI（可选）

如果未来想切换回 OpenAI Embedding，需要修改：

1. **embed.ts**：
   ```typescript
   API_ENDPOINT: 'https://api.openai.com/v1/embeddings'
   MODEL: 'text-embedding-3-small'
   DIMENSIONS: 1536
   Deno.env.get('OPENAI_API_KEY')
   ```

2. **数据库迁移 SQL**：
   ```sql
   embedding vector(1536)
   ```

3. **删除现有数据并重新迁移**（向量维度不同，无法兼容）

---

## 部署步骤（无变化）

按照 `aiInfo/DEPLOY_GUIDE.md` 的步骤执行：

1. ✅ 执行数据库迁移（使用更新后的 SQL 文件）
2. ✅ 验证 `DEEPSEEK_API_KEY` 已配置
3. ✅ 部署 Edge Functions
4. ✅ 功能验收测试

---

## 验证清单

部署后，验证以下内容：

- [ ] `document_chunks` 表使用 `vector(1024)` 类型
- [ ] 上传新文件后，chunks 的 `embedding` 字段包含 1024 个浮点数
- [ ] Edge Function 日志显示成功调用 DeepSeek Embedding API
- [ ] 单文件问答能正确基于向量检索回答问题
- [ ] 全局问答能检索并引用多个文件

---

**更新完成，可以开始部署了！**
