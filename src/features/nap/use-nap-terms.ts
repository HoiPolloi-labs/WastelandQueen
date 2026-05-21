import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { NapStatus, NapTerm } from '@/types/wk'

export function useNapTerms(eventId: string | undefined) {
  const [terms, setTerms] = useState<NapTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!eventId) return
    const { data, error } = await supabase
      .from('nap_terms')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    setTerms((data ?? []) as NapTerm[])
  }, [eventId])

  useEffect(() => {
    if (!eventId) {
      setLoading(false)
      return
    }
    setLoading(true)
    refresh().finally(() => setLoading(false))

    const channel = supabase
      .channel(`nap:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nap_terms', filter: `event_id=eq.${eventId}` },
        () => {
          void refresh()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [eventId, refresh])

  const add = useCallback(
    async (
      withState: string,
      text: string,
      timing?: { starts_at_utc: string | null; ends_at_utc: string | null },
    ) => {
      if (!eventId) return
      const { error } = await supabase.from('nap_terms').insert({
        event_id: eventId,
        with_state: withState.trim().toUpperCase(),
        terms: text.trim(),
        starts_at_utc: timing?.starts_at_utc ?? null,
        ends_at_utc: timing?.ends_at_utc ?? null,
      })
      if (error) setError(error.message)
    },
    [eventId],
  )

  const update = useCallback(
    async (
      id: string,
      patch: Partial<
        Pick<NapTerm, 'with_state' | 'terms' | 'status' | 'starts_at_utc' | 'ends_at_utc'>
      >,
    ) => {
      const { error } = await supabase
        .from('nap_terms')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) setError(error.message)
    },
    [],
  )

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('nap_terms').delete().eq('id', id)
    if (error) setError(error.message)
  }, [])

  const setStatus = useCallback(
    (id: string, status: NapStatus) => update(id, { status }),
    [update],
  )

  return { terms, loading, error, add, update, remove, setStatus, refresh }
}
