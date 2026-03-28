# 存量文件向量补全指南

## 背景

阶段六上线前上传的文件没有经过分块和向量化处理，因此无法使用 RAG 向量检索功能。本指南提供两种方案来补全这些文件的 chunk 记录。

---

## 方案一：手动查询并重新分析（推荐）

### 步骤 1：查找需要补全的文件

在 Supabase SQL Editor 中执行以下查询：

```sql
-- 查找所有已完成分析但未分块的文件
SELECT d.id, d.name, d.mime_type, d.created_at
FROM documents d
WHERE d.status = 'done'
  AND NOT EXISTS (
    SELECT 1
    FROM document_chunks dc
    WHERE dc.document_id = d.id
  )
ORDER BY d.created_at DESC;
```

这将返回所有需要补全的文件列表。

### 步骤 2：触发重新分析

对于每个文件，调用 `analyze-file` Edge Function 重新处理：

```bash
# 使用 curl 调用（需要替换变量）
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/analyze-file' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{ "document_id": "FILE_UUID_HERE" }'
```

**注意**：
- `YOUR_PROJECT_REF`: 你的 Supabase 项目引用
- `YOUR_ACCESS_TOKEN`: 用户的 JWT token（从浏览器开发者工具中获取）
- `FILE_UUID_HERE`: 需要重新分析的文件 ID

---

## 方案二：批量补全脚本（高级）

### 创建补全 Edge Function

创建一个新的 Edge Function `backfill-chunks`：

```typescript
// supabase/functions/backfill-chunks/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { chunkText } from '../_shared/chunk.ts'
import { embedChunks } from '../_shared/embed.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  try {
    // 1. 查找所有需要补全的文件
    const { data: docsToBackfill, error: queryError } = await adminClient
      .from('documents')
      .select('id, name')
      .eq('status', 'done')
      .filter('id', 'not.in', `(SELECT DISTINCT document_id FROM document_chunks)`)

    if (queryError) throw queryError

    console.log(`找到 ${docsToBackfill?.length || 0} 个文件需要补全`)

    const results = []

    // 2. 对每个文件执行分块和向量化
    for (const doc of docsToBackfill || []) {
      try {
        // 获取 full_text
        const { data: aiResult } = await adminClient
          .from('ai_results')
          .select('full_text')
          .eq('document_id', doc.id)
          .single()

        const fullText = aiResult?.full_text || ''

        if (!fullText || fullText.startsWith('[图片文件')) {
          console.log(`跳过文件 ${doc.name}（无文本内容）`)
          results.push({ id: doc.id, name: doc.name, status: 'skipped', reason: '无文本内容' })
          continue
        }

        // 分块
        const chunks = chunkText(fullText)
        if (chunks.length === 0) {
          console.log(`跳过文件 ${doc.name}（分块失败）`)
          results.push({ id: doc.id, name: doc.name, status: 'skipped', reason: '分块失败' })
          continue
        }

        // 向量化
        const embeddings = await embedChunks(chunks)

        // 写入 document_chunks
        const chunkRecords = chunks.map((content, index) => ({
          document_id: doc.id,
          content,
          chunk_index: index,
          embedding: JSON.stringify(embeddings[index]),
        }))

        const { error: insertError } = await adminClient
          .from('document_chunks')
          .insert(chunkRecords)

        if (insertError) throw insertError

        console.log(`成功补全文件 ${doc.name}（${chunks.length} 个 chunks）`)
        results.push({ id: doc.id, name: doc.name, status: 'success', chunks: chunks.length })
      } catch (docError) {
        console.error(`处理文件 ${doc.name} 失败:`, docError)
        results.push({
          id: doc.id,
          name: doc.name,
          status: 'error',
          error: docError instanceof Error ? docError.message : String(docError),
        })
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('backfill-chunks error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '服务器内部错误' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### 部署并调用

```bash
# 部署函数（需要配置 verify_jwt = false）
supabase functions deploy backfill-chunks --no-verify-jwt

# 调用函数（使用 Service Role Key，仅管理员可用）
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/backfill-chunks' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

---

## 验证补全结果

补全完成后，执行以下查询验证：

```sql
-- 查看各文件的 chunk 数量
SELECT d.name, COUNT(dc.id) AS chunk_count
FROM documents d
LEFT JOIN document_chunks dc ON dc.document_id = d.id
WHERE d.status = 'done'
GROUP BY d.id, d.name
ORDER BY chunk_count DESC;

-- 验证所有已完成文件都有 chunks
SELECT COUNT(*) AS files_without_chunks
FROM documents d
WHERE d.status = 'done'
  AND NOT EXISTS (
    SELECT 1 FROM document_chunks dc WHERE dc.document_id = d.id
  );
-- 预期结果：0
```

---

## 注意事项

1. **API 成本**：补全操作会调用 OpenAI Embedding API，产生费用。建议先小批量测试。

2. **执行时间**：大量文件补全可能需要较长时间。方案二中的脚本会顺序处理，可以考虑分批执行。

3. **错误处理**：如果某个文件补全失败，不会影响其他文件。查看日志了解失败原因。

4. **幂等性**：重复调用 `analyze-file` 是安全的，它会覆盖已有的 chunk 记录（由于 CASCADE DELETE）。

---

## 推荐执行顺序

1. 先在 Supabase SQL Editor 执行步骤 1 的查询，了解需要补全的文件数量
2. 如果文件数量较少（< 10），使用方案一手动处理
3. 如果文件数量较多，创建并部署方案二的批量脚本
4. 补全完成后，执行验证查询确认结果
