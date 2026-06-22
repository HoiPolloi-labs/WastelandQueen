import { describe, it, expect } from 'vitest'
import { computeHealing, LOSS_PCT_NONE, LOSS_PCT_MAXED } from './healing'

describe('computeHealing', () => {
  it('30% default loss splits permanent vs healable', () => {
    const r = computeHealing(100_000, LOSS_PCT_NONE)
    expect(r.permanent).toBe(30_000)
    expect(r.healable).toBe(70_000)
  })

  it('~18% at maxed Miraculous Survival', () => {
    const r = computeHealing(100_000, LOSS_PCT_MAXED)
    expect(r.permanent).toBe(18_000)
    expect(r.healable).toBe(82_000)
  })

  it('clamps loss pct to 0..100', () => {
    expect(computeHealing(100, 150).permanent).toBe(100)
    expect(computeHealing(100, -10).permanent).toBe(0)
  })

  it('guards non-finite / negative casualties → 0', () => {
    expect(computeHealing(Number.NaN, 30).casualties).toBe(0)
    expect(computeHealing(-50, 30).permanent).toBe(0)
  })

  it('floors fractional casualty counts', () => {
    expect(computeHealing(99.9, 0).casualties).toBe(99)
  })
})
