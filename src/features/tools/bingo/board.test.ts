import { describe, it, expect } from 'vitest'
import { LINES, SIZE, CELLS, emptyBoard, revealedCount, completedLines, isLineComplete, type Revealed } from './board'

function reveal(cells: number[]): Revealed {
  const b = emptyBoard()
  for (const c of cells) b[c] = true
  return b
}

describe('LINES', () => {
  it('has the 12 bingo lines, each of length 5', () => {
    expect(LINES.length).toBe(12)
    for (const l of LINES) expect(l.length).toBe(SIZE)
  })
  it('includes both diagonals', () => {
    expect(LINES).toContainEqual([0, 6, 12, 18, 24])
    expect(LINES).toContainEqual([4, 8, 12, 16, 20])
  })
})

describe('revealedCount', () => {
  it('counts flipped cells', () => {
    expect(revealedCount(emptyBoard())).toBe(0)
    expect(revealedCount(reveal([0, 5, 24]))).toBe(3)
  })
})

describe('completedLines / isLineComplete', () => {
  it('empty board completes nothing', () => {
    expect(completedLines(emptyBoard())).toEqual([])
  })
  it('a full board completes all 12 lines', () => {
    const full = Array.from({ length: CELLS }, () => true)
    expect(completedLines(full).length).toBe(12)
  })
  it('a single full row completes exactly one line', () => {
    const b = reveal([0, 1, 2, 3, 4]) // row 0
    expect(completedLines(b)).toEqual([0])
    expect(isLineComplete(b, LINES[0]!)).toBe(true)
    expect(isLineComplete(b, LINES[5]!)).toBe(false) // a column
  })
})
