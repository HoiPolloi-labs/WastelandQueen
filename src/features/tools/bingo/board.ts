// Karten-Bingo (5×5 card-flip) board model.
//
// In-game: a 5×5 grid of face-down reward cards. You flip a card of your
// choice; the game then flips ONE more *random* card. With N of your own
// flips you reveal up to 2N of the 25 cells (yours + the game's random ones).
// A fully-revealed line of 5 — any of the 5 rows, 5 columns, or 2 diagonals
// (12 lines total) — pays a bonus. A cell counts no matter who flipped it.
// Goal: complete as many lines as possible.

export const SIZE = 5
export const CELLS = SIZE * SIZE // 25

// The 12 winning lines as arrays of cell indices (0..24, row-major).
export const LINES: number[][] = (() => {
  const lines: number[][] = []
  // rows
  for (let r = 0; r < SIZE; r++) {
    lines.push(Array.from({ length: SIZE }, (_, c) => r * SIZE + c))
  }
  // columns
  for (let c = 0; c < SIZE; c++) {
    lines.push(Array.from({ length: SIZE }, (_, r) => r * SIZE + c))
  }
  // main diagonal ↘ and anti-diagonal ↙
  lines.push(Array.from({ length: SIZE }, (_, i) => i * SIZE + i))
  lines.push(Array.from({ length: SIZE }, (_, i) => i * SIZE + (SIZE - 1 - i)))
  return lines
})()

// Board state: one boolean per cell, true = revealed (flipped).
export type Revealed = boolean[]

export function emptyBoard(): Revealed {
  return Array.from({ length: CELLS }, () => false)
}

export function revealedCount(b: Revealed): number {
  return b.reduce((n, v) => (v ? n + 1 : n), 0)
}

export function isLineComplete(b: Revealed, line: number[]): boolean {
  return line.every((i) => b[i])
}

// Indices (into LINES) of every fully-revealed line.
export function completedLines(b: Revealed): number[] {
  const out: number[] = []
  LINES.forEach((line, idx) => {
    if (isLineComplete(b, line)) out.push(idx)
  })
  return out
}
