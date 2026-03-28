#!/bin/bash

# DeepSeek Embedding API 测试（OpenAI 兼容接口）
# 基于用户提供的官方方案

echo "=========================================="
echo "DeepSeek Embedding API 测试"
echo "（OpenAI 兼容接口）"
echo "=========================================="
echo ""

if [ -z "$1" ]; then
  echo "❌ 请提供 DeepSeek API Key"
  echo ""
  echo "使用方法："
  echo "  bash test_openai_compatible.sh sk-your-api-key-here"
  echo ""
  exit 1
fi

API_KEY="$1"

echo "🔑 API Key: ${API_KEY:0:10}..."
echo "📡 测试 OpenAI 兼容的 Embedding API..."
echo ""

# 使用 OpenAI 标准格式调用 DeepSeek Embedding
RESPONSE=$(curl -s -X POST https://api.deepseek.com/v1/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "model": "deepseek-embedding",
    "input": ["测试文本", "这是第二段测试文本"]
  }')

# 检查响应
echo "响应预览："
echo "$RESPONSE" | head -c 200
echo "..."
echo ""

if echo "$RESPONSE" | grep -q '"object":"list"'; then
  echo "✅ 成功！DeepSeek Embedding API 可用（OpenAI 兼容）"
  echo ""

  # 提取向量维度
  # 从响应中提取第一个 embedding 数组并计算长度
  EMBEDDING_SAMPLE=$(echo "$RESPONSE" | grep -o '"embedding":\[[^]]*\]' | head -1)

  if [ -n "$EMBEDDING_SAMPLE" ]; then
    DIMENSIONS=$(echo "$EMBEDDING_SAMPLE" | grep -o '[0-9.e+-]\+' | wc -l | tr -d ' ')

    echo "📊 返回信息："
    echo "  - 模型: deepseek-embedding"
    echo "  - 向量维度: $DIMENSIONS"
    echo "  - 批量处理: 支持（测试了 2 个文本）"
    echo ""

    if [ "$DIMENSIONS" -eq "1536" ]; then
      echo "✓ 向量维度为 1536，与代码配置匹配"
      echo "✓ 使用 OpenAI 兼容接口"
      echo ""
      echo "🎉 配置正确，可以开始部署了！"
    else
      echo "⚠️  警告：向量维度为 $DIMENSIONS，预期为 1536"
      echo ""
      echo "需要修改以下文件："
      echo "  1. supabase/migrations/20260328_add_document_chunks_for_rag.sql"
      echo "     将 vector(1536) 改为 vector($DIMENSIONS)"
      echo "  2. supabase/functions/_shared/embed.ts"
      echo "     将 DIMENSIONS: 1536 改为 DIMENSIONS: $DIMENSIONS"
    fi
  else
    echo "⚠️  无法提取向量维度，请手动检查响应"
  fi

elif echo "$RESPONSE" | grep -q '"error"'; then
  echo "❌ 失败！API 返回错误"
  echo ""
  echo "错误详情："
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  echo ""

  if echo "$RESPONSE" | grep -qi "Invalid"; then
    echo "💡 提示：API Key 无效，请检查"
  elif echo "$RESPONSE" | grep -qi "404\|not found"; then
    echo "💡 提示：端点或模型不存在"
    echo "   当前配置："
    echo "   - 端点: https://api.deepseek.com/v1/embeddings"
    echo "   - 模型: deepseek-embedding"
  elif echo "$RESPONSE" | grep -qi "quota\|limit"; then
    echo "💡 提示：API 配额不足或达到速率限制"
  fi

  exit 1

else
  echo "❌ 失败！无法识别的响应"
  echo ""
  echo "完整响应："
  echo "$RESPONSE"
  echo ""
  echo "💡 可能原因："
  echo "  1. 网络连接问题"
  echo "  2. API 端点已变更"
  echo "  3. 响应格式不符合预期"

  exit 1
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
