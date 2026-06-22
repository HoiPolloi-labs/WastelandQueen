import { describe, it, expect } from 'vitest'
import { solveTetramino } from './solver'
import { SIZE, TETROMINOES, emptyBoard, idx, type Board, type Shape } from './board'

const shape = (id: string): Shape => TETROMINOES.find((s) => s.id === id)!

describe('solveTetramino', () => {
  it('places a single piece on an empty board (no clears)', () => {
    const r = solveTetramino(emptyBoard(), [shape('O')], { boxes: false, allowRotation: true })
    expect(r.status).toBe('ok')
    expect(r.placements.length).toBe(1)
    expect(r.totalCleared).toBe(0)
  })

  it('finds the placement that completes a row', () => {
    // Row 0 pre-filled in cols 0..4; an I piece across cols 5..8 finishes it.
    const b: Board = emptyBoard()
    for (let c = 0; c <= 4; c++) b[idx(0, c)] = true
    const r = solveTetramino(b, [shape('I')], { boxes: false, allowRotation: true })
    expect(r.status).toBe('ok')
    expect(r.totalCleared).toBe(1)
  })

  it('reports none when no piece fits', () => {
    const full: Board = Array.from({ length: SIZE * SIZE }, () => true)
    const r = solveTetramino(full, [shape('O')], { boxes: false, allowRotation: true })
    expect(r.status).toBe('none')
    expect(r.placements.length).toBe(0)
  })

  it('places as many of the given pieces as possible', () => {
    const r = solveTetramino(emptyBoard(), [shape('I'), shape('O'), shape('T')], {
      boxes: false,
      allowRotation: true,
    })
    expect(r.placements.length).toBe(3)
  })
})
