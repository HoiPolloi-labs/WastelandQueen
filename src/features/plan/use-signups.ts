import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Signup } from '@/types/wk'

export function useSignups(eventId: string | undefined) {
  const [signups, setSignups] = useState<Signup[]>([])
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
      .from('signups')
      .select('*')
      .eq('event_id', eventId)
      .order('submitted_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        setSignups((data ?? []) as Signup[])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eventId])

  const refresh = async () => {
    if (!eventId) return
    const { data } = await supabase
      .from('signups')
      .select('*')
      .eq('event_id', eventId)
      .order('submitted_at', { ascending: true })
    setSignups((data ?? []) as Signup[])
  }

  return { signups, loading, error, refresh }
}
