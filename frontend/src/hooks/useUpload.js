import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'image/png',
  'image/jpeg',
  'image/webp',
]

// text/markdown 通常以 .md 文件出现，有时 MIME 为 text/plain
const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.md', '.png', '.jpg', '.jpeg', '.webp']

const MAX_SIZE = 50 * 1024 * 1024 // 50MB

function validateFile(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase()
  const typeOk = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext)
  if (!typeOk) {
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

      // 上传至 Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(storagePath, file)

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
          mime_type: file.type || 'application/octet-stream',
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
