import { useEffect, useRef } from 'react'
import { Bot, User } from 'lucide-react'

/**
 * ChatOutput — 对话消息列表
 *
 * Props:
 *   messages  — [{ role: 'user'|'assistant', content: string }]
 *   streaming — 是否正在流式输出（最后一条 assistant 消息末尾显示光标）
 */
export default function ChatOutput({ messages, streaming = false }) {
  const bottomRef = useRef(null)

  // 新消息时自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) return null

  return (
    <div className="space-y-4 py-2">
      {messages.map((msg, idx) => {
        const isUser = msg.role === 'user'
        const isLastAssistant = !isUser && idx === messages.length - 1

        return (
          <div key={idx} className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* 头像 */}
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium mt-0.5 ${
                isUser
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground border border-border'
              }`}
            >
              {isUser ? <User size={13} /> : <Bot size={13} />}
            </div>

            {/* 消息气泡 */}
            <div
              className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                isUser
                  ? 'rounded-tr-sm bg-primary text-primary-foreground'
                  : 'rounded-tl-sm bg-muted text-foreground'
              }`}
            >
              {msg.content ? (
                <span className="whitespace-pre-wrap break-words">
                  {msg.content}
                  {/* 流式光标 */}
                  {isLastAssistant && streaming && (
                    <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-current align-middle opacity-70" />
                  )}
                </span>
              ) : (
                /* 等待第一个 token */
                isLastAssistant && streaming ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                  </span>
                ) : null
              )}
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
