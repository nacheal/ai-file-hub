import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

/**
 * useChat hook — 管理 AI 问答对话状态，支持 SSE 流式输出
 *
 * @returns {object}
 *   messages   — 对话消息列表 [{ role: 'user'|'assistant', content: string }]
 *   streaming  — 是否正在流式输出
 *   error      — 错误信息（字符串 | null）
 *   sendMessage(documentId, text) — 发送用户消息并接收 AI 流式回复
 *   clearMessages() — 清空对话历史
 */
export function useChat() {
  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)

  const sendMessage = useCallback(async (documentId, text) => {
    if (!text.trim() || streaming) return

    // 追加用户消息
    const userMsg = { role: 'user', content: text.trim() }
    const historySnapshot = [...messages]
    setMessages((prev) => [...prev, userMsg])
    setError(null)
    setStreaming(true)

    // 追加空的 assistant 消息占位（流式填充）
    const assistantIndex = historySnapshot.length + 1
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-with-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          document_id: documentId,
          message: text.trim(),
          // 传递历史（不含本次新发的用户消息，避免重复）
          history: historySnapshot.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error ?? `请求失败 (${response.status})`)
      }

      // ── 读取 SSE 流 ──────────────────────────────────────────────────────────
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE 按行解析
        const lines = buffer.split('\n')
        // 保留最后一行（可能不完整）
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const payload = trimmed.slice(6) // 去掉 "data: "
          if (payload === '[DONE]') break

          try {
            const chunk = JSON.parse(payload)
            const delta = chunk.choices?.[0]?.delta?.content ?? ''
            if (delta) {
              setMessages((prev) => {
                const updated = [...prev]
                const target = updated[assistantIndex]
                if (target) {
                  updated[assistantIndex] = { ...target, content: target.content + delta }
                }
                return updated
              })
            }
          } catch {
            // 忽略解析失败的行
          }
        }
      }
    } catch (err) {
      console.error('useChat error:', err)
      setError(err.message || 'AI 问答失败，请重试')
      // 移除空的 assistant 占位消息
      setMessages((prev) => {
        const updated = [...prev]
        if (updated[assistantIndex]?.content === '') {
          updated.splice(assistantIndex, 1)
        }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }, [messages, streaming])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return { messages, streaming, error, sendMessage, clearMessages }
}
