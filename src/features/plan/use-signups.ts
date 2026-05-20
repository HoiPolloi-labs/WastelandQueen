import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Signup } from '@/types/wk'

export function useSignups(eventId: string | undefined) {
  const [signups, setSignups] = useState<Signup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!eventId) return
    const { data, error } = await supabase
      .from('signups')
      .select('*')
      .eq('event_id', eventId)
      .order('submitted_at', { ascending: true })
    if (error) setError(error.message)
    setSignups((data ?? []) as Signup[])
  }, [eventId])

  useEffect(() => {
    if (!eventId) {
      setLoading(false)
      return
    }
    setLoading(true)
    refresh().finally(() => setLoading(false))

    const channel = supabase
      .channel(`signups:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signups', filter: `event_id=eq.${eventId}` },
        () => {
          void refresh()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [eventId, refresh])

  return { signups, loading, error, refresh }
}
