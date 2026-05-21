import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { EventConfig } from '@/types/wk'

export function useEvent(eventId: string | undefined) {
  const [event, setEvent] = useState<EventConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!eventId) return
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle()
    if (error) setError(error.message)
    setEvent((data as EventConfig | null) ?? null)
  }, [eventId])

  useEffect(() => {
    if (!eventId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    refresh().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [eventId, refresh])

  return { event, loading, error, refresh }
}
