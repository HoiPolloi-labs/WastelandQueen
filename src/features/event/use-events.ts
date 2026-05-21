import { useEffect, useState } from 'react'

export interface KnownEvent {
  eventId: string
  plannerToken: string
}

/**
 * Lists events the user has a planner token for (read from localStorage).
 *
 * Post per-event-token RLS, the events table is no longer publicly listable —
 * a user only sees what their JWT grants. The Planner's multi-event picker
 * therefore can't query "all events"; it shows just the ones we've recorded a
 * planner token for on this device, written by EventSetupPage success-screen
 * and EventAuthGate on successful auth.
 */
export function usePlannerEvents() {
  const [events, setEvents] = useState<KnownEvent[]>([])

  useEffect(() => {
    const found: KnownEvent[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('tok:planner:')) continue
      const eventId = key.slice('tok:planner:'.length)
      const plannerToken = localStorage.getItem(key)
      if (eventId && plannerToken) found.push({ eventId, plannerToken })
    }
    // Most recently created first by id descending (event IDs are date-sortable: wk-YYYY-MM-DD)
    found.sort((a, b) => (a.eventId < b.eventId ? 1 : -1))
    setEvents(found)
  }, [])

  return { events, loading: false }
}
