import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Assignment, ShiftNumber } from '@/types/wk'
import type { DraftAssignment } from './auto-sort'

export function useAssignments(eventId: string | undefined) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const eventIdRef = useRef(eventId)
  eventIdRef.current = eventId

  const refresh = useCallback(async () => {
    if (!eventId) return
    const requestedFor = eventId
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('event_id', eventId)
      .order('position', { ascending: true })
    // CODE-REVIEW fix: drop late responses from a previous event and keep
    // prior state on transient errors so the planner doesn't visibly lose
    // its plaza layout on every realtime burst.
    if (eventIdRef.current !== requestedFor) return
    if (error) {
      setError(error.message)
      return
    }
    setAssignments((data ?? []) as Assignment[])
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
      .channel(`assignments:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments', filter: `event_id=eq.${eventId}` },
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

  /**
   * Optimistic move: update local first, persist after.
   * One row per (event, signup, shift) — upsert on unique key.
   */
  const moveOne = useCallback(
    async (
      signupId: string,
      shift: ShiftNumber,
      patch: Partial<
        Pick<
          Assignment,
          'building' | 'is_captain' | 'position' | 'captain_present' | 'foreign_target'
        >
      >,
    ) => {
      if (!eventId) return
      // Snapshot for rollback if the persist fails. Without this the chip
      // appeared moved while the DB silently rejected the write (RLS,
      // network, etc.), and only a stray realtime tick later would snap
      // it back — confusing the planner about what's actually saved.
      let snapshot: Assignment[] = []
      setAssignments((prev) => {
        snapshot = prev
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
              foreign_target: patch.foreign_target ?? null,
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

      let persistError: { message: string } | null = null
      if (existing.data) {
        const { error } = await supabase
          .from('assignments')
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq('id', existing.data.id)
        persistError = error
      } else {
        const { error } = await supabase.from('assignments').insert({
          event_id: eventId,
          signup_id: signupId,
          shift,
          building: patch.building ?? 'unassigned',
          is_captain: patch.is_captain ?? false,
          position: patch.position ?? 0,
          foreign_target: patch.foreign_target ?? null,
        })
        persistError = error
      }
      if (persistError) {
        setError(persistError.message)
        // Roll back the optimistic state so the user doesn't see a
        // phantom-moved chip. A refresh() also re-queries the canonical
        // server state in case the failure was a stale read.
        setAssignments(snapshot)
        void refresh()
      }
    },
    [eventId, refresh],
  )

  const applyDraft = useCallback(
    async (drafts: DraftAssignment[]) => {
      if (!eventId) return
      // FUNCTIONAL fix: Auto-Sort never emits `mud` or `hit-squad` rows
      // (both are explicit planner decisions per WK domain). Previously we
      // deleted ALL assignments for the event before insert, which silently
      // wiped manual mud-sitter placements and per-state Hit-Squad buckets
      // every time the planner clicked Auto-Sort. Restrict the delete to
      // buildings the algorithm actually replaces.
      const { error: delErr } = await supabase
        .from('assignments')
        .delete()
        .eq('event_id', eventId)
        .not('building', 'in', '(mud,hit-squad)')
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
      patch: Partial<
        Pick<Assignment, 'building' | 'is_captain' | 'position' | 'foreign_target'>
      >,
    ) => {
      if (!eventId) return
      let snapshot: Assignment[] = []
      setAssignments((prev) => {
        snapshot = prev
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
          foreign_target: patch.foreign_target ?? null,
          updated_at: new Date().toISOString(),
        }
        if (existingTarget === -1) return [...withoutSource, targetRow]
        const next = [...withoutSource]
        next[existingTarget] = { ...next[existingTarget]!, ...targetRow }
        return next
      })

      // Persist: delete source row, then upsert target.
      const { error: delError } = await supabase
        .from('assignments')
        .delete()
        .eq('event_id', eventId)
        .eq('signup_id', signupId)
        .eq('shift', fromShift)
      if (delError) {
        setError(delError.message)
        setAssignments(snapshot)
        void refresh()
        return
      }

      const existing = await supabase
        .from('assignments')
        .select('id')
        .eq('event_id', eventId)
        .eq('signup_id', signupId)
        .eq('shift', toShift)
        .maybeSingle()

      let persistError: { message: string } | null = null
      if (existing.data) {
        const { error } = await supabase
          .from('assignments')
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq('id', (existing.data as { id: string }).id)
        persistError = error
      } else {
        const { error } = await supabase.from('assignments').insert({
          event_id: eventId,
          signup_id: signupId,
          shift: toShift,
          building: patch.building ?? 'unassigned',
          is_captain: patch.is_captain ?? false,
          position: patch.position ?? 0,
          foreign_target: patch.foreign_target ?? null,
        })
        persistError = error
      }
      if (persistError) {
        setError(persistError.message)
        setAssignments(snapshot)
        void refresh()
      }
    },
    [eventId, refresh],
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
