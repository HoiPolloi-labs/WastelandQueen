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
