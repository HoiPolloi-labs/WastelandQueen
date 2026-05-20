import { useState, useEffect } from 'react'
import { load, save } from '@/lib/storage'
import type { BoxTier } from '@/types/wk'

type BoxCounts = Record<BoxTier, number>

const DEFAULT_COUNTS: BoxCounts = {
  king: 1,
  rulers: 3,
  loyalty: 10,
  contribution: 20,
}

/**
 * Box counts vary per event based on State Grade + foreign-Hub capture.
 * Persist them per event in localStorage so the governor can iterate without DB writes.
 */
export function useBoxCounts(eventId: string | undefined) {
  const key = eventId ? `awards/boxes/${eventId}` : null
  const [counts, setCounts] = useState<BoxCounts>(DEFAULT_COUNTS)

  useEffect(() => {
    if (!key) return
    setCounts(load<BoxCounts>(key, DEFAULT_COUNTS))
  }, [key])

  const update = (tier: BoxTier, value: number) => {
    const next = { ...counts, [tier]: Math.max(0, value) }
    setCounts(next)
    if (key) save(key, next)
  }

  return { counts, update }
}
