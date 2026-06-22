import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { EventConfig } from '@/types/wk'

export function useEvent(eventId: string | undefined) {
  const [event, setEvent] = useState<EventConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!eventId) return
    // Explicit column allowlist — never request `planner_token`. Migration
    // 0030 revoked column-level SELECT on it, so `select('*')` would now
    // error with "permission denied for column planner_token" for non-planner
    // roles (and even for planner JWTs since their role is `authenticated`,
    // not a separate Postgres role). Awards/clone flows that genuinely need
    // planner_token read it from the URL params (which IS the planner_token).
    // signup_token + board_token stay readable — they're broadcast-shareable
    // by design (QR codes, /s/ + /b/ short URLs).
    const { data, error } = await supabase
      .from('events')
      .select(
        'id, starts_at_utc, shift_count, hub_defender_target, ' +
        'auto_fill_to_capacity, turret_mode, ' +
        'home_server, notes, state_grade, governor_ign, assessor_ign, ' +
        'negotiator_ign, foreign_targets, heroes_enabled, ' +
        'alliance_sizes, min_participation_pct, awards_require_screenshot, ' +
        'building_types, signup_token, board_token, ' +
        'king_sword_recipient_ign, king_sword_grade, coffer_collected_at, ' +
        'coffer_notes, created_at',
      )
      .eq('id', eventId)
      .maybeSingle()
    // CODE-REVIEW fix: don't reset state to null on transient error — pages
    // would flash "event not found" on every network hiccup. Keep prior row.
    if (error) {
      setError(error.message)
      return
    }
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
