import { describe, it, expect } from 'vitest'
import { suggestBingo } from './solver'
import { emptyBoard, CELLS, type Revealed } from './board'

function reveal(cells: number[]): Revealed {
  const b = emptyBoard()
  for (const c of cells) b[c] = true
  return b
}

describe('suggestBingo', () => {
  it('empty board, too few flips to finish any line → suggests the centre', () => {
    const r = suggestBingo(emptyBoard(), 2)
    expect(r.completed).toBe(0)
    expect(r.reachable).toBe(0) // a line needs 5; 2 flips can't finish one
    // centre cell (12) sits on 4 lines — the highest-synergy first flip
    expect(r.suggestion).toBe(12)
    expect(r.suggestionLines.length).toBe(4)
  })

  it('one cell away from a row → suggests that cell and marks the line reachable', () => {
    const r = suggestBingo(reveal([0, 1, 2, 3]), 1) // row 0 missing cell 4
    expect(r.suggestion).toBe(4)
    expect(r.reachable).toBe(1)
    expect(r.suggestionLines).toContain(0) // row 0
  })

  it('completes the most lines per flip (two cheap lines beat one expensive)', () => {
    // Row 0 needs 1 (cell 4); row 1 needs 1 (cell 9); a fresh column needs 5.
    const r = suggestBingo(reveal([0, 1, 2, 3, 5, 6, 7, 8]), 2)
    expect(r.reachable).toBe(2)
  })

  it('no flips → no suggestion', () => {
    const r = suggestBingo(reveal([0, 1, 2, 3]), 0)
    expect(r.suggestion).toBeNull()
    expect(r.reachable).toBe(r.completed)
  })

  it('full board → nothing to do, all lines complete', () => {
    const full = Array.from({ length: CELLS }, () => true)
    const r = suggestBingo(full, 8)
    expect(r.completed).toBe(12)
    expect(r.suggestion).toBeNull()
  })
})
