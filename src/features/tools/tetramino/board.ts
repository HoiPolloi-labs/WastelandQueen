// Tetramino — the projectalt 9×9 block-packing puzzle.
//
// A 9×9 grid; you are handed up to 3 tetromino pieces and place them on the
// board. Whenever a full row, full column (and, in the Woodoku-style variant,
// a full 3×3 box) is filled, it clears. Goal: place the pieces so the most
// lines clear. Pure model below; the search lives in solver.ts.

export const SIZE = 9
export const CELLS = SIZE * SIZE // 81
export const BOX = 3

export type Cell = readonly [number, number] // [row, col], relative to a shape's top-left
export interface Shape {
  id: string
  cells: readonly Cell[]
}
export type Board = boolean[] // length 81, row-major, true = filled

export const idx = (r: number, c: number) => r * SIZE + c

export function emptyBoard(): Board {
  return Array.from({ length: CELLS }, () => false)
}

function normalize(cells: readonly Cell[]): Cell[] {
  const minR = Math.min(...cells.map(([r]) => r))
  const minC = Math.min(...cells.map(([, c]) => c))
  return cells
    .map(([r, c]) => [r - minR, c - minC] as Cell)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
}

function rotateCW(cells: readonly Cell[]): Cell[] {
  // 90° clockwise: (r, c) → (c, -r), then re-anchor to the top-left.
  return normalize(cells.map(([r, c]) => [c, -r] as Cell))
}

const keyOf = (cells: readonly Cell[]) => cells.map(([r, c]) => `${r}:${c}`).join('|')

// All distinct orientations of a shape (1 for O, 2 for I/S/Z, 4 for T/J/L).
export function uniqueRotations(shape: Shape): Cell[][] {
  const seen = new Set<string>()
  const out: Cell[][] = []
  let cur = normalize(shape.cells)
  for (let i = 0; i < 4; i++) {
    const k = keyOf(cur)
    if (!seen.has(k)) {
      seen.add(k)
      out.push(cur)
    }
    cur = rotateCW(cur)
  }
  return out
}

// The 7 free tetrominoes in a canonical orientation.
export const TETROMINOES: Shape[] = [
  { id: 'I', cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { id: 'O', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { id: 'T', cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { id: 'S', cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
  { id: 'Z', cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
  { id: 'J', cells: [[0, 0], [1, 0], [1, 1], [1, 2]] },
  { id: 'L', cells: [[0, 2], [1, 0], [1, 1], [1, 2]] },
]

export function canPlace(board: Board, cells: readonly Cell[], atR: number, atC: number): boolean {
  for (const [r, c] of cells) {
    const rr = atR + r
    const cc = atC + c
    if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) return false
    if (board[idx(rr, cc)]) return false
  }
  return true
}

export function place(board: Board, cells: readonly Cell[], atR: number, atC: number): Board {
  const next = board.slice()
  for (const [r, c] of cells) next[idx(atR + r, atC + c)] = true
  return next
}

export interface ClearResult {
  board: Board
  cleared: number // number of rows + columns (+ boxes) cleared
}

// Detect every full row / column / (optionally) 3×3 box and clear them all at
// once. A row that crosses a cleared column counts as two cleared lines.
export function clearLines(board: Board, boxes: boolean): ClearResult {
  const toClear = new Set<number>()
  let cleared = 0

  for (let r = 0; r < SIZE; r++) {
    let full = true
    for (let c = 0; c < SIZE; c++) if (!board[idx(r, c)]) { full = false; break }
    if (full) {
      cleared++
      for (let c = 0; c < SIZE; c++) toClear.add(idx(r, c))
    }
  }
  for (let c = 0; c < SIZE; c++) {
    let full = true
    for (let r = 0; r < SIZE; r++) if (!board[idx(r, c)]) { full = false; break }
    if (full) {
      cleared++
      for (let r = 0; r < SIZE; r++) toClear.add(idx(r, c))
    }
  }
  if (boxes) {
    for (let br = 0; br < SIZE; br += BOX) {
      for (let bc = 0; bc < SIZE; bc += BOX) {
        let full = true
        for (let r = br; r < br + BOX && full; r++) {
          for (let c = bc; c < bc + BOX; c++) if (!board[idx(r, c)]) { full = false; break }
        }
        if (full) {
          cleared++
          for (let r = br; r < br + BOX; r++) for (let c = bc; c < bc + BOX; c++) toClear.add(idx(r, c))
        }
      }
    }
  }

  if (toClear.size === 0) return { board, cleared: 0 }
  const next = board.slice()
  for (const i of toClear) next[i] = false
  return { board: next, cleared }
}

export function filledCount(board: Board): number {
  return board.reduce((n, v) => (v ? n + 1 : n), 0)
}
