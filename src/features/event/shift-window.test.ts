import { describe, it, expect } from 'vitest'
import { shiftWindow, shiftWindowLabel } from './shift-window'

const START = '2026-05-30T10:00:00Z'

describe('shiftWindow', () => {
  it('splits 24h into 2 equal halves', () => {
    const s1 = shiftWindow(START, 2, 1)
    const s2 = shiftWindow(START, 2, 2)
    expect(s1.startUtc.toISOString()).toBe('2026-05-30T10:00:00.000Z')
    expect(s1.endUtc.toISOString()).toBe('2026-05-30T22:00:00.000Z')
    expect(s2.startUtc.toISOString()).toBe('2026-05-30T22:00:00.000Z')
    expect(s2.endUtc.toISOString()).toBe('2026-05-31T10:00:00.000Z')
  })

  it('splits 24h into 3 8-hour slots', () => {
    const s1 = shiftWindow(START, 3, 1)
    const s2 = shiftWindow(START, 3, 2)
    const s3 = shiftWindow(START, 3, 3)
    expect(s1.endUtc.toISOString()).toBe('2026-05-30T18:00:00.000Z')
    expect(s2.startUtc.toISOString()).toBe('2026-05-30T18:00:00.000Z')
    expect(s2.endUtc.toISOString()).toBe('2026-05-31T02:00:00.000Z')
    expect(s3.startUtc.toISOString()).toBe('2026-05-31T02:00:00.000Z')
    expect(s3.endUtc.toISOString()).toBe('2026-05-31T10:00:00.000Z')
  })

  it('splits 24h into 4 6-hour slots', () => {
    const s4 = shiftWindow(START, 4, 4)
    expect(s4.startUtc.toISOString()).toBe('2026-05-31T04:00:00.000Z')
    expect(s4.endUtc.toISOString()).toBe('2026-05-31T10:00:00.000Z')
  })

  it('single shift covers full 24h', () => {
    const s1 = shiftWindow(START, 1, 1)
    expect(s1.startUtc.toISOString()).toBe('2026-05-30T10:00:00.000Z')
    expect(s1.endUtc.toISOString()).toBe('2026-05-31T10:00:00.000Z')
  })
})

describe('shiftWindowLabel', () => {
  it('renders 2-shift labels', () => {
    expect(shiftWindowLabel(START, 2, 1)).toBe('10:00–22:00 UTC')
    expect(shiftWindowLabel(START, 2, 2)).toBe('22:00–10:00 UTC')
  })

  it('renders 3-shift labels', () => {
    expect(shiftWindowLabel(START, 3, 1)).toBe('10:00–18:00 UTC')
    expect(shiftWindowLabel(START, 3, 2)).toBe('18:00–02:00 UTC')
    expect(shiftWindowLabel(START, 3, 3)).toBe('02:00–10:00 UTC')
  })

  it('pads single-digit hours and minutes', () => {
    // Start at 03:05 to force padding
    const oddStart = '2026-05-30T03:05:00Z'
    expect(shiftWindowLabel(oddStart, 2, 1)).toBe('03:05–15:05 UTC')
  })
})
