import { describe, it, expect } from 'vitest'
import { nextSaturdayIso, eventIdFromIso, isoFromEventId } from './event-id'

describe('nextSaturdayIso', () => {
  it('from a Wednesday picks the upcoming Saturday at 10:00 UTC', () => {
    // 2026-05-27 is a Wednesday
    const result = nextSaturdayIso(new Date('2026-05-27T08:00:00Z'))
    expect(result).toBe('2026-05-30T10:00:00.000Z')
  })

  it('from Saturday before 10 UTC picks same day', () => {
    const result = nextSaturdayIso(new Date('2026-05-30T08:00:00Z'))
    expect(result).toBe('2026-05-30T10:00:00.000Z')
  })

  it('from Saturday after 10 UTC picks next Saturday', () => {
    const result = nextSaturdayIso(new Date('2026-05-30T12:00:00Z'))
    expect(result).toBe('2026-06-06T10:00:00.000Z')
  })

  it('from Sunday picks the next Saturday (6 days)', () => {
    const result = nextSaturdayIso(new Date('2026-05-31T08:00:00Z'))
    expect(result).toBe('2026-06-06T10:00:00.000Z')
  })

  it('output always round-trips through new Date().toISOString()', () => {
    // Regression: EventSetupPage crashed with "Invalid time value" when an
    // upstream Date became invalid and .toISOString() threw. Make sure the
    // source of truth here can never produce that.
    for (const seed of [
      '2026-01-01T00:00:00Z',
      '2026-12-31T23:59:59Z',
      '2026-06-06T10:00:00Z',
      '2025-02-28T22:00:00Z',
      '2024-02-29T09:00:00Z', // leap day
    ]) {
      const iso = nextSaturdayIso(new Date(seed))
      const parsed = new Date(iso)
      expect(isNaN(parsed.getTime())).toBe(false)
      expect(parsed.toISOString()).toBe(iso)
    }
  })
})

describe('eventIdFromIso', () => {
  it('strips to wk-YYYY-MM-DD', () => {
    expect(eventIdFromIso('2026-05-30T10:00:00.000Z')).toBe('wk-2026-05-30')
  })
})

describe('isoFromEventId', () => {
  it('roundtrips an event id back to 10:00 UTC', () => {
    expect(isoFromEventId('wk-2026-05-30')).toBe('2026-05-30T10:00:00.000Z')
  })

  it('returns null for malformed ids', () => {
    expect(isoFromEventId('wk-2026-5-30')).toBeNull()
    expect(isoFromEventId('foo')).toBeNull()
    expect(isoFromEventId('')).toBeNull()
  })
})
