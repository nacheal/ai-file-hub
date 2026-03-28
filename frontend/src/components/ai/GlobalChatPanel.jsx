import { useState } from 'react'
import { FileText, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ChatInput from '@/components/ai/ChatInput'
import ChatOutput from '@/components/ai/ChatOutput'
import { supabase } from '@/lib/supabase'

/**
 * GlobalChatPanel — 全局问答面板
 *
 * 功能：
 * - 在所有文件中检索相关内容并回答用户问题
 * - 展示引用来源文件列表
 */
export default function GlobalChatPanel({ onClose }) {
  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState(false)
  const [sources, setSources] = useState([])
  const navigate = useNavigate()

  async function handleSend(text) {
    // 1. 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content: text }])

    // 2. 准备 AI 消息占位
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])
    setStreaming(true)
    setSources([]) // 清空之前的来源

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('未登录')

      const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-global`

      const res = await fetch(EDGE_FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: text,
          history: messages,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || '请求失败')
      }

      // 3. 处理 SSE 流
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue

          // 解析 SSE 事件
          if (line.startsWith('event:')) {
            const eventType = line.slice(6).trim()

            // 获取下一行的 data
            const nextLineIdx = lines.indexOf(line) + 1
            if (nextLineIdx < lines.length) {
              const dataLine = lines[nextLineIdx]
              if (dataLine.startsWith('data:')) {
                const data = dataLine.slice(5).trim()

                // 处理 sources 事件
                if (eventType === 'sources') {
                  try {
                    const sourcesData = JSON.parse(data)
                    setSources(sourcesData)
                  } catch (e) {
                    console.error('解析 sources 失败:', e)
                  }
                }
              }
            }
            continue
          }

          if (line.startsWith('data:')) {
            const data = line.slice(5).trim()

            if (data === '[DONE]') {
              setStreaming(false)
              break
            }

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content

              if (delta) {
                setMessages(prev => {
                  const newMsgs = [...prev]
                  const lastMsg = newMsgs[newMsgs.length - 1]
                  if (lastMsg.role === 'assistant') {
                    lastMsg.content += delta
                  }
                  return newMsgs
                })
              }
            } catch (e) {
              // 忽略非 JSON 行
            }
          }
        }
      }

      setStreaming(false)
    } catch (error) {
      console.error('全局问答失败:', error)
      setMessages(prev => {
        const newMsgs = [...prev]
        const lastMsg = newMsgs[newMsgs.length - 1]
        if (lastMsg.role === 'assistant' && lastMsg.content === '') {
          lastMsg.content = `抱歉，问答失败：${error.message}`
        }
        return newMsgs
      })
      setStreaming(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* 标题栏 */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">问所有文件</h2>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* 对话区域 */}
      <div className="max-h-[400px] overflow-y-auto px-4 pb-2">
        {messages.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <p>向您的所有文件提问，AI 会从相关内容中找到答案</p>
          </div>
        ) : (
          <>
            <ChatOutput messages={messages} streaming={streaming} />

            {/* 引用来源 */}
            {sources.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  引用来源 ({sources.length})
                </p>
                <div className="space-y-1.5">
                  {sources.map((source) => (
                    <button
                      key={source.id}
                      onClick={() => navigate(`/file/${source.id}`)}
                      className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                    >
                      <FileText size={14} className="shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate text-foreground">{source.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 输入框 */}
      <div className="border-t border-border p-3">
        <ChatInput
          onSend={handleSend}
          streaming={streaming}
          placeholder="在所有文件中搜索并提问..."
        />
      </div>
    </div>
  )
}
