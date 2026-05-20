import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { EventConfig } from '@/types/wk'

/**
 * Fetch all events (most recent first). Used by the multi-event picker.
 */
export function useEvents() {
  const [events, setEvents] = useState<EventConfig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('events')
      .select('*')
      .order('starts_at_utc', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (cancelled) return
        setEvents((data ?? []) as EventConfig[])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { events, loading }
}
