import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Signup } from '@/types/wk'

export function useSignups(eventId: string | undefined) {
  const [signups, setSignups] = useState<Signup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Ref so callbacks created inside refresh() see the *current* event id
  // after a switch, not the stale closure value. Combined with the
  // cancelled flag inside useEffect we never land a previous event's
  // response in the new event's state.
  const eventIdRef = useRef(eventId)
  eventIdRef.current = eventId

  const refresh = useCallback(async () => {
    if (!eventId) return
    const requestedFor = eventId
    const { data, error } = await supabase
      .from('signups')
      .select('*')
      .eq('event_id', eventId)
      .order('submitted_at', { ascending: true })
    // Discard responses for an event we've since moved away from.
    if (eventIdRef.current !== requestedFor) return
    // CODE-REVIEW fix: keep prior state on transient error instead of
    // collapsing the list to []. UI used to flash "0 sign-ups" on any
    // network hiccup or realtime-burst race.
    if (error) {
      setError(error.message)
      return
    }
    setSignups((data ?? []) as Signup[])
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

    const channel = supabase
      .channel(`signups:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signups', filter: `event_id=eq.${eventId}` },
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

  return { signups, loading, error, refresh }
}
