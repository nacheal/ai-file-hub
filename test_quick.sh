#!/bin/bash

# DeepSeek Embedding API 快速测试
# 使用官方文档的正确配置

echo "=========================================="
echo "DeepSeek Embedding API 快速测试"
echo "=========================================="
echo ""

if [ -z "$1" ]; then
  echo "❌ 请提供 DeepSeek API Key"
  echo ""
  echo "使用方法："
  echo "  bash test_quick.sh sk-your-api-key-here"
  exit 1
fi

API_KEY="$1"

echo "🔑 API Key: ${API_KEY:0:10}..."
echo "📡 测试中..."
echo ""

# 使用官方端点和模型
curl -X POST https://api.deepseek.com/v1/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "model": "deepseek-embedding-v2",
    "input": ["测试文本"]
  }' 2>/dev/null | python3 -c "
import sys
import json

try:
    data = json.load(sys.stdin)

    if 'data' in data and len(data['data']) > 0:
        embedding = data['data'][0]['embedding']
        dims = len(embedding)

        print('✅ 成功！')
        print(f'📊 向量维度: {dims}')
        print('')

        if dims == 1024:
            print('✓ 向量维度为 1024，与代码配置匹配')
            print('✓ 可以继续部署')
        else:
            print(f'⚠️  警告：向量维度为 {dims}，不是预期的 1024')
            print('')
            print('需要修改以下文件：')
            print(f'  1. supabase/migrations/20260328_add_document_chunks_for_rag.sql')
            print(f'     将 vector(1024) 改为 vector({dims})')
            print(f'  2. supabase/functions/_shared/embed.ts')
            print(f'     将 DIMENSIONS: 1024 改为 DIMENSIONS: {dims}')

    elif 'error' in data:
        print('❌ API 返回错误：')
        print(json.dumps(data['error'], indent=2, ensure_ascii=False))

    else:
        print('❌ 无法识别的响应：')
        print(json.dumps(data, indent=2, ensure_ascii=False))

except json.JSONDecodeError:
    print('❌ 响应不是有效的 JSON')
    print('可能是网络问题或 API 端点错误')
except Exception as e:
    print(f'❌ 错误：{e}')
"

echo ""
echo "=========================================="
