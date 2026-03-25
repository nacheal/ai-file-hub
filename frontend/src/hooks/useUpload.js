import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// 扩展名 → 标准 MIME 类型映射（解决浏览器将 .md 识别为 application/octet-stream 的问题）
const EXT_MIME_MAP = {
  '.pdf':  'application/pdf',
  '.txt':  'text/plain',
  '.md':   'text/markdown',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

const MAX_SIZE = 50 * 1024 * 1024 // 50MB

function getExt(filename) {
  return '.' + filename.split('.').pop().toLowerCase()
}

/** 返回上传时应使用的 MIME 类型（优先扩展名推断，确保 Storage 能接受） */
function resolveContentType(file) {
  const ext = getExt(file.name)
  return EXT_MIME_MAP[ext] || file.type || 'application/octet-stream'
}

function validateFile(file) {
  const ext = getExt(file.name)
  if (!EXT_MIME_MAP[ext]) {
    return `不支持的文件格式（${file.name}）。支持：PDF、TXT、MD、PNG、JPG、WebP`
  }
  if (file.size > MAX_SIZE) {
    return `文件过大（${file.name}，${(file.size / 1024 / 1024).toFixed(1)}MB，上限 50MB）`
  }
  return null
}

export function useUpload() {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

  async function upload(file) {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return null
    }

    setError(null)
    setUploading(true)
    setProgress(0)

    try {
      const docId = crypto.randomUUID()
      const storagePath = `${user.id}/${docId}/${file.name}`

      const contentType = resolveContentType(file)
      // 重新包成 Blob，确保 MIME 类型正确——直接传 File 对象时 SDK 可能沿用 file.type
      const blob = new Blob([file], { type: contentType })

      // 上传至 Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(storagePath, blob, { contentType })

      if (uploadError) throw uploadError

      setProgress(90)

      // 写入 documents 表
      const { data, error: insertError } = await supabase
        .from('documents')
        .insert({
          id: docId,
          user_id: user.id,
          name: file.name,
          size: file.size,
          mime_type: contentType,
          storage_path: storagePath,
          status: 'pending',
        })
        .select()
        .single()

      if (insertError) throw insertError

      setProgress(100)
      return data
    } catch (err) {
      setError(err.message || '上传失败，请重试')
      return null
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 800)
    }
  }

  return { upload, uploading, progress, error, setError }
}
