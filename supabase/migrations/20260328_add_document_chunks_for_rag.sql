-- ============================================================================
-- AI File Hub - 阶段六数据库迁移：RAG 向量检索基础设施
-- ============================================================================
-- 任务：T-601 至 T-604
-- 日期：2026-03-28
-- 功能：开启 pgvector 扩展、创建 document_chunks 表、索引及 RLS 策略
-- ============================================================================

-- T-601: 开启 pgvector 扩展
-- 支持向量数据类型和相似度检索
CREATE EXTENSION IF NOT EXISTS vector;

-- T-602: 创建 document_chunks 表
-- 存储文档的分块内容和对应的向量表示
CREATE TABLE IF NOT EXISTS document_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID REFERENCES documents ON DELETE CASCADE NOT NULL,
  content       TEXT NOT NULL,          -- 该 chunk 的原始文本
  chunk_index   INT NOT NULL,           -- 在文件中的顺序（0-based）
  embedding     vector(1024),           -- embedding 向量（SiliconFlow BAAI/bge-m3）
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 添加表注释
COMMENT ON TABLE document_chunks IS '文档分块向量表，用于 RAG 检索';
COMMENT ON COLUMN document_chunks.content IS 'chunk 的原始文本内容（约 500 字符/块）';
COMMENT ON COLUMN document_chunks.chunk_index IS '在原文件中的块序号（从 0 开始）';
COMMENT ON COLUMN document_chunks.embedding IS '1024 维向量（SiliconFlow BAAI/bge-m3，OpenAI 兼容）';

-- T-603: 创建向量相似度索引（ivfflat，余弦距离）
-- 使用 ivfflat 算法优化向量检索性能
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 创建常规查询索引
-- 用于按 document_id 过滤 chunks
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
  ON document_chunks (document_id);

-- T-604: 配置 RLS（Row Level Security）策略
-- 启用行级安全
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- 策略 1：用户只能查看自己文件的 chunks
-- 通过 document_id 关联到 documents 表，检查 user_id 是否匹配
CREATE POLICY "用户只能查看自己文件的 chunks"
  ON document_chunks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM documents
      WHERE documents.id = document_chunks.document_id
        AND documents.user_id = auth.uid()
    )
  );

-- 注意：不创建 INSERT/UPDATE/DELETE policy
-- 原因：chunk 写入仅由 Edge Function 的 Service Role 执行
-- anon 和 authenticated role 无需直接写入权限

-- ============================================================================
-- 验证脚本（可选，在迁移后执行以验证结果）
-- ============================================================================
-- 1. 验证 pgvector 扩展已启用
--    SELECT * FROM pg_extension WHERE extname = 'vector';
--
-- 2. 验证表结构
--    \d document_chunks
--
-- 3. 验证索引
--    SELECT indexname, indexdef
--    FROM pg_indexes
--    WHERE tablename = 'document_chunks';
--
-- 4. 验证 RLS 策略
--    SELECT policyname, cmd, qual
--    FROM pg_policies
--    WHERE tablename = 'document_chunks';
-- ============================================================================
