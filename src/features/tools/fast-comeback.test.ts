import { describe, it, expect } from 'vitest'
import { computeFastComeback, FC_BOOST_PCT } from './fast-comeback'

describe('computeFastComeback', () => {
  it('caps at 120% of might lost', () => {
    const r = computeFastComeback(10_000_000)
    expect(r.cap).toBe(12_000_000)
    expect(r.boostPct).toBe(FC_BOOST_PCT)
    expect(r.mightLost).toBe(10_000_000)
  })

  it('rounds the cap', () => {
    expect(computeFastComeback(1_234_567).cap).toBe(Math.round(1_234_567 * 1.2))
  })

  it('treats zero / negative / non-finite as 0', () => {
    expect(computeFastComeback(0).cap).toBe(0)
    expect(computeFastComeback(-5).cap).toBe(0)
    expect(computeFastComeback(Number.NaN).cap).toBe(0)
    expect(computeFastComeback(Infinity).cap).toBe(0)
    expect(computeFastComeback(Infinity).mightLost).toBe(0)
  })
})
