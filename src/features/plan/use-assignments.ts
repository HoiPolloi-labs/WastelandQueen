import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Assignment } from '@/types/wk'
import type { DraftAssignment } from './auto-sort'

export function useAssignments(eventId: string | undefined) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!eventId) return
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('event_id', eventId)
      .order('position', { ascending: true })
    if (error) setError(error.message)
    setAssignments((data ?? []) as Assignment[])
  }, [eventId])

  useEffect(() => {
    if (!eventId) {
      setLoading(false)
      return
    }
    setLoading(true)
    refresh().finally(() => setLoading(false))
  }, [eventId, refresh])

  /**
   * Optimistic move: update local first, persist after.
   * One row per (event, signup, shift) — upsert on unique key.
   */
  const moveOne = useCallback(
    async (
      signupId: string,
      shift: 1 | 2,
      patch: Partial<
        Pick<Assignment, 'building' | 'is_captain' | 'position'>
      >,
    ) => {
      if (!eventId) return
      // optimistic
      setAssignments((prev) => {
        const idx = prev.findIndex((a) => a.signup_id === signupId && a.shift === shift)
        if (idx === -1) {
          return [
            ...prev,
            {
              id: `tmp-${signupId}-${shift}`,
              event_id: eventId,
              signup_id: signupId,
              building: patch.building ?? 'unassigned',
              shift,
              is_captain: patch.is_captain ?? false,
              position: patch.position ?? 0,
              updated_at: new Date().toISOString(),
            },
          ]
        }
        const next = [...prev]
        next[idx] = { ...next[idx]!, ...patch, updated_at: new Date().toISOString() }
        return next
      })

      // Use insert + manual conflict handling because PostgREST upsert needs the unique
      // constraint columns in the payload.
      const existing = await supabase
        .from('assignments')
        .select('id')
        .eq('event_id', eventId)
        .eq('signup_id', signupId)
        .eq('shift', shift)
        .maybeSingle()

      if (existing.data) {
        const { error } = await supabase
          .from('assignments')
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq('id', existing.data.id)
        if (error) setError(error.message)
      } else {
        const { error } = await supabase.from('assignments').insert({
          event_id: eventId,
          signup_id: signupId,
          shift,
          building: patch.building ?? 'unassigned',
          is_captain: patch.is_captain ?? false,
          position: patch.position ?? 0,
        })
        if (error) setError(error.message)
      }
    },
    [eventId],
  )

  const applyDraft = useCallback(
    async (drafts: DraftAssignment[]) => {
      if (!eventId) return
      // Clear existing assignments for the event, then bulk insert.
      const { error: delErr } = await supabase
        .from('assignments')
        .delete()
        .eq('event_id', eventId)
      if (delErr) {
        setError(delErr.message)
        return
      }
      if (drafts.length === 0) {
        await refresh()
        return
      }
      const rows = drafts.map((d) => ({ ...d, event_id: eventId }))
      const { error: insErr } = await supabase.from('assignments').insert(rows)
      if (insErr) setError(insErr.message)
      await refresh()
    },
    [eventId, refresh],
  )

  const removeAll = useCallback(async () => {
    if (!eventId) return
    const { error } = await supabase.from('assignments').delete().eq('event_id', eventId)
    if (error) setError(error.message)
    setAssignments([])
  }, [eventId])

  return { assignments, loading, error, refresh, moveOne, applyDraft, removeAll }
}
