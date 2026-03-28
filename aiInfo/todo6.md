# AI File Hub — 阶段六任务清单（RAG 升级）

**版本：** v1.0  
**日期：** 2026-03-28  
**关联文档：** PRD6.md · todo.md  
**前置条件：** T-101 至 T-534 全部完成  
**总任务数：** 1 个阶段 · 4 个分组 · 18 个任务

> 标签说明：`[前端]` `[Supabase]` `[Edge Fn]` `[数据库]` `[基础设施]`

---

## 阶段六：RAG 升级（预计 4 天）

### 6.1 基础设施：pgvector + 新表（预计半天）

- [ ] **T-601** 在 Supabase SQL Editor 执行：`create extension if not exists vector;` 开启 pgvector 扩展，确认执行成功无报错 `[数据库]`

- [ ] **T-602** 创建 `document_chunks` 表，字段包含：id（uuid PK）、document_id（uuid FK → documents CASCADE DELETE）、content（text）、chunk_index（int）、embedding（vector(1536)）、created_at（timestamptz） `[数据库]`

- [ ] **T-603** 创建 ivfflat 向量索引：
  ```sql
  CREATE INDEX ON document_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
  ```
  同时创建普通索引：`CREATE INDEX ON document_chunks (document_id);` `[数据库]`

- [ ] **T-604** 配置 `document_chunks` 表 RLS：启用行级安全；SELECT 策略通过 document_id 关联 documents.user_id = auth.uid()；不创建 INSERT policy（仅 Service Role 可写） `[数据库]`

- [ ] **T-605** 在 Supabase Secrets 写入 Embedding API Key：`supabase secrets set OPENAI_API_KEY=sk-...`（或 DeepSeek Embedding Key）；在 `supabase/config.toml` 对应 function 中声明该环境变量 `[基础设施]`

---

### 6.2 改造 analyze-file：写入 chunk 向量（预计 1.5 天）

- [ ] **T-611** 在 `supabase/functions/_shared/` 目录新建 `chunk.ts`，实现 `chunkText(text: string): string[]` 工具函数：按 500 字符切割，相邻块重叠 50 字符，优先在 `\n\n` 处断开，最小块长度 100 字符（过短尾块合并入前块） `[Edge Fn]`

- [ ] **T-612** 在 `supabase/functions/_shared/` 新建 `embed.ts`，实现 `embedChunks(chunks: string[]): Promise<number[][]>` 工具函数：调用 `text-embedding-3-small` API（或 DeepSeek Embedding），批量返回每个 chunk 的 1536 维向量；加入重试逻辑（最多 3 次，指数退避） `[Edge Fn]`

- [ ] **T-613** 在 `analyze-file/index.ts` 的写入 `ai_results` 步骤之后，追加分块逻辑：调用 `chunkText(fullText)` → `embedChunks(chunks)` → 用 adminClient 批量 INSERT 至 `document_chunks`；整个分块流程包裹在独立 try/catch 内，失败不影响主流程 `status = 'done'` `[Edge Fn]`

- [ ] **T-614** 验证级联删除：在 Supabase SQL Editor 手动插入一条测试 chunk，再删除对应的 document 记录，确认 chunk 记录自动清除 `[数据库]`

- [ ] **T-615** 重新部署 analyze-file：`supabase functions deploy analyze-file --no-verify-jwt`；上传一份新 PDF 并完成分析后，查询 `document_chunks` 表，确认有对应 chunk 记录且 embedding 字段非 null `[基础设施]`

---

### 6.3 改造 chat-with-file：向量检索替换全文注入（预计 1 天）

- [ ] **T-621** 在 `chat-with-file/index.ts` 新增 `embedQuestion(question: string): Promise<number[]>` 局部函数：对用户问题调用 embedding API，返回单个问题向量 `[Edge Fn]`

- [ ] **T-622** 实现 `retrieveChunks(documentId, questionEmbedding, topK=5)` 函数：执行 pgvector 相似度查询：
  ```sql
  SELECT content, chunk_index
  FROM document_chunks
  WHERE document_id = $1
  ORDER BY embedding <=> $2
  LIMIT $3
  ```
  返回按相关性排序的 chunk 数组 `[Edge Fn]`

- [ ] **T-623** 替换 Prompt 拼装逻辑：将原先使用 `ai_results.full_text` 的上下文区域，替换为检索到的 chunks 拼接字符串；每个 chunk 前标注 `[段落 {chunk_index}]`；当所有 chunk 相似度均低于阈值（无结果）时，回退返回「文档中未找到相关内容」 `[Edge Fn]`

- [ ] **T-624** 保留多轮对话的 history 数组传入逻辑不变，确认流式输出（SSE）正常；在本地用 curl 验证改造后的接口行为与改造前一致 `[Edge Fn]`

- [ ] **T-625** 重新部署 chat-with-file：`supabase functions deploy chat-with-file --no-verify-jwt`；对同一份 PDF 分别用旧存档（截断版）和新版进行问答对比，记录回答质量差异 `[基础设施]`

---

### 6.4 跨文件全局问答（预计 1 天）

- [ ] **T-631** 新建 `supabase/functions/chat-global/index.ts`：JWT 鉴权后，接收 `{ question, history }`（无 document_id）；对问题调用 embedding API → 在当前用户所有 document_chunks 中向量检索 top-8；拼装 Prompt 时标注每个 chunk 的来源文件 id 和 chunk_index；调用 DeepSeek stream: true，SSE 透传 `[Edge Fn]`

- [ ] **T-632** 在 SSE 响应中追加一个结构化的 `[SOURCES]` 事件，内容为 JSON 数组，包含被引用的 document_id 和文件名，供前端解析展示 `[Edge Fn]`

- [ ] **T-633** 部署 chat-global：`supabase functions deploy chat-global --no-verify-jwt`；更新 `supabase/config.toml` 添加 `[functions.chat-global]` verify_jwt = false `[基础设施]`

- [ ] **T-634** 前端：在 `DashboardPage.jsx` 顶部新增「问所有文件」入口按钮；新建 `GlobalChatPanel.jsx` 组件，复用 `ChatInput` + `ChatOutput`，解析 `[SOURCES]` 事件并在回答下方展示引用来源卡片（文件名 + 跳转链接） `[前端]`

- [ ] **T-635** 存量文件补全：在 Supabase SQL Editor 查询所有 `status = 'done'` 且在 `document_chunks` 中无记录的 documents；对每个文件重新调用 `analyze-file` Edge Function（或编写独立补全脚本）；确认所有历史文件均有 chunk 记录 `[基础设施]`

---

## 任务统计

| 分组 | 任务数 | 预计工时 |
|------|--------|----------|
| 6.1 基础设施（pgvector + 新表） | 5 个 | 半天 |
| 6.2 analyze-file 改造（分块写入） | 5 个 | 1.5 天 |
| 6.3 chat-with-file 改造（RAG 检索） | 5 个 | 1 天 |
| 6.4 跨文件全局问答 | 5 个 | 1 天 |
| **合计** | **20 个** | **4 天** |

## 标签分布

| 标签 | 任务数 |
|------|--------|
| `[数据库]` | 4 个 |
| `[Edge Fn]` | 9 个 |
| `[基础设施]` | 5 个 |
| `[前端]` | 1 个 |
| `[Supabase]` | 1 个 |

---

## 推荐执行顺序

1. **T-601 → T-605**：数据库先行，搭好底座，后面所有任务依赖于此
2. **T-611 → T-612**：先写 chunk 和 embed 两个工具函数，单独测试，保证它们稳定后再接入主函数
3. **T-613 → T-615**：接入 analyze-file，上传真实文件验证向量写入，**这一步完成即理解了 RAG 的入库侧**
4. **T-621 → T-625**：改造问答，**做完用同一问题前后对比，是本阶段最有成就感的时刻**
5. **T-631 → T-635**：跨文件问答，建议等 6.2 和 6.3 稳定后再启动

---

## 关键技术参考

### Chunking 参数

```typescript
const CHUNK_SIZE = 500;       // 每块目标字符数
const CHUNK_OVERLAP = 50;     // 相邻块重叠字符数
const MIN_CHUNK_SIZE = 100;   // 最小块长度，过短合并入前块
```

### 向量检索 SQL（pgvector 余弦距离）

```sql
SELECT content, chunk_index, 1 - (embedding <=> $2) AS similarity
FROM document_chunks
WHERE document_id = $1
ORDER BY embedding <=> $2
LIMIT 5;
```

### Embedding API 调用（OpenAI）

```typescript
const res = await fetch('https://api.openai.com/v1/embeddings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
  },
  body: JSON.stringify({
    model: 'text-embedding-3-small',
    input: chunks,   // string[]，批量
  }),
});
const { data } = await res.json();
return data.map((d: { embedding: number[] }) => d.embedding);
```

---

## 验收清单

- [ ] `document_chunks` 表创建成功，pgvector 扩展已开启
- [ ] 上传 PDF 后，`document_chunks` 中有对应多条 chunk，`embedding` 字段非 null
- [ ] 对大文件（> 8000 字符）提问，答案不再因截断而缺失
- [ ] 同一问题改造前后回答质量对比，新版明显更准确
- [ ] 删除文件后，对应 `document_chunks` 记录自动级联删除
- [ ] 跨文件问答可返回来自不同文件的相关内容，并正确标注来源文件名
- [ ] 存量文件均有 chunk 记录（T-635 执行完毕）
- [ ] Embedding API Key 不出现在浏览器 Network 面板

---

*文档结束*