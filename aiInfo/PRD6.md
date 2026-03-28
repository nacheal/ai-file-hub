# AI File Hub — 阶段六产品需求文档（PRD6）

**版本：** v1.0  
**日期：** 2026-03-28  
**关联文档：** PRD.md · tech.md · progress.md  · todo6.md  
**前置条件：** 阶段一至阶段五（T-101 至 T-534）全部完成，生产环境已上线  
**状态：** 待开发

---

## 1. 背景与目标

### 1.1 现状问题

阶段四实现的 AI 问答（`chat-with-file`）采用「全文注入」方案：将文件的 `full_text` 整体塞入 Prompt，并在超出限制时硬截断至 8000 字符。该方案存在三个核心缺陷：

| 问题 | 影响 |
|------|------|
| 大文件内容被截断 | 用户提问的答案可能恰好在被截断的部分，导致回答错误或「不知道」 |
| 无关内容占满上下文 | Token 浪费，且无关内容引入噪音，降低回答准确率 |
| 文件之间完全孤立 | 用户无法跨文件提问，使用场景受限 |

### 1.2 阶段目标

引入 **RAG（Retrieval-Augmented Generation）** 架构，将问答质量从「能用」升级为「好用」：

- 文件内容按语义切片（chunking），每片独立存储向量（embedding）
- 用户提问时，先检索最相关的若干片段，再将这些片段注入 Prompt
- 在此基础上，实现**跨文件全局问答**，支持「在我所有文件里找…」类的查询

### 1.3 学习价值

本阶段是 AI 工程能力的核心训练，完成后将掌握：

- Embedding 模型的调用方式与语义理解原理
- Chunking 策略（分块大小、重叠策略）对检索质量的影响
- 向量数据库（pgvector）的索引与相似度查询
- RAG 全链路：文档入库 → 向量检索 → Prompt 拼装 → 生成

---

## 2. 功能需求

### 2.1 F-601 文本分块存储（Chunking & Embedding）

**触发时机：** 文件上传并经 `analyze-file` 提取文本后，自动触发分块与向量化。

**分块规则：**
- 每块目标长度：500 字符
- 相邻块重叠：50 字符（保留上下文连贯性，防止答案被切断在块边界）
- 最小块长度：100 字符（过短的尾块合并入前一块）
- 分块按自然段优先（遇到 `\n\n` 优先切割，避免切断句子中间）

**向量化：**
- 每个 chunk 独立调用 embedding 模型，生成 1536 维浮点向量
- 向量与 chunk 文本一起存入 `document_chunks` 表
- 图片文件暂不分块（无 full_text），跳过此流程

**容错：**
- 分块或向量化失败不影响 `documents.status`（analyze-file 主流程已完成）
- 失败时在日志记录错误，前端不感知，后续可手动重试

---

### 2.2 F-602 基于向量检索的单文件问答

**改造 `chat-with-file` Edge Function：**

旧流程：`问题 → 全文注入 Prompt → DeepSeek`

新流程：`问题 → embedding → 向量检索 top-K → 拼装 Prompt → DeepSeek`

**检索参数：**
- top-K：默认取 5 个最相关 chunk
- 相似度算法：余弦相似度（cosine distance）
- 检索范围：限定当前文件的 `document_id`

**Prompt 拼装规则：**
- System Prompt 保持不变（基于文档内容回答，不编造）
- Context 区域替换为检索到的 5 个 chunks，按相关性降序排列
- 每个 chunk 前标注来源：`[段落 {chunk_index}]`，便于追溯

**行为保证：**
- 问答仍为流式输出（SSE）
- 多轮对话历史保留（history 数组传入）
- 检索不到相关内容时（所有 chunk 相似度 < 0.5），回退到返回「文档中未找到相关内容」

---

### 2.3 F-603 跨文件全局问答

**新增 `chat-global` Edge Function：**

- 用户可在任意页面发起「全局问答」，不指定特定文件
- 检索范围：当前用户所有文件的全部 chunks
- top-K：取 8 个最相关 chunk（来源可能横跨多个文件）
- 回答中标注每个引用的来源文件名

**前端入口：**
- Dashboard 页面顶部新增「问所有文件」入口按钮
- 交互形式与单文件问答一致（ChatInput + ChatOutput 流式显示）
- 回答气泡下方展示引用来源列表，点击可跳转对应文件详情页

---

### 2.4 F-604 存量文件向量补全

用户在阶段六上线前已上传的文件没有 chunks，需要补全：

- 提供一个**管理员触发脚本**（或在 Dashboard 提供「重新分析」批量入口）
- 对所有 `status = 'done'` 且在 `document_chunks` 中无记录的文件，重新执行分块与向量化
- 补全过程在后台静默执行，完成后更新前端状态

---

## 3. 非功能需求

| 类别 | 要求 |
|------|------|
| 性能 | 向量检索 p99 延迟 ≤ 200ms（pgvector ivfflat 索引保障） |
| 精准度 | 改造后，对同一问题的回答覆盖率（答案命中率）主观评估应优于旧方案 |
| 稳定性 | chunking/embedding 失败不影响已有问答功能（降级回旧方案） |
| 安全 | Embedding API Key 仅在 Edge Function 服务端持有，不暴露前端 |
| 兼容性 | 改造后，单文件问答前端接口不变（用户无感知） |

---

## 4. 数据库变更

### 4.1 新增表：document_chunks

```sql
-- 开启 pgvector 扩展
create extension if not exists vector;

-- 文档分块向量表
create table document_chunks (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid references documents on delete cascade not null,
  content       text not null,          -- 该 chunk 的原始文本
  chunk_index   int not null,           -- 在文件中的顺序（0-based）
  embedding     vector(1536),           -- embedding 向量（text-embedding-3-small）
  created_at    timestamptz default now()
);

-- 向量相似度索引（ivfflat，余弦距离）
create index on document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 常规查询索引
create index on document_chunks (document_id);
```

### 4.2 RLS 策略

```sql
alter table document_chunks enable row level security;

-- 用户只能查看自己文件的 chunks
create policy "用户只能查看自己文件的 chunks"
  on document_chunks for select
  using (exists (
    select 1 from documents
    where documents.id = document_chunks.document_id
    and documents.user_id = auth.uid()
  ));

-- 写入仅 Service Role（Edge Function）
-- 不创建 INSERT policy，anon/authenticated role 无法写入
```

---

## 5. 新增 Edge Functions

### 5.1 改造：analyze-file（新增分块逻辑）

在原有写入 `ai_results` 之后，追加执行：

```
提取 full_text
  → chunkText()：按 500 字符 + 50 字符重叠切割
  → embedChunks()：批量调用 embedding API
  → 批量写入 document_chunks 表
```

### 5.2 改造：chat-with-file（替换上下文注入方式）

```
用户问题
  → embedQuestion()：问题向量化
  → retrieveChunks(document_id, questionEmbedding, topK=5)：向量检索
  → buildPrompt(chunks)：拼装带来源标注的上下文
  → DeepSeek streaming
```

### 5.3 新增：chat-global

```
用户问题
  → embedQuestion()
  → retrieveGlobalChunks(userId, questionEmbedding, topK=8)：跨文件检索
  → buildPromptWithSources(chunks)：拼装 + 标注来源文件
  → DeepSeek streaming
  → 前端渲染引用来源列表
```

---

## 6. 前端变更

### 6.1 FilePage（无感知改造）

`chat-with-file` 接口不变，前端代码无需修改。可选优化：在回答气泡下方展示「引用自第 X、Y、Z 段」的小标注。

### 6.2 DashboardPage（新增全局问答入口）

- 顶部区域新增「问所有文件」按钮
- 点击后展开 ChatInput + ChatOutput 区域
- 引用来源以文件卡片形式展示在回答下方

### 6.3 GlobalChatPanel 组件

- 复用 `ChatInput` 和 `ChatOutput` 组件
- 新增 `SourceCard` 子组件：展示文件名、相关段落摘要、跳转链接

---

## 7. Embedding 模型选型

| 选项 | 维度 | 价格 | 推荐场景 |
|------|------|------|----------|
| DeepSeek Embedding | 1536 | 极低 | **已选择**，OpenAI 兼容，无需新增 API Key |
| `text-embedding-3-small`（OpenAI） | 1536 | 低 | 精度高，但需额外申请 OpenAI 账号 |
| `text-embedding-3-large`（OpenAI） | 3072 | 中 | 精度更高，但存储成本翻倍 |

> **实际采用方案**：使用 DeepSeek Embedding（OpenAI 兼容接口），向量维度 1536。
>
> **技术实现**：
> - API 端点：`https://api.deepseek.com/v1/embeddings`
> - 模型名称：`deepseek-embedding`
> - 请求格式：完全兼容 OpenAI Embedding API
>
> **优势**：
> - 无需新增 API Key（复用现有 `DEEPSEEK_API_KEY`）
> - 成本极低（约 ¥0.0001/1K tokens）
> - 中文语义理解优秀
> - 与现有技术栈统一
> - 标准向量维度（1536，与 OpenAI 相同）

---

## 8. 验收标准

- [ ] `document_chunks` 表已创建，pgvector 扩展已开启
- [ ] 上传一份 PDF 并分析完成后，`document_chunks` 表中可查到对应的多条 chunk 记录，且 embedding 字段不为 null
- [ ] 对该 PDF 提问，回答内容准确命中文件中段，不受 8000 字符截断影响
- [ ] 对比改造前后：同一个问题在大文件中的回答质量有明显提升
- [ ] 存量文件补全脚本执行后，历史文件均有 chunk 记录
- [ ] 跨文件问答可正确返回来自不同文件的相关内容，并标注来源文件名
- [ ] Embedding API Key 不暴露在前端代码或浏览器网络请求中

---

## 9. 阶段六里程碑

| 里程碑 | 完成标志 | 预计日期 |
|--------|---------|---------|
| M6.1：数据库就绪 | pgvector + document_chunks 表 + RLS 配置完成 | D+0.5 |
| M6.2：分块写入上线 | analyze-file 改造完成，新上传文件有 chunk 记录 | D+2 |
| M6.3：RAG 问答上线 | chat-with-file 改造完成，回答质量可对比验证 | D+3 |
| M6.4：跨文件问答上线 | chat-global 上线，DashboardPage 入口可用 | D+4 |

---

*文档结束*