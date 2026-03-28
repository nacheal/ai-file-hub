/**
 * 文本向量化工具函数（调用 SiliconFlow Embedding API）
 *
 * 功能：
 * - 批量将文本块转换为 1024 维向量
 * - 支持重试机制（最多 3 次，指数退避）
 * - 错误处理和日志记录
 *
 * 技术说明：
 * - SiliconFlow 提供 OpenAI 兼容的 Embedding API
 * - 使用标准的 OpenAI Embedding 端点和请求格式
 * - 模型：BAAI/bge-m3（输出 1024 维向量，中文效果优秀）
 */

/**
 * Embedding API 配置
 */
export const EMBEDDING_CONFIG = {
  MODEL: 'BAAI/bge-m3',           // SiliconFlow Embedding 模型（OpenAI 兼容）
  DIMENSIONS: 1024,               // 输出向量维度
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY: 1000,      // 初始重试延迟（毫秒）
  API_ENDPOINT: 'https://api.siliconflow.cn/v1/embeddings',  // OpenAI 兼容端点
} as const;

/**
 * Embedding API 响应类型
 */
interface EmbeddingResponse {
  object: 'list';
  data: Array<{
    object: 'embedding';
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * 延迟函数（用于重试）
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 批量生成文本向量
 *
 * @param chunks 文本块数组
 * @param apiKey SiliconFlow API Key（可选，默认从环境变量获取）
 * @returns 向量数组，每个向量为 1024 维浮点数组
 *
 * @throws 如果 API 调用失败且重试次数耗尽
 *
 * @example
 * ```typescript
 * const chunks = ["文本块1", "文本块2"];
 * const embeddings = await embedChunks(chunks);
 * // 返回: [[0.123, 0.456, ...], [0.789, 0.012, ...]]
 * // 每个向量包含 1024 个浮点数
 * ```
 */
export async function embedChunks(
  chunks: string[],
  apiKey?: string,
): Promise<number[][]> {
  // 边界情况处理
  if (!chunks || chunks.length === 0) {
    return [];
  }

  // 获取 API Key
  const key = apiKey || Deno.env.get('SILICONFLOW_API_KEY');
  if (!key) {
    throw new Error('SILICONFLOW_API_KEY not found in environment variables');
  }

  let lastError: Error | null = null;

  // 重试逻辑
  for (let attempt = 0; attempt < EMBEDDING_CONFIG.MAX_RETRIES; attempt++) {
    try {
      // 计算当前重试延迟（指数退避）
      if (attempt > 0) {
        const retryDelay = EMBEDDING_CONFIG.INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        console.log(`[embedChunks] Retry attempt ${attempt} after ${retryDelay}ms`);
        await delay(retryDelay);
      }

      // 调用 SiliconFlow Embedding API
      const response = await fetch(EMBEDDING_CONFIG.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_CONFIG.MODEL,
          input: chunks,
        }),
      });

      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `SiliconFlow API error (${response.status}): ${errorText}`
        );
      }

      // 解析响应
      const data: EmbeddingResponse = await response.json();

      // 验证响应数据
      if (!data.data || data.data.length !== chunks.length) {
        throw new Error(
          `Invalid API response: expected ${chunks.length} embeddings, got ${data.data?.length || 0}`
        );
      }

      // 提取并排序向量（按 index 排序，确保顺序正确）
      const embeddings = data.data
        .sort((a, b) => a.index - b.index)
        .map(item => item.embedding);

      // 日志记录
      console.log(
        `[embedChunks] Successfully generated ${embeddings.length} embeddings, ` +
        `used ${data.usage.total_tokens} tokens`
      );

      return embeddings;

    } catch (error) {
      lastError = error as Error;
      console.error(
        `[embedChunks] Attempt ${attempt + 1} failed:`,
        error instanceof Error ? error.message : String(error)
      );

      // 如果是最后一次尝试，抛出错误
      if (attempt === EMBEDDING_CONFIG.MAX_RETRIES - 1) {
        break;
      }
    }
  }

  // 所有重试都失败了
  throw new Error(
    `Failed to generate embeddings after ${EMBEDDING_CONFIG.MAX_RETRIES} attempts: ${lastError?.message}`
  );
}

/**
 * 为单个文本生成向量（便捷函数）
 *
 * @param text 单个文本
 * @param apiKey SiliconFlow API Key（可选，默认从环境变量获取）
 * @returns 1024 维向量
 */
export async function embedSingleText(
  text: string,
  apiKey?: string,
): Promise<number[]> {
  const embeddings = await embedChunks([text], apiKey);
  return embeddings[0];
}

/**
 * 计算两个向量的余弦相似度
 *
 * @param vecA 向量 A
 * @param vecB 向量 B
 * @returns 余弦相似度（-1 到 1 之间，越接近 1 越相似）
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
