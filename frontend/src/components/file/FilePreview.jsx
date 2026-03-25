import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function FilePreview({ url, name, onClose }) {
  // ESC 关闭
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -right-3 -top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-800 shadow-md hover:bg-gray-100"
        >
          <X size={14} />
        </button>
        <img
          src={url}
          alt={name}
          className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
        />
        {name && (
          <p className="mt-2 text-center text-xs text-white/70">{name}</p>
        )}
      </div>
    </div>
  )
}
