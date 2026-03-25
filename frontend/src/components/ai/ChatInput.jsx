import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'

/**
 * ChatInput — 问答输入框
 *
 * Props:
 *   onSend(text)  — 发送回调
 *   streaming     — 是否正在流式输出（禁用输入框）
 *   disabled      — 是否禁用（AI 分析未完成时）
 */
export default function ChatInput({ onSend, streaming = false, disabled = false }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  // 自动调整高度
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [value])

  function handleSend() {
    if (!value.trim() || streaming || disabled) return
    onSend(value.trim())
    setValue('')
    // 重置高度
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e) {
    // Enter 发送（Shift+Enter 换行）
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isDisabled = disabled || streaming

  return (
    <div className="flex items-end gap-2 rounded-xl border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-colors">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        placeholder={disabled ? '等待 AI 分析完成后即可提问…' : '针对文件内容提问，Enter 发送，Shift+Enter 换行'}
        rows={1}
        className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        style={{ minHeight: '24px', maxHeight: '120px' }}
      />
      <button
        onClick={handleSend}
        disabled={isDisabled || !value.trim()}
        className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {streaming ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Send size={13} />
        )}
      </button>
    </div>
  )
}
