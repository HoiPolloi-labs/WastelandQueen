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

    // Realtime: pick up planner-side toggles (heroes_enabled, coffer state,
    // governor changes, etc.) without forcing a manual reload. Migration 0028
    // adds `events` to the supabase_realtime publication; RLS still gates which
    // rows reach this client (only matching event_id_claim()).
    const channel = supabase
      .channel(`event:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        () => {
          if (!cancelled) void refresh()
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [eventId, refresh])

  return { event, loading, error, refresh }
}
