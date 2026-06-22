import { describe, it, expect } from 'vitest'
import { solve } from './solver'
import { applyPour, isSolved, type SortState } from './state'

function replay(initial: SortState, moves: { from: number; to: number }[]): SortState {
  return moves.reduce((s, m) => applyPour(s, m.from, m.to), initial)
}

describe('solve', () => {
  it('already-solved board → empty move list', () => {
    const r = solve([[0, 0, 0, 0], []])
    expect(r.status).toBe('solved')
    if (r.status === 'solved') expect(r.moves).toEqual([])
  })

  it('one-move solve', () => {
    const r = solve([[0, 0, 0], [0]])
    expect(r.status).toBe('solved')
    if (r.status === 'solved') expect(isSolved(replay([[0, 0, 0], [0]], r.moves))).toBe(true)
  })

  it('solves a 3-colour board and the move list actually reaches a solved state', () => {
    // 3 colours, 4 vials (2 spare empties). Scrambled but solvable.
    const board: SortState = [
      [0, 1, 2, 0],
      [1, 2, 0, 1],
      [2, 0, 1, 2],
      [],
    ]
    const r = solve(board)
    expect(r.status).toBe('solved')
    if (r.status === 'solved') {
      expect(isSolved(replay(board, r.moves))).toBe(true)
      // every move in the path must have been legal when applied (replay would
      // throw/!solved otherwise) — sanity already covered by isSolved.
      expect(r.moves.length).toBeGreaterThan(0)
    }
  })

  it('reports unsolvable when no empties and colours are jammed', () => {
    // 2 colours, 2 full mixed vials, no empty → no legal pour, not solved.
    const r = solve([[0, 1, 0, 1], [1, 0, 1, 0]])
    expect(r.status).toBe('unsolvable')
  })
})
