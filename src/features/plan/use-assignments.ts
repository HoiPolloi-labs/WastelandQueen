import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Assignment, ShiftNumber } from '@/types/wk'
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

    const channel = supabase
      .channel(`assignments:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments', filter: `event_id=eq.${eventId}` },
        () => {
          void refresh()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [eventId, refresh])

  /**
   * Optimistic move: update local first, persist after.
   * One row per (event, signup, shift) — upsert on unique key.
   */
  const moveOne = useCallback(
    async (
      signupId: string,
      shift: ShiftNumber,
      patch: Partial<
        Pick<Assignment, 'building' | 'is_captain' | 'position' | 'captain_present'>
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
              captain_present: patch.captain_present ?? null,
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

  /**
   * Move a signup from one shift to another. Deletes the source row and inserts/updates
   * the target shift's row. Use moveOne() if the shift isn't changing.
   */
  const moveAcrossShifts = useCallback(
    async (
      signupId: string,
      fromShift: ShiftNumber,
      toShift: ShiftNumber,
      patch: Partial<Pick<Assignment, 'building' | 'is_captain' | 'position'>>,
    ) => {
      if (!eventId) return
      // Optimistic local update
      setAssignments((prev) => {
        const withoutSource = prev.filter(
          (a) => !(a.signup_id === signupId && a.shift === fromShift),
        )
        const existingTarget = withoutSource.findIndex(
          (a) => a.signup_id === signupId && a.shift === toShift,
        )
        const targetRow: Assignment = {
          id: `tmp-${signupId}-${toShift}`,
          event_id: eventId,
          signup_id: signupId,
          building: patch.building ?? 'unassigned',
          shift: toShift,
          is_captain: patch.is_captain ?? false,
          position: patch.position ?? 0,
          captain_present: null,
          updated_at: new Date().toISOString(),
        }
        if (existingTarget === -1) return [...withoutSource, targetRow]
        const next = [...withoutSource]
        next[existingTarget] = { ...next[existingTarget]!, ...targetRow }
        return next
      })

      // Persist: delete source row, then upsert target
      await supabase
        .from('assignments')
        .delete()
        .eq('event_id', eventId)
        .eq('signup_id', signupId)
        .eq('shift', fromShift)

      const existing = await supabase
        .from('assignments')
        .select('id')
        .eq('event_id', eventId)
        .eq('signup_id', signupId)
        .eq('shift', toShift)
        .maybeSingle()

      if (existing.data) {
        const { error } = await supabase
          .from('assignments')
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq('id', (existing.data as { id: string }).id)
        if (error) setError(error.message)
      } else {
        const { error } = await supabase.from('assignments').insert({
          event_id: eventId,
          signup_id: signupId,
          shift: toShift,
          building: patch.building ?? 'unassigned',
          is_captain: patch.is_captain ?? false,
          position: patch.position ?? 0,
        })
        if (error) setError(error.message)
      }
    },
    [eventId],
  )

  /** Cycle/set the captain-present flag on a single assignment row. */
  const setCaptainPresent = useCallback(
    async (assignmentId: string, present: boolean | null) => {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignmentId
            ? { ...a, captain_present: present, updated_at: new Date().toISOString() }
            : a,
        ),
      )
      const { error } = await supabase
        .from('assignments')
        .update({ captain_present: present, updated_at: new Date().toISOString() })
        .eq('id', assignmentId)
      if (error) setError(error.message)
    },
    [],
  )

  return {
    assignments,
    loading,
    error,
    refresh,
    moveOne,
    moveAcrossShifts,
    applyDraft,
    removeAll,
    setCaptainPresent,
  }
}
