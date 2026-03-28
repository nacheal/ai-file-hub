# DeepSeek Embedding API 配置修正说明

**日期：** 2026-03-28
**修正版本：** v1.2

---

## 问题描述

用户测试 DeepSeek Embedding API 时发现报错，经对比官方文档发现配置错误。

## 错误配置（已修正）

| 配置项 | 错误值 | 正确值 |
|--------|--------|--------|
| API 端点 | `https://api.deepseek.com/embeddings` | `https://api.deepseek.com/v1/embeddings` |
| 模型名称 | `deepseek-chat` | `deepseek-embedding-v2` |

## 已修正的文件

### 1. 后端代码
- ✅ `supabase/functions/_shared/embed.ts`
  - API_ENDPOINT: `https://api.deepseek.com/v1/embeddings`
  - MODEL: `deepseek-embedding-v2`

### 2. 测试脚本
- ✅ `test_deepseek_embedding.sh` - 完整测试脚本（已修正）
- ✅ `test_quick.sh` - 新增快速测试脚本（含自动维度检测）

### 3. 文档
- ✅ `aiInfo/DEEPSEEK_UPDATE.md` - 更新 API 调用示例
- ✅ `aiInfo/DEPLOY_GUIDE.md` - 添加前置验证步骤

---

## 官方 API 参考

根据 DeepSeek 官方文档：

```python
import requests

API_KEY = "YOUR_API_KEY"
url = "https://api.deepseek.com/v1/embeddings"  # ← 注意 /v1

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

payload = {
    "model": "deepseek-embedding-v2",  # ← 专用 Embedding 模型
    "input": ["你好，世界！"]
}

response = requests.post(url, headers=headers, json=payload)
data = response.json()
embeddings = [item["embedding"] for item in data["data"]]
print(f"向量维度: {len(embeddings[0])}")
```

---

## ⚠️ 重要：向量维度待确认

**当前配置：** `vector(1024)`

**需要验证：** DeepSeek Embedding V2 的实际输出维度

根据官方示例，维度通过 `len(embeddings[0])` 获取，可能的值：
- 768 维
- 1024 维
- 1536 维

**验证方法：**

```bash
# 运行快速测试脚本（自动检测维度）
bash test_quick.sh sk-your-deepseek-api-key
```

脚本会自动：
1. 调用 API 获取实际向量
2. 计算维度
3. 对比配置是否匹配
4. 如果不匹配，给出修改建议

---

## 如果维度不是 1024

假设测试结果显示实际维度是 **768**：

### 需要修改的文件：

**1. 数据库迁移 SQL**
```sql
-- supabase/migrations/20260328_add_document_chunks_for_rag.sql
embedding vector(768)  -- 改为 768
```

**2. Embedding 配置**
```typescript
// supabase/functions/_shared/embed.ts
export const EMBEDDING_CONFIG = {
  MODEL: 'deepseek-embedding-v2',
  DIMENSIONS: 768,  // 改为 768
  // ...
}
```

**3. PRD 文档（可选）**
```markdown
// aiInfo/PRD6.md
| DeepSeek Embedding | 768 | 极低 | 已选择 |
```

---

## 下一步操作

### 1. 运行测试验证

```bash
# 快速测试（推荐，自动检测维度）
bash test_quick.sh sk-70aec95...

# 或完整测试
bash test_deepseek_embedding.sh sk-70aec95...
```

### 2. 根据测试结果

**如果显示"✓ 向量维度为 1024，与代码配置匹配"**
- ✅ 无需修改，直接继续部署

**如果显示"⚠️ 向量维度为 XXX，不是预期的 1024"**
- ⚠️ 按照脚本提示修改相应文件
- 修改完成后再执行数据库迁移

### 3. 开始部署

按照 `aiInfo/DEPLOY_GUIDE.md` 的步骤执行。

---

## 参考资源

- **DeepSeek 官方文档**：https://platform.deepseek.com/docs
- **部署指南**：`aiInfo/DEPLOY_GUIDE.md`
- **测试脚本**：`test_quick.sh`（推荐）或 `test_deepseek_embedding.sh`

---

**修正完成，现在可以重新测试了！** 🎯
