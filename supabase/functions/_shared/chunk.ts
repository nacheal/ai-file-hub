/**
 * 文本分块工具函数（用于 RAG 向量检索）
 *
 * 分块规则：
 * - 每块目标长度：500 字符
 * - 相邻块重叠：50 字符（保留上下文连贯性）
 * - 最小块长度：100 字符（过短尾块合并入前块）
 * - 优先在自然段边界（\n\n）处切割
 */

/**
 * 分块配置常量
 */
export const CHUNK_CONFIG = {
  TARGET_SIZE: 500,      // 每块目标字符数
  OVERLAP: 50,          // 相邻块重叠字符数
  MIN_SIZE: 100,        // 最小块长度
  PARAGRAPH_SEP: '\n\n', // 段落分隔符
} as const;

/**
 * 将长文本切分为多个重叠的文本块
 *
 * @param text 原始文本
 * @returns 文本块数组，按顺序排列
 *
 * @example
 * ```typescript
 * const chunks = chunkText("这是一段很长的文本...");
 * // 返回: ["第一块文本...", "第二块文本（与第一块有 50 字符重叠）...", ...]
 * ```
 */
export function chunkText(text: string): string[] {
  // 边界情况处理
  if (!text || text.trim().length === 0) {
    return [];
  }

  // 如果文本本身就很短，直接返回
  if (text.length <= CHUNK_CONFIG.TARGET_SIZE) {
    return [text];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    // 计算本次切块的结束位置（考虑目标大小）
    let endIndex = Math.min(startIndex + CHUNK_CONFIG.TARGET_SIZE, text.length);

    // 如果不是最后一块，尝试在段落边界处切割
    if (endIndex < text.length) {
      // 在 [startIndex + TARGET_SIZE - 50, startIndex + TARGET_SIZE + 50] 范围内
      // 寻找最近的 \n\n 位置
      const searchStart = Math.max(startIndex, endIndex - 50);
      const searchEnd = Math.min(text.length, endIndex + 50);
      const searchText = text.substring(searchStart, searchEnd);

      const paragraphBreakIndex = searchText.indexOf(CHUNK_CONFIG.PARAGRAPH_SEP);

      if (paragraphBreakIndex !== -1) {
        // 找到段落边界，在此处切割
        endIndex = searchStart + paragraphBreakIndex + CHUNK_CONFIG.PARAGRAPH_SEP.length;
      }
    }

    // 提取当前块
    const chunk = text.substring(startIndex, endIndex).trim();

    // 只添加非空块
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // 移动到下一块的起始位置（考虑重叠）
    // 如果当前块太短，不需要重叠
    if (endIndex - startIndex > CHUNK_CONFIG.OVERLAP) {
      startIndex = endIndex - CHUNK_CONFIG.OVERLAP;
    } else {
      startIndex = endIndex;
    }
  }

  // 处理最后一块：如果太短，合并入前一块
  if (chunks.length > 1) {
    const lastChunk = chunks[chunks.length - 1];
    if (lastChunk.length < CHUNK_CONFIG.MIN_SIZE) {
      const prevChunk = chunks[chunks.length - 2];
      chunks[chunks.length - 2] = prevChunk + '\n\n' + lastChunk;
      chunks.pop();
    }
  }

  return chunks;
}

/**
 * 获取分块统计信息（用于调试和监控）
 *
 * @param text 原始文本
 * @returns 分块统计信息
 */
export function getChunkStats(text: string): {
  totalLength: number;
  chunkCount: number;
  averageChunkLength: number;
  minChunkLength: number;
  maxChunkLength: number;
} {
  const chunks = chunkText(text);
  const lengths = chunks.map(c => c.length);

  return {
    totalLength: text.length,
    chunkCount: chunks.length,
    averageChunkLength: lengths.length > 0
      ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
      : 0,
    minChunkLength: lengths.length > 0 ? Math.min(...lengths) : 0,
    maxChunkLength: lengths.length > 0 ? Math.max(...lengths) : 0,
  };
}
