import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export function useDocuments() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDocuments = useCallback(async () => {
    if (!user) return
    try {
      const { data, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setDocuments(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // 订阅 Realtime：监听 INSERT / UPDATE
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setDocuments(prev => [payload.new, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setDocuments(prev =>
            prev.map(doc => doc.id === payload.new.id ? payload.new : doc)
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setDocuments(prev => prev.filter(doc => doc.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  async function deleteDocument(doc) {
    try {
      // 先删 Storage 文件
      await supabase.storage.from('user-files').remove([doc.storage_path])

      // 再删数据库记录（CASCADE 自动删 ai_results）
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)

      if (deleteError) throw deleteError
      // Realtime DELETE 事件会自动更新本地状态
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  return { documents, loading, error, deleteDocument, refetch: fetchDocuments }
}
