import { describe, it, expect } from 'vitest'
import {
  SIZE,
  TETROMINOES,
  uniqueRotations,
  emptyBoard,
  canPlace,
  place,
  clearLines,
  filledCount,
  idx,
  type Board,
  type Shape,
} from './board'

const shape = (id: string): Shape => TETROMINOES.find((s) => s.id === id)!

function fillRow(b: Board, r: number, cols: number[]) {
  for (const c of cols) b[idx(r, c)] = true
}

describe('uniqueRotations', () => {
  it('O has 1 orientation, I has 2, T has 4', () => {
    expect(uniqueRotations(shape('O')).length).toBe(1)
    expect(uniqueRotations(shape('I')).length).toBe(2)
    expect(uniqueRotations(shape('T')).length).toBe(4)
  })
})

describe('canPlace / place', () => {
  it('rejects out-of-bounds and overlap', () => {
    const b = emptyBoard()
    expect(canPlace(b, shape('I').cells, 0, 6)).toBe(false) // I is 4 wide, col 6+3=9 OOB
    expect(canPlace(b, shape('I').cells, 0, 5)).toBe(true)
    const b2 = place(b, shape('O').cells, 0, 0)
    expect(canPlace(b2, shape('O').cells, 0, 0)).toBe(false) // overlaps
  })
  it('place fills exactly the piece cells', () => {
    const b = place(emptyBoard(), shape('O').cells, 0, 0)
    expect(filledCount(b)).toBe(4)
    expect(b[idx(0, 0)] && b[idx(0, 1)] && b[idx(1, 0)] && b[idx(1, 1)]).toBe(true)
  })
})

describe('clearLines', () => {
  it('clears a full row', () => {
    const b = emptyBoard()
    fillRow(b, 0, [0, 1, 2, 3, 4, 5, 6, 7, 8])
    const r = clearLines(b, false)
    expect(r.cleared).toBe(1)
    expect(filledCount(r.board)).toBe(0)
  })
  it('a crossing full row + full column count as two', () => {
    const b = emptyBoard()
    for (let c = 0; c < SIZE; c++) b[idx(0, c)] = true // row 0
    for (let r = 0; r < SIZE; r++) b[idx(r, 0)] = true // col 0
    const r = clearLines(b, false)
    expect(r.cleared).toBe(2)
  })
  it('clears a full 3×3 box only when boxes enabled', () => {
    const b = emptyBoard()
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) b[idx(r, c)] = true
    expect(clearLines(b, false).cleared).toBe(0)
    expect(clearLines(b, true).cleared).toBe(1)
  })
  it('no full line → board unchanged', () => {
    const b = place(emptyBoard(), shape('T').cells, 4, 4)
    const r = clearLines(b, true)
    expect(r.cleared).toBe(0)
    expect(filledCount(r.board)).toBe(4)
  })
})
