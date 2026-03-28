# 数据库迁移指南

## 阶段六：RAG 向量检索基础设施

### 执行步骤

**方式一：通过 Supabase Dashboard（推荐）**

1. 登录 Supabase Dashboard
2. 进入你的项目
3. 点击左侧菜单的 `SQL Editor`
4. 创建新查询（New Query）
5. 复制 `20260328_add_document_chunks_for_rag.sql` 文件的完整内容
6. 粘贴到 SQL Editor 中
7. 点击 `Run` 执行

**方式二：通过 Supabase CLI（需要先安装 CLI）**

```bash
# 如果尚未安装 Supabase CLI
npm install -g supabase

# 登录 Supabase
supabase login

# 链接到远程项目
supabase link --project-ref your-project-ref

# 应用迁移
supabase db push
```

### 验证迁移成功

在 SQL Editor 中执行以下查询来验证：

```sql
-- 1. 验证 pgvector 扩展已启用
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 2. 验证表已创建
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'document_chunks';

-- 3. 验证索引
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'document_chunks';

-- 4. 验证 RLS 策略
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'document_chunks';
```

### 预期结果

- pgvector 扩展已启用
- `document_chunks` 表已创建，包含 6 个字段
- 2 个索引已创建（向量索引 + document_id 索引）
- 1 个 RLS 策略已创建（SELECT 权限）

### 故障排除

**错误：`extension "vector" does not exist`**
- 确保你的 Supabase 项目版本支持 pgvector 扩展
- 联系 Supabase 支持启用该扩展

**错误：`table "documents" does not exist`**
- 确保你已经完成了阶段一到阶段五的所有数据库迁移
- `document_chunks` 表依赖于 `documents` 表的外键关系

**索引创建失败**
- ivfflat 索引需要一定的数据量才能高效工作
- 如果表为空，索引仍然会创建成功，但在有数据后才会发挥作用
