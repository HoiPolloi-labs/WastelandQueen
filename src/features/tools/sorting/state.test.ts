import { describe, it, expect } from 'vitest'
import {
  topRun,
  isVialDone,
  isSolved,
  canPour,
  applyPour,
  legalMoves,
  serialize,
  colorOveruse,
} from './state'

describe('topRun', () => {
  it('returns the top contiguous run', () => {
    expect(topRun([0, 1, 1, 1])).toEqual({ color: 1, count: 3 })
    expect(topRun([2, 2])).toEqual({ color: 2, count: 2 })
    expect(topRun([])).toBeNull()
  })
})

describe('isVialDone / isSolved', () => {
  it('empty and full-single-colour vials are done', () => {
    expect(isVialDone([])).toBe(true)
    expect(isVialDone([1, 1, 1, 1])).toBe(true)
    expect(isVialDone([1, 1, 1])).toBe(false) // not full
    expect(isVialDone([1, 1, 1, 2])).toBe(false) // mixed
  })
  it('isSolved when all vials done', () => {
    expect(isSolved([[0, 0, 0, 0], [1, 1, 1, 1], []])).toBe(true)
    expect(isSolved([[0, 0, 0, 1], [1, 1, 1, 0]])).toBe(false)
  })
})

describe('canPour / applyPour', () => {
  it('pours onto a matching top with room', () => {
    const s = [[1, 1], [1]]
    expect(canPour(s, 0, 1)).toBe(true)
    expect(applyPour(s, 0, 1)).toEqual([[], [1, 1, 1]])
  })
  it('respects capacity (only moves what fits)', () => {
    const s = [[2, 2, 2], [2, 2]]
    // dest has room for 2; moving 2 of the 3 leaves 1 in the source
    expect(applyPour(s, 0, 1)).toEqual([[2], [2, 2, 2, 2]])
  })
  it('rejects onto a non-matching top', () => {
    expect(canPour([[1], [2]], 0, 1)).toBe(false)
  })
  it('rejects into a full vial', () => {
    expect(canPour([[1], [1, 1, 1, 1]], 0, 1)).toBe(false)
  })
  it('rejects from empty + self-pour', () => {
    expect(canPour([[], [1]], 0, 1)).toBe(false)
    expect(canPour([[1]], 0, 0)).toBe(false)
  })
  it('rejects pouring a whole uniform vial into an empty one (pointless shuffle)', () => {
    // Moving an entire single-colour stack to an empty vial just relabels which
    // vial holds it — never progress, so it's pruned regardless of height.
    expect(canPour([[1, 1, 1, 1], []], 0, 1)).toBe(false)
    expect(canPour([[1, 1], []], 0, 1)).toBe(false)
    // a MIXED vial's top run can still move to empty (real progress)
    expect(canPour([[2, 1, 1], []], 0, 1)).toBe(true)
  })
})

describe('serialize (canonical, order-independent)', () => {
  it('same multiset of vials → same key regardless of order', () => {
    expect(serialize([[0, 1], [2]])).toBe(serialize([[2], [0, 1]]))
  })
  it('different contents → different key', () => {
    expect(serialize([[0, 1]])).not.toBe(serialize([[1, 0]]))
  })
})

describe('legalMoves + colorOveruse', () => {
  it('lists all valid pours', () => {
    const s = [[1, 1], [1], []]
    const moves = legalMoves(s)
    // 0→1 (match), 0→2? full-uniform? no (0 is uniform [1,1] partial → can go to empty), 1→0, 1→2
    expect(moves.length).toBeGreaterThan(0)
    expect(moves).toContainEqual({ from: 0, to: 1 })
  })
  it('flags colours used more than CAPACITY times', () => {
    expect(colorOveruse([[0, 0, 0], [0, 0]], 1)).toEqual([0]) // 0 used 5×
    expect(colorOveruse([[0, 0, 0, 0]], 1)).toEqual([])
  })
})
