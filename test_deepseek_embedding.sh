#!/bin/bash

# DeepSeek Embedding API 测试脚本
# 用途：验证 DeepSeek API Key 是否支持 Embedding 功能

echo "=========================================="
echo "DeepSeek Embedding API 测试"
echo "=========================================="
echo ""

# 检查是否提供了 API Key
if [ -z "$1" ]; then
  echo "❌ 错误：请提供 DeepSeek API Key"
  echo ""
  echo "使用方法："
  echo "  bash test_deepseek_embedding.sh sk-your-api-key-here"
  echo ""
  exit 1
fi

API_KEY="$1"
echo "✓ API Key: ${API_KEY:0:10}..."
echo ""

# 测试 Embedding API
echo "📡 正在测试 DeepSeek Embedding API..."
echo ""

RESPONSE=$(curl -s -X POST https://api.deepseek.com/v1/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "model": "deepseek-embedding-v2",
    "input": ["测试文本", "这是第二段测试文本"]
  }')

# 检查响应
if echo "$RESPONSE" | grep -q '"object":"list"'; then
  echo "✅ 成功！DeepSeek Embedding API 可用"
  echo ""

  # 提取向量维度
  EMBEDDING=$(echo "$RESPONSE" | grep -o '"embedding":\[.*\]' | head -1)
  DIMENSIONS=$(echo "$EMBEDDING" | grep -o '[0-9.]\+' | wc -l | tr -d ' ')

  echo "📊 返回信息："
  echo "  - 向量维度: $DIMENSIONS"
  echo "  - 批量处理: 支持（测试了 2 个文本）"
  echo ""

  if [ "$DIMENSIONS" -eq "1024" ]; then
    echo "✓ 向量维度正确（1024），与代码配置匹配"
  else
    echo "⚠️  警告：向量维度为 $DIMENSIONS，预期为 1024"
    echo "   可能需要调整代码中的 DIMENSIONS 配置"
  fi

  echo ""
  echo "🎉 可以继续部署阶段六了！"

elif echo "$RESPONSE" | grep -q '"error"'; then
  echo "❌ 失败！API 返回错误"
  echo ""
  echo "错误详情："
  echo "$RESPONSE" | grep -o '"error":{[^}]*}' | sed 's/,/\n  /g'
  echo ""

  if echo "$RESPONSE" | grep -q "Invalid"; then
    echo "💡 提示：API Key 无效，请检查是否正确"
  elif echo "$RESPONSE" | grep -q "404"; then
    echo "💡 提示：DeepSeek 可能不支持 Embedding API"
    echo "   建议切换到 OpenAI Embedding 或其他方案"
  elif echo "$RESPONSE" | grep -q "quota"; then
    echo "💡 提示：API 配额不足，请充值"
  fi

  exit 1

else
  echo "❌ 失败！无法识别的响应"
  echo ""
  echo "响应内容："
  echo "$RESPONSE"
  echo ""
  echo "💡 可能原因："
  echo "  1. DeepSeek API 端点已变更"
  echo "  2. DeepSeek 不支持 Embedding API"
  echo "  3. 网络连接问题"
  echo ""
  echo "建议：查阅 DeepSeek 最新文档或切换到 OpenAI Embedding"

  exit 1
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
