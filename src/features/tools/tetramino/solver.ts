import {
  SIZE,
  CELLS,
  canPlace,
  place,
  clearLines,
  filledCount,
  uniqueRotations,
  type Board,
  type Cell,
  type Shape,
} from './board'

export interface Placement {
  shapeId: string
  cells: Cell[] // oriented, relative to (atR, atC)
  atR: number
  atC: number
  clearedAfter: number // lines cleared right after this piece landed
}

export interface TetraminoResult {
  status: 'ok' | 'none' // 'none' = not a single piece could be placed
  placements: Placement[]
  totalCleared: number
  finalBoard: Board
}

export interface SolveOpts {
  boxes: boolean
  allowRotation: boolean
}

interface Node {
  board: Board
  remaining: number[] // indices into the pieces array still to place
  placements: Placement[]
  cleared: number
}

const BEAM = 160

function serialize(b: Board, remaining: number[]): string {
  let s = ''
  for (let i = 0; i < CELLS; i++) s += b[i] ? '1' : '0'
  return s + '|' + [...remaining].sort((a, b) => a - b).join(',')
}

// Clears dominate; an emptier board breaks ties (keeps more room for the next set).
function score(n: Node): number {
  return n.cleared * 1000 + (CELLS - filledCount(n.board))
}

// Beam search over piece order × orientation × position. Pieces must all be
// placed if possible (in-game you cannot skip), so the answer is the deepest
// reachable beam's best node — maximum pieces placed, then maximum clears.
export function solveTetramino(board: Board, pieces: Shape[], opts: SolveOpts): TetraminoResult {
  if (pieces.length === 0) {
    return { status: 'none', placements: [], totalCleared: 0, finalBoard: board }
  }
  const orientsByPiece = pieces.map((p) =>
    opts.allowRotation ? uniqueRotations(p) : uniqueRotations(p).slice(0, 1),
  )

  let beam: Node[] = [{ board, remaining: pieces.map((_, i) => i), placements: [], cleared: 0 }]
  let result: Node = beam[0]!

  for (let step = 0; step < pieces.length; step++) {
    const next: Node[] = []
    const seen = new Set<string>()
    for (const node of beam) {
      for (const pi of node.remaining) {
        const shape = pieces[pi]!
        for (const cells of orientsByPiece[pi]!) {
          let maxR = 0
          let maxC = 0
          for (const [r, c] of cells) {
            if (r > maxR) maxR = r
            if (c > maxC) maxC = c
          }
          for (let atR = 0; atR + maxR < SIZE; atR++) {
            for (let atC = 0; atC + maxC < SIZE; atC++) {
              if (!canPlace(node.board, cells, atR, atC)) continue
              const placed = place(node.board, cells, atR, atC)
              const { board: cleared, cleared: clr } = clearLines(placed, opts.boxes)
              const child: Node = {
                board: cleared,
                remaining: node.remaining.filter((x) => x !== pi),
                placements: [
                  ...node.placements,
                  { shapeId: shape.id, cells, atR, atC, clearedAfter: clr },
                ],
                cleared: node.cleared + clr,
              }
              const key = serialize(child.board, child.remaining)
              if (seen.has(key)) continue
              seen.add(key)
              next.push(child)
            }
          }
        }
      }
    }
    if (next.length === 0) break // nothing more can be placed
    next.sort((a, b) => score(b) - score(a))
    beam = next.slice(0, BEAM)
    result = beam[0]! // deepest level reached so far → most pieces placed
  }

  return {
    status: result.placements.length > 0 ? 'ok' : 'none',
    placements: result.placements,
    totalCleared: result.cleared,
    finalBoard: result.board,
  }
}
