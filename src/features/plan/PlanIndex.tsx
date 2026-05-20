import { Navigate } from 'react-router'
import { load } from '@/lib/storage'

const LAST_EVENT_KEY = 'planner/lastEventId'

/**
 * /plan → redirect to the most recently opened event, falling back to /plan/new.
 * The eventId is recorded by PlanPage on mount.
 */
export function PlanIndex() {
  const last = load<string | null>(LAST_EVENT_KEY, null)
  if (last) return <Navigate to={`/plan/${last}`} replace />
  return <Navigate to="/plan/new" replace />
}

export { LAST_EVENT_KEY }
