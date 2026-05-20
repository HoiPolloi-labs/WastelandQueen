import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { EventConfig } from '@/types/wk'

export function useEvent(eventId: string | undefined) {
  const [event, setEvent] = useState<EventConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        setEvent((data as EventConfig | null) ?? null)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventId])

  return { event, loading, error }
}
