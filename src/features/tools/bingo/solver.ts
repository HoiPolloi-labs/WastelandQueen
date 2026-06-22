import { CELLS, LINES, completedLines, isLineComplete, type Revealed } from './board'

export interface BingoSuggestion {
  // lines fully revealed right now
  completed: number
  // lines you could finish by spending `flipsLeft` flips optimally, ignoring
  // the game's random flips (which only ever help) — a realistic floor/target.
  reachable: number
  // cell index (0..24) to flip next, or null when the board is full / no flips
  suggestion: number | null
  // indices (into LINES) the suggested cell advances toward completion
  suggestionLines: number[]
}

// How many still-incomplete lines pass through `cell`, given the set of cells
// we will already own. Used both to rank synergy cells and as the fallback
// "chase partial progress" score when no full line is affordable.
function incompleteLinesThrough(cell: number, owned: Set<number>): number {
  return LINES.filter(
    (line) => line.includes(cell) && !line.every((i) => owned.has(i)),
  ).length
}

// The game's KI is RANDOM, not adversarial, so this is an expected-value
// helper, not a minimax. It greedily targets the cheapest completable lines —
// completing the most lines per flip — and recommends the single best next
// card to flip. The game's bonus random flips are upside on top of `reachable`.
export function suggestBingo(board: Revealed, flipsLeft: number): BingoSuggestion {
  const completedNow = completedLines(board).length
  const hidden: number[] = []
  for (let i = 0; i < CELLS; i++) if (!board[i]) hidden.push(i)
  const flips = Math.max(0, Math.floor(Number.isFinite(flipsLeft) ? flipsLeft : 0))

  if (hidden.length === 0 || flips === 0) {
    return { completed: completedNow, reachable: completedNow, suggestion: null, suggestionLines: [] }
  }

  // Cells we'll have revealed after playing the greedy coverage plan.
  const owned = new Set<number>()
  board.forEach((v, i) => {
    if (v) owned.add(i)
  })
  let budget = flips
  const planned: number[] = []

  const needOf = (line: number[]) => line.filter((i) => !owned.has(i)).length

  // Repeatedly buy the cheapest incomplete line we can still afford. Overlap
  // is handled automatically: covering one line's cells shrinks others' need.
  for (;;) {
    let bestIdx = -1
    let bestNeed = Infinity
    LINES.forEach((line, idx) => {
      const need = needOf(line)
      if (need > 0 && need <= budget && need < bestNeed) {
        bestNeed = need
        bestIdx = idx
      }
    })
    if (bestIdx < 0) break
    const missing = LINES[bestIdx]!.filter((i) => !owned.has(i))
    // Spend the most synergistic cell first so it surfaces as the suggestion.
    missing.sort((a, b) => incompleteLinesThrough(b, owned) - incompleteLinesThrough(a, owned) || a - b)
    for (const cell of missing) {
      owned.add(cell)
      planned.push(cell)
      budget--
    }
  }

  const reachable = LINES.filter((line) => line.every((i) => owned.has(i))).length

  let suggestion: number | null = planned[0] ?? null
  if (suggestion === null) {
    // No line is affordable. Chase partial progress on the cell touching the
    // most incomplete lines — the random KI flips may finish it for you.
    let best = -1
    let bestScore = -1
    for (const cell of hidden) {
      const score = incompleteLinesThrough(cell, owned)
      if (score > bestScore || (score === bestScore && best < 0)) {
        bestScore = score
        best = cell
      }
    }
    suggestion = best
  }

  const suggestionLines =
    suggestion === null
      ? []
      : LINES.reduce<number[]>((acc, line, idx) => {
          if (line.includes(suggestion!) && !isLineComplete(board, line)) acc.push(idx)
          return acc
        }, [])

  return { completed: completedNow, reachable, suggestion, suggestionLines }
}
